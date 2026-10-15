import { defineEventHandler, getRequestURL, readRawBody, setResponseStatus } from "h3";

const HOP_BY_HOP = new Set(["connection", "keep-alive", "proxy-authenticate", "proxy-authorization", "te", "trailers", "transfer-encoding", "upgrade", "host", "content-length"]);
const ALLOWED_PATHS = new Set(["offer", "human", "interrupt_talk"]);
const RATE_WINDOW_MS = 60_000;
const RATE_LIMITS = { offer: 4, human: 24, interrupt_talk: 24 } as const;
const rateBuckets = new Map<string, { startedAt: number; count: number }>();

function isRateLimited(key: string, limit: number): boolean {
  const now = Date.now();
  for (const [bucketKey, bucket] of rateBuckets) {
    if (now - bucket.startedAt >= RATE_WINDOW_MS) rateBuckets.delete(bucketKey);
  }
  const bucket = rateBuckets.get(key);
  if (!bucket || now - bucket.startedAt >= RATE_WINDOW_MS) {
    rateBuckets.set(key, { startedAt: now, count: 1 });
    return false;
  }
  bucket.count += 1;
  return bucket.count > limit;
}

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

  const clientIp = event.node?.req?.socket?.remoteAddress || "unknown";
  const rateKey = clientIp + ":" + relativePath;
  if (isRateLimited(rateKey, RATE_LIMITS[relativePath as keyof typeof RATE_LIMITS])) {
    setResponseStatus(event, 429);
    return { error: "Too many LiveTalking requests. Wait a minute and try again.", code: "LIVETALKING_RATE_LIMITED" };
  }

  const raw = await readRawBody(event, false);
  const body = raw ? (typeof raw === "string" ? raw : new TextDecoder().decode(raw)) : "";
  if (!body || body.length > 256_000) {
    setResponseStatus(event, body ? 413 : 400);
    return { error: body ? "LiveTalking request body is too large." : "A JSON request body is required." };
  }

  let payload: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(body);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Expected object");
    payload = parsed as Record<string, unknown>;
  } catch {
    setResponseStatus(event, 400);
    return { error: "Invalid JSON request body." };
  }

  if (relativePath === "offer" && (payload.type !== "offer" || typeof payload.sdp !== "string" || payload.sdp.length > 200_000)) {
    setResponseStatus(event, 400);
    return { error: "A valid WebRTC offer with type=offer and an SDP string is required." };
  }
  if (relativePath === "human" && (
    typeof payload.sessionid !== "string" || payload.sessionid.length > 160 ||
    typeof payload.text !== "string" || !payload.text.trim() || payload.text.length > 2000 ||
    payload.type !== "echo"
  )) {
    setResponseStatus(event, 400);
    return { error: "A session ID and text (up to 2,000 characters) are required; only echo mode is exposed." };
  }
  if (relativePath === "interrupt_talk" && (typeof payload.sessionid !== "string" || payload.sessionid.length > 160)) {
    setResponseStatus(event, 400);
    return { error: "A valid session ID is required." };
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
  headers.set("content-type", "application/json");

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
