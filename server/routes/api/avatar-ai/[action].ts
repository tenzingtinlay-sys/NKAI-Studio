import { defineEventHandler, getRequestURL, getRouterParam, readBody, setResponseStatus, type H3Event } from "h3";

const DEFAULT_GATEWAY = "https://nkai-avatar-gateway.tenzingtinlay.workers.dev";
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 20;
const requests = new Map<string, { count: number; resetAt: number }>();

type ChatTurn = { role: "user" | "assistant"; text: string };

function fail(event: H3Event, status: number, error: string) {
  setResponseStatus(event, status);
  return { error };
}

export default defineEventHandler(async (event) => {
  const action = getRouterParam(event, "action");
  if (event.method !== "POST" || (action !== "chat" && action !== "tts")) {
    return fail(event, action === "chat" || action === "tts" ? 405 : 404, "Unknown avatar AI endpoint.");
  }

  const requestUrl = getRequestURL(event);
  const origin = event.node?.req?.headers?.origin;
  if (typeof origin !== "string" || origin !== requestUrl.origin) {
    return fail(event, 403, "A same-origin browser request is required.");
  }
  const contentType = String(event.node?.req?.headers?.["content-type"] || "").split(";")[0].trim().toLowerCase();
  if (contentType !== "application/json") return fail(event, 415, "Content-Type must be application/json.");

  const ip = String(event.node?.req?.socket?.remoteAddress || event.node?.req?.headers?.["x-real-ip"] || "unknown").slice(0, 100);
  const now = Date.now();
  const slot = requests.get(ip);
  if (!slot || slot.resetAt <= now) requests.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  else if (slot.count >= MAX_REQUESTS_PER_WINDOW) return fail(event, 429, "Too many avatar requests. Please wait a minute and try again.");
  else slot.count += 1;
  if (requests.size > 5000) {
    for (const [key, value] of requests) if (value.resetAt <= now) requests.delete(key);
  }

  const apiSecret = process.env.NKAI_AI_CLIENT_SECRET?.trim();
  const gateway = (process.env.NKAI_AI_GATEWAY_URL?.trim() || DEFAULT_GATEWAY).replace(/\/$/, "");
  if (!apiSecret) return fail(event, 503, "GPU avatar is not configured on this deployment. Add NKAI_AI_CLIENT_SECRET as a server-side secret.");

  let body: { message?: unknown; text?: unknown; language?: unknown; history?: unknown };
  try {
    body = await readBody(event);
  } catch {
    return fail(event, 400, "Invalid JSON request.");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) return fail(event, 400, "A JSON object is required.");

  let payload: Record<string, unknown>;
  if (action === "chat") {
    const message = typeof body.message === "string" ? body.message.trim().slice(0, 1200) : "";
    if (!message) return fail(event, 400, "Please enter a message.");
    const allowedRoles = new Set(["user", "assistant"]);
    const history = Array.isArray(body.history)
      ? (body.history as ChatTurn[]).slice(-8).filter((turn) => turn && allowedRoles.has(turn.role) && typeof turn.text === "string")
          .map((turn) => ({ role: turn.role, text: turn.text.slice(0, 1200) }))
      : [];
    payload = {
      message,
      language: typeof body.language === "string" ? body.language.slice(0, 12) : "en",
      history,
    };
  } else {
    const text = typeof body.text === "string" ? body.text.trim().slice(0, 500) : "";
    if (!text) return fail(event, 400, "Please provide text for speech.");
    payload = { text, language: typeof body.language === "string" ? body.language.slice(0, 12) : "en" };
  }

  try {
    const upstream = await fetch(`${gateway}/api/ai/${action}`, {
      method: "POST",
      headers: { authorization: `Bearer ${apiSecret}`, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(action === "tts" ? 95_000 : 65_000),
    });
    const responseBody = await upstream.json().catch(() => ({ error: "GPU service returned an unreadable response." }));
    setResponseStatus(event, upstream.status);
    return responseBody;
  } catch {
    return fail(event, 502, "Could not reach the NKAI GPU gateway. Check that the Colab worker and registration helper are still running.");
  }
});
