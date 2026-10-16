// AI worker proxy for the NKAI gateway.
// Uses the separate "ai:worker:" KV prefix; does not modify LiveTalking records.
//
// Required Wrangler secrets (never commit these):
//   AI_REGISTER_SECRET - authorizes worker lifecycle operations
//   AI_CLIENT_SECRET   - authorizes trusted backend proxy calls
//   AI_WORKER_TOKEN    - bearer token forwarded to the registered worker
//
// Optional vars:
//   AI_TTL_SECONDS (minimum 60; defaults to BACKEND_TTL_SECONDS or 90)
//   AI_WORKER_HOST_SUFFIXES (comma-separated hostname suffixes; defaults to .trycloudflare.com)

const AI_PREFIX = "ai:worker:";
const ID_RE = /^[a-zA-Z0-9_-]{1,48}$/;
const MAX_BODY_BYTES = 64 * 1024;

function reply(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...extraHeaders,
    },
  });
}

function safeEqual(a, b) {
  const x = new TextEncoder().encode(String(a));
  const y = new TextEncoder().encode(String(b));
  let diff = x.length ^ y.length;
  const n = Math.max(x.length, y.length);
  for (let i = 0; i < n; i++) diff |= (x[i] || 0) ^ (y[i] || 0);
  return diff === 0;
}

function hasBearer(request, secret) {
  if (!secret) return false;
  return safeEqual(request.headers.get("authorization") || "", "Bearer " + secret);
}

function ttlSeconds(env) {
  const n = Number(env.AI_TTL_SECONDS || env.BACKEND_TTL_SECONDS || 90);
  return Number.isFinite(n) && n >= 60 ? Math.floor(n) : 90;
}

function hostAllowed(hostname, env) {
  const suffixes = String(env.AI_WORKER_HOST_SUFFIXES || ".trycloudflare.com")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .map((s) => (s.startsWith(".") ? s : "." + s));
  const host = hostname.toLowerCase();
  return suffixes.some((suffix) => host.endsWith(suffix));
}

async function readJson(request) {
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
    return { error: reply({ error: "Request too large" }, 413) };
  }
  try {
    return { raw, data: JSON.parse(raw) };
  } catch {
    return { error: reply({ error: "Invalid JSON" }, 400) };
  }
}

async function getWorker(env) {
  const listing = await env.BACKENDS.list({ prefix: AI_PREFIX });
  const now = Date.now();
  const ttlMs = ttlSeconds(env) * 1000;
  const live = [];

  for (const key of listing.keys) {
    const item = await env.BACKENDS.get(key.name, "json");
    if (
      !item ||
      !item.url ||
      !Number.isFinite(item.lastSeen) ||
      now - item.lastSeen > ttlMs
    ) {
      await env.BACKENDS.delete(key.name);
      continue;
    }
    live.push(item);
  }

  live.sort(
    (a, b) =>
      Number(a.priority || 100) - Number(b.priority || 100) ||
      String(a.id).localeCompare(String(b.id)),
  );
  return live[0] || null;
}

function workerHeaders(env, contentType) {
  const headers = new Headers();
  if (contentType) headers.set("content-type", contentType);
  headers.set("authorization", "Bearer " + env.AI_WORKER_TOKEN);
  return headers;
}

