import { defineEventHandler, getRequestURL, readRawBody, setResponseStatus } from "h3";

const HOP_BY_HOP = new Set(["connection", "keep-alive", "proxy-authenticate", "proxy-authorization", "te", "trailers", "transfer-encoding", "upgrade", "host", "content-length"]);
const ALLOWED_PATHS = new Set(["offer", "human", "interrupt_talk"]);

/**
 * Narrow same-origin adapter for LiveTalking's documented WebRTC/text-control API.
 * Never expose its admin API, static UI, arbitrary files, or arbitrary upstream paths.
 * WebRTC media itself travels over ICE/UDP and cannot be tunneled through this HTTP route.
 */
export default defineEventHandler(async (event) => {
  const upstreamBase = process.env.LIVETALKING_INTERNAL_URL?.trim();
  if (!upstreamBase) {
    setResponseStatus(event, 503);
    return { error: "Live avatar streaming is not configured.", code: "LIVETALKING_NOT_CONFIGURED" };
  }

  let base: URL;
  try {
    base = new URL(upstreamBase);
    if (!["http:", "https:"].includes(base.protocol) || base.username || base.password) throw new Error("Invalid URL");
  } catch {
    setResponseStatus(event, 500);
    return { error: "The internal LiveTalking service URL is invalid.", code: "LIVETALKING_URL_INVALID" };
  }

  const requestUrl = getRequestURL(event);
  const prefix = "/api/livetalking";
  const suffix = requestUrl.pathname.startsWith(prefix) ? requestUrl.pathname.slice(prefix.length) : "/";
  const relativePath = suffix.split("/").filter(Boolean).join("/");
  const method = event.method.toUpperCase();

  if (!ALLOWED_PATHS.has(relativePath)) {
    setResponseStatus(event, 404);
    return { error: "This LiveTalking endpoint is not exposed through NKAI Studio.", code: "LIVETALKING_ENDPOINT_NOT_ALLOWED" };
  }
  if (method !== "POST") {
    setResponseStatus(event, 405);
    return { error: "Method not allowed for this LiveTalking endpoint." };
  }

  const target = new URL(base.href);
  const basePath = base.pathname.endsWith("/") ? base.pathname.slice(0, -1) : base.pathname;
  target.pathname = basePath + "/" + relativePath;
  target.search = requestUrl.search;

  const headers = new Headers();
  for (const [name, value] of Object.entries(event.node?.req?.headers ?? {})) {
    const lower = name.toLowerCase();
    if (HOP_BY_HOP.has(lower) || lower === "authorization" || value == null) continue;
    headers.set(name, Array.isArray(value) ? value.join(", ") : String(value));
  }
  headers.set("x-forwarded-prefix", prefix);

  let body: string | undefined;
  const raw = await readRawBody(event, false);
  if (raw) body = typeof raw === "string" ? raw : new TextDecoder().decode(raw);

  try {
    const upstream = await fetch(target, {
      method,
      headers,
      body,
      redirect: "manual",
      signal: AbortSignal.timeout(relativePath === "offer" ? 30000 : 20000),
    });
    const responseHeaders = new Headers();
    upstream.headers.forEach((value, name) => {
      if (!HOP_BY_HOP.has(name.toLowerCase()) && name.toLowerCase() !== "content-length") responseHeaders.set(name, value);
    });
    responseHeaders.set("cache-control", "no-store");
    return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: responseHeaders });
  } catch (error) {
    setResponseStatus(event, 502);
    return {
      error: "Unable to reach the internal LiveTalking service.",
      code: "LIVETALKING_UNREACHABLE",
      detail: error instanceof Error ? error.message : "Upstream connection failed",
    };
  }
});
