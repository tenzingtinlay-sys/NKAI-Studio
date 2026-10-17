import { defineEventHandler, getRequestURL, readRawBody, setResponseStatus } from "h3";
import { getSessionUser } from "../../../../src/lib/auth/verify.server";
import { orderWorkersForTimeSlot, parseWorkerPool } from "../../../utils/ai-worker-pool.mjs";
import type { AIWorker } from "../../../utils/ai-worker-types";

const HOP_BY_HOP = new Set(["connection", "keep-alive", "proxy-authenticate", "proxy-authorization", "te", "trailers", "transfer-encoding", "upgrade", "host", "content-length"]);
const ALLOWED = new Set(["chat", "stream", "tts", "health", "capabilities", "tts-capabilities"]);

async function workerIsReady(worker: AIWorker): Promise<boolean> {
  try {
    const headers = new Headers();
    if (worker.token) headers.set("authorization", "Bearer " + worker.token);
    const response = await fetch(worker.baseUrl + "/health", { headers, cache: "no-store", signal: AbortSignal.timeout(4000) });
    if (!response.ok) return false;
    const type = response.headers.get("content-type") || "";
    if (!type.includes("json")) return true;
    const body = await response.json();
    const status = typeof body.status === "string" ? body.status.toLowerCase() : "";
    if (status && !["ready", "healthy", "ok", "running"].includes(status)) return false;
    return body.ready !== false;
  } catch { return false; }
}

/**
 * Same-origin gateway to the private open-source inference worker.
 * Set AI_WORKER_INTERNAL_URL to the worker's private base URL and
 * AI_WORKER_API_TOKEN to its optional WORKER_API_TOKEN. Never expose these
 * values in browser code. The browser only calls /api/ai/{chat,tts,health,capabilities}.
 */