async function callWorker(env, worker, path, init, timeoutMs) {
  try {
    return await fetch(worker.url + path, {
      ...init,
      redirect: "error",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    await env.BACKENDS.delete(AI_PREFIX + worker.id);
    return null;
  }
}

function passThrough(upstream, extraHeaders = {}) {
  if (upstream.status === 401 || upstream.status === 403) {
    return reply({ error: "AI worker rejected the gateway credentials" }, 502);
  }

  const headers = new Headers(extraHeaders);
  headers.set("cache-control", extraHeaders["cache-control"] || "no-store");
  headers.set(
    "content-type",
    upstream.headers.get("content-type") || "application/json",
  );
  return new Response(upstream.body, { status: upstream.status, headers });
}

export async function handleAi(request, env, url) {
  const path = url.pathname;

  // Worker lifecycle endpoints.
  if (
    path === "/api/ai/register" ||
    path === "/api/ai/heartbeat" ||
    path === "/api/ai/unregister"
  ) {
    if (request.method !== "POST") return reply({ error: "POST required" }, 405);
    if (!hasBearer(request, env.AI_REGISTER_SECRET)) {
      return reply({ error: "Unauthorized" }, 401);
    }

    const parsed = await readJson(request);
    if (parsed.error) return parsed.error;
    const body =
      parsed.data && typeof parsed.data === "object" && !Array.isArray(parsed.data)
        ? parsed.data
        : {};
    const id = String(body.id || "").trim();
    if (!ID_RE.test(id)) return reply({ error: "Invalid worker id" }, 400);

    const key = AI_PREFIX + id;
    const ttl = ttlSeconds(env);

    if (path === "/api/ai/unregister") {
      await env.BACKENDS.delete(key);
      return reply({ unregistered: true, id });
    }

    if (path === "/api/ai/heartbeat") {
      const previous = await env.BACKENDS.get(key, "json");
      if (!previous) {
        return reply(
          { error: "AI worker not registered; call /api/ai/register again" },
          404,
        );
      }
      previous.lastSeen = Date.now();
      await env.BACKENDS.put(key, JSON.stringify(previous), {
        expirationTtl: ttl,
      });
      return reply({ ok: true, id });
    }

    let target;
    try {
      target = new URL(String(body.url || "").trim());
    } catch {
      return reply({ error: "Invalid worker URL" }, 400);
    }
    if (
      target.protocol !== "https:" ||
      target.username ||
      target.password ||
      !hostAllowed(target.hostname, env)
    ) {
      return reply({ error: "Worker URL must use HTTPS on an allowed host" }, 400);
    }

    const priority = Number(body.priority ?? 100);
    if (!Number.isFinite(priority) || priority < 0 || priority > 10000) {
      return reply({ error: "Invalid priority" }, 400);
    }

    const record = {
      id,
      url: target.origin,
      priority,
      lastSeen: Date.now(),
    };
    await env.BACKENDS.put(key, JSON.stringify(record), {
      expirationTtl: ttl,
    });
    return reply({ registered: true, id, ttlSeconds: ttl });
  }

  // Caller-authenticated AI proxy endpoints.
  if (
    path === "/api/ai/capabilities" ||
    path === "/api/ai/chat" ||
    path === "/api/ai/chat/stream" ||
    path === "/api/ai/tts"
  ) {
    const isCapabilities = path === "/api/ai/capabilities";
    const isTts = path === "/api/ai/tts";
    const expectedMethod = isCapabilities ? "GET" : "POST";
    if (request.method !== expectedMethod) {
      return reply({ error: expectedMethod + " required" }, 405);
    }
    if (!hasBearer(request, env.AI_CLIENT_SECRET)) {
      return reply({ error: "Unauthorized" }, 401);
    }

    // Fail closed: never make an upstream request without its worker credential.
    if (!env.AI_WORKER_TOKEN) {
      return reply({ error: "AI worker credentials are not configured" }, 503);
    }

    let raw = "";
    if (!isCapabilities) {
      const parsed = await readJson(request);
      if (parsed.error) return parsed.error;
      if (
        !parsed.data ||
        typeof parsed.data !== "object" ||
        Array.isArray(parsed.data) ||
        (isTts
          ? typeof parsed.data.text !== "string" || !parsed.data.text.trim()
          : typeof parsed.data.message !== "string" || !parsed.data.message.trim())
      ) {
        return reply({ error: isTts ? "text is required" : "message is required" }, 400);
      }
      raw = parsed.raw;
    }

    const worker = await getWorker(env);
    if (!worker) return reply({ error: "No healthy AI worker is registered" }, 503);

    if (isCapabilities) {
      const upstream = await callWorker(
        env,
        worker,
        "/capabilities",
        { method: "GET", headers: workerHeaders(env) },
        10000,
      );
      if (!upstream) {
        return reply({ error: "AI worker is unreachable and has been removed" }, 502);
      }
      return passThrough(upstream);
    }

    const streaming = path === "/api/ai/chat/stream";
    const upstreamPath = isTts ? "/tts" : streaming ? "/chat/stream" : "/chat";
    const upstream = await callWorker(
      env,
      worker,
      upstreamPath,
      {
        method: "POST",
        headers: workerHeaders(env, "application/json"),
        body: raw,
      },
      streaming ? 150000 : isTts ? 90000 : 60000,
    );
    if (!upstream) {
      return reply({ error: "AI worker is unreachable and has been removed" }, 502);
    }

    return streaming
      ? passThrough(upstream, {
          "cache-control": "no-cache, no-transform",
          "x-accel-buffering": "no",
        })
      : passThrough(upstream);
  }

  return reply({ error: "Not found" }, 404);
}
