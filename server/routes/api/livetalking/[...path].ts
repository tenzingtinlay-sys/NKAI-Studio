import { defineEventHandler, getRequestURL, readRawBody, setResponseStatus } from "h3";

const HOP_BY_HOP = new Set(["connection", "keep-alive", "proxy-authenticate", "proxy-authorization", "te", "trailers", "transfer-encoding", "upgrade", "host"]);

/** Same-origin HTTP proxy for a private LiveTalking service. WebRTC media still needs UDP/ICE networking. */
export default defineEventHandler(async (event) => {
  const upstreamBase = process.env.LIVETALKING_INTERNAL_URL?.trim();
  if (!upstreamBase) { setResponseStatus(event, 503); return { error: "Live avatar streaming is not configured.", code: "LIVETALKING_NOT_CONFIGURED" }; }
  let base: URL;
  try { base = new URL(upstreamBase); if (!["http:", "https:"].includes(base.protocol) || base.username || base.password) throw new Error("Invalid URL"); }
  catch { setResponseStatus(event, 500); return { error: "The internal LiveTalking service URL is invalid." }; }
  const requestUrl = getRequestURL(event);
  const prefix = "/api/livetalking";
  const suffix = requestUrl.pathname.startsWith(prefix) ? requestUrl.pathname.slice(prefix.length) : "/";
  const relativePath = suffix.split("/").filter(Boolean).join("/");
  if (relativePath.split("/").some((segment) => segment === "..") || relativePath.includes(String.fromCharCode(92))) {
    setResponseStatus(event, 400);
    return { error: "Invalid proxy path." };
  }
  const target = new URL(base.href);
  const basePath = base.pathname.endsWith("/") ? base.pathname.slice(0, -1) : base.pathname;
  target.pathname = basePath + "/" + relativePath;
  target.search = requestUrl.search;
  const method = event.method.toUpperCase();
  if (!["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"].includes(method)) { setResponseStatus(event, 405); return { error: "Method not allowed." }; }
  const headers = new Headers();
  for (const [name, value] of Object.entries(event.node.req.headers)) {
    if (HOP_BY_HOP.has(name.toLowerCase()) || name.toLowerCase() === "content-length" || value == null) continue;
    headers.set(name, Array.isArray(value) ? value.join(", ") : String(value));
  }
  headers.set("x-forwarded-prefix", prefix);
  let body: Buffer | undefined;
  if (!["GET", "HEAD"].includes(method)) { const raw = await readRawBody(event, false); if (raw) body = Buffer.from(raw); }
  try {
    const upstream = await fetch(target, { method, headers, body, redirect: "manual", signal: AbortSignal.timeout(120000) });
    const responseHeaders = new Headers();
    upstream.headers.forEach((value, name) => { if (!HOP_BY_HOP.has(name.toLowerCase()) && name.toLowerCase() !== "content-length") responseHeaders.set(name, value); });
    const contentType = upstream.headers.get("content-type") || "";
    if (contentType.includes("text/html")) {
      let html = await upstream.text();
      html = html.replaceAll('src="/', 'src="/api/livetalking/').replaceAll('href="/', 'href="/api/livetalking/').replaceAll('action="/', 'action="/api/livetalking/');
      responseHeaders.set("content-type", "text/html; charset=utf-8");
      return new Response(html, { status: upstream.status, statusText: upstream.statusText, headers: responseHeaders });
    }
    return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: responseHeaders });
  } catch (error) {
    setResponseStatus(event, 502);
    return { error: "Unable to reach the internal LiveTalking service.", detail: error instanceof Error ? error.message : "Upstream connection failed" };
  }
});
