import { handleAi } from "./ai.js";

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { ...JSON_HEADERS, ...headers } });
}

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin");
  const allowed = String(env.ALLOWED_ORIGINS || "").split(",").map((x) => x.trim()).filter(Boolean);
  if (!origin) return {};
  if (allowed.includes(origin)) return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type, authorization",
    "access-control-max-age": "86400",
    "vary": "Origin",
  };
  return {};
}

function isAllowedOrigin(request, env) {
  const origin = request.headers.get("Origin");
  if (!origin) return true; // host agent / health checks
  const allowed = String(env.ALLOWED_ORIGINS || "").split(",").map((x) => x.trim()).filter(Boolean);
  return allowed.includes(origin);
}

function authorized(request, env) {
  const expected = env.REGISTER_SECRET;
  const supplied = request.headers.get("authorization") || "";
  return Boolean(expected && supplied === `Bearer ${expected}`);
}

async function listBackends(env) {
  const listing = await env.BACKENDS.list({ prefix: "backend:" });
  const now = Date.now();
  const servers = [];
  for (const key of listing.keys) {
    const item = await env.BACKENDS.get(key.name, "json");
    if (!item || !item.url || !item.lastSeen || now - item.lastSeen > Number(env.BACKEND_TTL_SECONDS || 90) * 1000) {
      await env.BACKENDS.delete(key.name);
      continue;
    }
    servers.push({ id: item.id, up: true, priority: Number(item.priority || 100), lastSeen: item.lastSeen });
  }
  return servers.sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
}

