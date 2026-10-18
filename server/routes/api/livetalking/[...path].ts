import { defineEventHandler, getRequestURL, readRawBody, setResponseStatus } from "h3";
import { getSessionUser } from "../../../../src/lib/auth/verify.server";

const HOP_BY_HOP = new Set(["connection", "keep-alive", "proxy-authenticate", "proxy-authorization", "te", "trailers", "transfer-encoding", "upgrade", "host", "content-length"]);
const ALLOWED_PATHS = new Set(["status", "offer", "human", "interrupt_talk"]);
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
  // The read-only status probe exposes no credentials or internal URL, so it
  // can run before sign-in and report service readiness without console 401s.
  // All streaming actions still require a verified app session.
  const initialUrl = getRequestURL(event);
  const initialPath = initialUrl.pathname.startsWith("/api/livetalking")
    ? initialUrl.pathname.slice("/api/livetalking".length).split("/").filter(Boolean).join("/")
    : "";
  const publicStatusProbe = initialPath === "status" && event.method.toUpperCase() === "GET";
  if (!publicStatusProbe) {
    let user;
    try {
      user = await getSessionUser();
    } catch {
      setResponseStatus(event, 401);
      return { error: "Sign in to use live avatar streaming.", code: "LIVETALKING_AUTH_REQUIRED" };
    }
    if (!user) {
      setResponseStatus(event, 401);
      return { error: "Sign in to use live avatar streaming.", code: "LIVETALKING_AUTH_REQUIRED" };
    }
  }

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
  // State-changing browser requests must be same-origin JSON. The read-only
  // status probe is authenticated and does not accept a caller-supplied target.
  const method = event.method.toUpperCase();
  if (method === "POST") {
    const origin = event.node?.req?.headers?.origin;
    if (typeof origin !== "string" || origin !== requestUrl.origin) {
      setResponseStatus(event, 403);
      return { error: "Cross-origin requests are not allowed.", code: "LIVETALKING_ORIGIN_REJECTED" };
    }
    const contentType = String(event.node?.req?.headers?.["content-type"] || "").split(";")[0].trim().toLowerCase();
    if (contentType !== "application/json") {
      setResponseStatus(event, 415);
      return { error: "Content-Type must be application/json." };
    }
  }

  const prefix = "/api/livetalking";
  const suffix = requestUrl.pathname.startsWith(prefix) ? requestUrl.pathname.slice(prefix.length) : "/";
  const relativePath = suffix.split("/").filter(Boolean).join("/");
  if (!ALLOWED_PATHS.has(relativePath)) {
    setResponseStatus(event, 404);
    return { error: "This LiveTalking endpoint is not exposed through NKAI Studio.", code: "LIVETALKING_ENDPOINT_NOT_ALLOWED" };
  }
  if (relativePath === "status") {
    if (method !== "GET" && method !== "HEAD") {
      setResponseStatus(event, 405);
      return { error: "Method not allowed for the LiveTalking status endpoint." };
    }
    const probe = new URL(base.href);
    probe.pathname = base.pathname || "/";
    probe.search = "";
    try {
      const upstream = await fetch(probe, {
        method: "GET",
        redirect: "manual",
        signal: AbortSignal.timeout(5000),
        headers: { "cache-control": "no-store" },
      });
      const httpStatus = upstream.status;
      await upstream.body?.cancel();
      const reachable = httpStatus < 500;
      setResponseStatus(event, reachable ? 200 : 503);
      return {
        configured: true,
        reachable,
        httpStatus,
        mediaVerified: false,
        detail: reachable
          ? "The LiveTalking HTTP endpoint responded. WebRTC media and GPU readiness still require a real browser session."
          : "The LiveTalking HTTP endpoint returned a server error.",
      };
    } catch {
      setResponseStatus(event, 503);
      return {
        configured: true,
        reachable: false,
        mediaVerified: false,
        error: "The LiveTalking service could not be reached.",
        code: "LIVETALKING_UNREACHABLE",
      };
    }
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
  // Do not forward arbitrary query parameters or caller headers/cookies to the
  // private GPU service. Only send the validated JSON payload and fixed metadata.
  target.search = "";

  const headers = new Headers();
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