export default defineEventHandler(async (event) => {
  // Inference can consume scarce GPU time. Require a real verified session;
  // the app's shared development-user fallback is not sufficient authorization.
   if (process.env.AI_ALLOW_ANONYMOUS?.trim() !== "true") {
    let user;
    try {
      user = await getSessionUser();
    } catch {
      setResponseStatus(event, 401);
      return { error: "Sign in to use NKAI inference.", code: "AI_AUTH_REQUIRED" };
    }
    if (!user) {
      setResponseStatus(event, 401);
      return { error: "Sign in to use NKAI inference.", code: "AI_AUTH_REQUIRED" };
    }
  }

  let workers;
  try { workers = orderWorkersForTimeSlot(parseWorkerPool(), Date.now()); }
  catch { setResponseStatus(event,   500); return { error: "The server-side AI worker pool configuration is invalid.", code: "AI_WORKER_POOL_INVALID" }; }
  const requestUrl = getRequestURL(event);
  const suffix = requestUrl.pathname.slice("/api/ai/".length).split("/").filter(Boolean);
  if (suffix.length !== 1 || !ALLOWED.has(suffix[0])) {
    setResponseStatus(event, 404);
    return { error: "Unknown private AI endpoint." };
  }

  const method = event.method.toUpperCase();
  const endpoint = suffix[0];
  const readOnlyEndpoints = new Set(["health", "capabilities", "tts-capabilities"]);
  if (readOnlyEndpoints.has(endpoint) ? !["GET", "HEAD"].includes(method) : method !== "POST") {
    setResponseStatus(event, 405);
    return { error: "Method not allowed for this AI endpoint." };
  }

  if (method === "POST") {
    const origin = event.node?.req?.headers?.origin;
    if (typeof origin !== "string" || origin !== requestUrl.origin) {
      setResponseStatus(event, 403);
      return { error: "Cross-origin requests are not allowed.", code: "AI_ORIGIN_REJECTED" };
    }
    const contentType = String(event.node?.req?.headers?.["content-type"] || "").split(";")[0].trim().toLowerCase();
    if (contentType !== "application/json") {
      setResponseStatus(event, 415);
      return { error: "Content-Type must be application/json." };
    }
  }

  // Optional dedicated TTS service (for example, an authorized OpenVoice V2 worker).
  // This lets the chat model and natural-speech model run on separate GPU workers.
  let worker: AIWorker | undefined;
  const dedicatedTtsUrl = ["tts", "tts-capabilities"].includes(suffix[0]) ? process.env.AI_TTS_INTERNAL_URL?.trim() : "";
  if (dedicatedTtsUrl) {
    let ttsUrl: URL;
    try {
      ttsUrl = new URL(dedicatedTtsUrl);
      if (!["http:", "https:"].includes(ttsUrl.protocol) || ttsUrl.username || ttsUrl.password) throw new Error("Invalid URL");
    } catch {
      setResponseStatus(event, 500);
      return { error: "The private TTS worker URL is invalid.", code: "AI_TTS_URL_INVALID" };
    }
    worker = {
      id: "dedicated-tts",
      platform: "lightning-ai",
      baseUrl: ttsUrl.href.replace(/\/$/, ""),
      token: process.env.AI_TTS_API_TOKEN?.trim() || "",
      leaseHours: 24,
      priority: 0,
    };
    if (!(await workerIsReady(worker))) {
      setResponseStatus(event, 503);
      return { error: "The dedicated TTS worker is not ready. Check its /health endpoint, reference voice, and authentication.", code: "AI_TTS_UNAVAILABLE" };
    }
  } else {
    for (const candidate of workers) {
      if (await workerIsReady(candidate)) { worker = candidate; break; }
    }
    if (!worker) {
      setResponseStatus(event, 503);
      return { error: workers.length ? "No configured NKAI AI worker is currently healthy." : "No eligible NKAI inference worker is configured.", code: workers.length ? "AI_WORKERS_UNAVAILABLE" : "AI_WORKER_NOT_CONFIGURED" };
    }
  }

  const upstreamBase = worker.baseUrl || process.env.AI_WORKER_INTERNAL_URL?.trim();
  if (!upstreamBase) {
    setResponseStatus(event, 503);
    return { error: "The private NKAI inference worker is not configured.", code: "AI_WORKER_NOT_CONFIGURED" };
  }
  let base: URL;
  try {
    base = new URL(upstreamBase);
    if (!["http:", "https:"].includes(base.protocol) || base.username || base.password) throw new Error("Invalid URL");
  } catch {
    setResponseStatus(event, 500);
    return { error: "The private AI worker URL is invalid." };
  }
  const target = new URL(base.href);
  target.pathname = (base.pathname.endsWith("/") ? base.pathname.slice(0, -1) : base.pathname) + "/" + (suffix[0] === "tts-capabilities" ? "capabilities" : suffix[0] === "stream" ? "chat/stream" : suffix[0]);
  // Never relay caller-controlled query parameters, cookies, origin, or arbitrary
  // headers to the private worker. The gateway only forwards validated JSON.
  target.search = "";

  const headers = new Headers();
  headers.set("x-forwarded-prefix", "/api/ai");
  headers.set("content-type", "application/json");
  const token = dedicatedTtsUrl ? worker?.token?.trim() : worker?.token?.trim() || process.env.AI_WORKER_API_TOKEN?.trim();
  if (token) headers.set("authorization", "Bearer " + token);

  let body: string | undefined;
  if (method === "POST") {
    const raw = await readRawBody(event, false);
    body = raw ? (typeof raw === "string" ? raw : new TextDecoder().decode(raw)) : "";
    const maxBytes = endpoint === "tts" ? 16_000 : 64_000;
    if (!body) {
      setResponseStatus(event, 400);
      return { error: "A JSON request body is required." };
    }
    if (new TextEncoder().encode(body).byteLength > maxBytes) {
      setResponseStatus(event, 413);
      return { error: "The AI request body is too large." };
    }
    try {
      const parsed: unknown = JSON.parse(body);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Expected JSON object");
    } catch {
      setResponseStatus(event, 400);
      return { error: "Invalid JSON request body." };
    }
  }

  try {
    const upstream = await fetch(target, {
      method,
      headers,
      body,
      redirect: "manual",
      signal: AbortSignal.timeout(["chat", "stream", "tts"].includes(suffix[0]) ? 120000 : 15000),
    });
    const responseHeaders = new Headers();
    upstream.headers.forEach((value, name) => {
      if (!HOP_BY_HOP.has(name.toLowerCase())) responseHeaders.set(name, value);
    });
    responseHeaders.set("cache-control", "no-store");
    return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: responseHeaders });
  } catch (error) {
    setResponseStatus(event, 502);
    return {
      error: "Unable to reach the private NKAI inference worker.",
      code: "AI_WORKER_UNREACHABLE",
      detail: error instanceof Error ? error.message : "Upstream connection failed",
    };
  }
});