async function getBackend(env) {
  const listing = await env.BACKENDS.list({ prefix: "backend:" });
  const now = Date.now();
  const servers = [];
  for (const key of listing.keys) {
    const item = await env.BACKENDS.get(key.name, "json");
    if (!item || !item.url || !item.lastSeen || now - item.lastSeen > Number(env.BACKEND_TTL_SECONDS || 90) * 1000) {
      await env.BACKENDS.delete(key.name);
      continue;
    }
    servers.push(item);
  }
  servers.sort((a, b) => Number(a.priority || 100) - Number(b.priority || 100) || a.id.localeCompare(b.id));
  return servers[0] || null;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = corsHeaders(request, env);
    if (request.method === "OPTIONS") {
      if (!isAllowedOrigin(request, env)) return new Response(null, { status: 403 });
      return new Response(null, { status: 204, headers: cors });
    }

    if (url.pathname === "/health" && request.method === "GET") {
      return json({ gateway: true, servers: await listBackends(env) }, 200, cors);
    }

    if (url.pathname.startsWith("/api/ai/")) {
      if (!isAllowedOrigin(request, env)) {
        return json({ error: "Origin is not allowed" }, 403, cors);
      }
      const response = await handleAi(request, env, url);
      const headers = new Headers(response.headers);
      for (const [key, value] of Object.entries(cors)) headers.set(key, value);
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }

    if (url.pathname === "/register" && request.method === "POST") {
      if (!authorized(request, env)) return json({ error: "Unauthorized" }, 401);
      let body;
      try { body = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
      const id = String(body.id || "").trim();
      const backendUrl = String(body.url || "").trim();
      const priority = Number(body.priority ?? 100);
      let parsed;
      try { parsed = new URL(backendUrl); } catch { return json({ error: "Invalid backend URL" }, 400); }
      if (!/^[a-zA-Z0-9_-]{1,48}$/.test(id)) return json({ error: "Invalid backend id" }, 400);
      if (parsed.protocol !== "https:" || !parsed.hostname.endsWith(".trycloudflare.com")) {
        return json({ error: "Backend must be a HTTPS trycloudflare.com URL" }, 400);
      }
      if (!Number.isFinite(priority) || priority < 0 || priority > 10000) return json({ error: "Invalid priority" }, 400);
      const record = { id, url: parsed.origin, priority, lastSeen: Date.now() };
      await env.BACKENDS.put(`backend:${id}`, JSON.stringify(record), { expirationTtl: Number(env.BACKEND_TTL_SECONDS || 90) });
      return json({ registered: true, id, ttlSeconds: Number(env.BACKEND_TTL_SECONDS || 90) }, 200);
    }

    if (url.pathname === "/heartbeat" && request.method === "POST") {
      if (!authorized(request, env)) return json({ error: "Unauthorized" }, 401);
      let body;
      try { body = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
      const id = String(body.id || "").trim();
      if (!/^[a-zA-Z0-9_-]{1,48}$/.test(id)) return json({ error: "Invalid backend id" }, 400);
      const key = `backend:${id}`;
      const previous = await env.BACKENDS.get(key, "json");
      if (!previous) return json({ error: "Backend not registered; call /register again" }, 404);
      previous.lastSeen = Date.now();
      await env.BACKENDS.put(key, JSON.stringify(previous), { expirationTtl: Number(env.BACKEND_TTL_SECONDS || 90) });
      return json({ ok: true, id });
    }

    if (url.pathname === "/unregister" && request.method === "POST") {
      if (!authorized(request, env)) return json({ error: "Unauthorized" }, 401);
      let body;
      try { body = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
      const id = String(body.id || "").trim();
      if (!/^[a-zA-Z0-9_-]{1,48}$/.test(id)) return json({ error: "Invalid backend id" }, 400);
      await env.BACKENDS.delete(`backend:${id}`);
      return json({ unregistered: true, id });
    }

    const proxyPaths = ["/api/livetalking/offer", "/api/livetalking/human", "/api/livetalking/interrupt_talk", "/offer", "/human", "/interrupt_talk", "/status"];
    if (proxyPaths.includes(url.pathname)) {
      const directBrowserPath = url.pathname.startsWith("/api/livetalking/");
      if (url.pathname.endsWith("/status")) {
        if (request.method !== "GET" && request.method !== "HEAD") return json({ error: "GET required" }, 405, cors);
        if (directBrowserPath && !isAllowedOrigin(request, env)) return json({ error: "Origin is not allowed" }, 403, cors);
        const backend = await getBackend(env);
        if (!backend) return json({ configured: true, reachable: false, mediaVerified: false, error: "No live avatar server has registered yet" }, 503, cors);
        try {
          const probe = await fetch(backend.url + "/", { method: "GET", redirect: "manual", signal: AbortSignal.timeout(5000) });
          await probe.body?.cancel();
          return json({ configured: true, reachable: probe.status < 500, httpStatus: probe.status, mediaVerified: false }, probe.status < 500 ? 200 : 503, cors);
        } catch {
          return json({ configured: true, reachable: false, mediaVerified: false, error: "LiveTalking host is unreachable" }, 503, cors);
        }
      }
      if (request.method !== "POST") return json({ error: "POST required" }, 405, cors);
      if (directBrowserPath && !isAllowedOrigin(request, env)) return json({ error: "Origin is not allowed. Configure ALLOWED_ORIGINS in gateway/wrangler.toml." }, 403, cors);
      const backend = await getBackend(env);
      if (!backend) return json({ error: "No live avatar server has registered yet" }, 503, cors);
      const upstreamPath = url.pathname.endsWith("/offer") ? "/offer" : url.pathname.endsWith("/human") ? "/human" : "/interrupt_talk";
      const headers = new Headers({ "content-type": request.headers.get("content-type") || "application/json" });
      let upstream;
      try {
        upstream = await fetch(`${backend.url}${upstreamPath}`, {
          method: "POST",
          headers,
          body: await request.arrayBuffer(),
          signal: AbortSignal.timeout(25000),
        });
      } catch {
        await env.BACKENDS.delete(`backend:${backend.id}`);
        return json({ error: `Live avatar host "${backend.id}" is unreachable; it will be removed from the gateway.` }, 502, cors);
      }
      const responseHeaders = new Headers(cors);
      responseHeaders.set("content-type", upstream.headers.get("content-type") || "application/json");
      responseHeaders.set("cache-control", "no-store");
      return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
    }

    return json({ error: "Not found" }, 404, cors);
  },
};
