import test from "node:test";
import assert from "node:assert/strict";
import { handleAi } from "../gateway/src/ai.js";

function makeKV() {
  const m = new Map();
  return {
    m,
    async get(key, type) {
      const value = m.get(key);
      if (value === undefined) return null;
      return type === "json" ? JSON.parse(value) : value;
    },
    async put(key, value) { m.set(key, value); },
    async delete(key) { m.delete(key); },
    async list({ prefix = "" } = {}) {
      return { keys: [...m.keys()].filter((key) => key.startsWith(prefix)).map((name) => ({ name })) };
    },
  };
}

const env = () => ({
  BACKENDS: makeKV(),
  AI_REGISTER_SECRET: "reg-secret",
  AI_CLIENT_SECRET: "client-secret",
  AI_WORKER_TOKEN: "worker-secret",
  BACKEND_TTL_SECONDS: "90",
});

const call = (e, method, path, { token, body } = {}) =>
  handleAi(
    new Request("https://gw.test" + path, {
      method,
      headers: {
        ...(token ? { authorization: "Bearer " + token } : {}),
        "content-type": "application/json",
      },
      body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
    }),
    e,
    new URL("https://gw.test" + path),
  );

const register = (e, extra = {}) =>
  call(e, "POST", "/api/ai/register", {
    token: "reg-secret",
    body: { id: "colab", url: "https://abc-def.trycloudflare.com/some/path", ...extra },
  });

function stubFetch(handler) {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return handler(String(url), init);
  };
  return { calls, restore: () => { globalThis.fetch = original; } };
}

test("register requires the registration secret", async () => {
  const e = env();
  assert.equal((await call(e, "POST", "/api/ai/register", { body: { id: "a", url: "https://x.trycloudflare.com" } })).status, 401);
  assert.equal((await call(e, "POST", "/api/ai/register", { token: "client-secret", body: { id: "a", url: "https://x.trycloudflare.com" } })).status, 401);
});

test("registration validates ID and URL and stores only the origin", async () => {
  const e = env();
  assert.equal((await register(e, { id: "bad id!" })).status, 400);
  assert.equal((await register(e, { url: "http://abc.trycloudflare.com" })).status, 400);
  assert.equal((await register(e, { url: "https://evil.example.com" })).status, 400);
  assert.equal((await register(e, { url: "https://user:pw@abc.trycloudflare.com" })).status, 400);
  assert.equal((await register(e)).status, 200);
  const stored = JSON.parse(e.BACKENDS.m.get("ai:worker:colab"));
  assert.equal(stored.url, "https://abc-def.trycloudflare.com");
});

test("AI records do not touch avatar backend keys", async () => {
  const e = env();
  e.BACKENDS.m.set("backend:avatar-1", JSON.stringify({ id: "avatar-1", url: "https://avatar.trycloudflare.com", lastSeen: Date.now() }));
  await register(e);
  assert.ok(e.BACKENDS.m.has("backend:avatar-1"));
  assert.ok(e.BACKENDS.m.has("ai:worker:colab"));
});

test("chat, stream and capabilities require the client secret", async () => {
  const e = env();
  await register(e);
  assert.equal((await call(e, "POST", "/api/ai/chat", { body: { message: "hi" } })).status, 401);
  assert.equal((await call(e, "POST", "/api/ai/chat/stream", { token: "reg-secret", body: { message: "hi" } })).status, 401);
  assert.equal((await call(e, "GET", "/api/ai/capabilities")).status, 401);
});

test("missing worker returns 503", async () => {
  const e = env();
  const res = await call(e, "POST", "/api/ai/chat", { token: "client-secret", body: { message: "hi" } });
  assert.equal(res.status, 503);
});

test("expired worker is treated as missing and removed", async () => {
  const e = env();
  e.BACKENDS.m.set("ai:worker:old", JSON.stringify({ id: "old", url: "https://o.trycloudflare.com", priority: 100, lastSeen: Date.now() - 200000 }));
  const res = await call(e, "POST", "/api/ai/chat", { token: "client-secret", body: { message: "hi" } });
  assert.equal(res.status, 503);
  assert.equal(e.BACKENDS.m.has("ai:worker:old"), false);
});

test("chat validates JSON and requires a non-empty message", async () => {
  const e = env();
  await register(e);
  assert.equal((await call(e, "POST", "/api/ai/chat", { token: "client-secret", body: "not json" })).status, 400);
  assert.equal((await call(e, "POST", "/api/ai/chat", { token: "client-secret", body: { message: "   " } })).status, 400);
});

test("chat is proxied with the worker token without returning that token", async () => {
  const e = env();
  await register(e);
  const stub = stubFetch(() => new Response(JSON.stringify({ response: "hello" }), { status: 200, headers: { "content-type": "application/json" } }));
  try {
    const res = await call(e, "POST", "/api/ai/chat", { token: "client-secret", body: { message: "hi", language: "en" } });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { response: "hello" });
    assert.equal(stub.calls[0].url, "https://abc-def.trycloudflare.com/chat");
    assert.equal(stub.calls[0].init.headers.get("authorization"), "Bearer worker-secret");
    assert.equal(res.headers.get("authorization"), null);
  } finally { stub.restore(); }
});

test("stream is passed through without buffering", async () => {
  const e = env();
  await register(e);
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const enc = new TextEncoder();
  const body = new ReadableStream({
    async start(controller) {
      controller.enqueue(enc.encode('data: {"token":"Hel"}\n\n'));
      await gate;
      controller.enqueue(enc.encode('data: {"token":"lo"}\n\n'));
      controller.enqueue(enc.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
  const stub = stubFetch(() => new Response(body, { status: 200, headers: { "content-type": "text/event-stream" } }));
  try {
    const res = await call(e, "POST", "/api/ai/chat/stream", { token: "client-secret", body: { message: "hi" } });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("content-type"), "text/event-stream");
    assert.match(res.headers.get("cache-control"), /no-transform/);
    assert.equal(stub.calls[0].url, "https://abc-def.trycloudflare.com/chat/stream");
    const reader = res.body.getReader();
    const first = new TextDecoder().decode((await reader.read()).value);
    assert.match(first, /Hel/);
    release();
    let rest = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      rest += new TextDecoder().decode(value);
    }
    assert.match(rest, /\[DONE\]/);
  } finally { release?.(); stub.restore(); }
});

test("unreachable worker returns 502 and is removed", async () => {
  const e = env();
  await register(e);
  const stub = stubFetch(() => { throw new Error("connect failed"); });
  try {
    const res = await call(e, "POST", "/api/ai/chat", { token: "client-secret", body: { message: "hi" } });
    assert.equal(res.status, 502);
    assert.equal(e.BACKENDS.m.has("ai:worker:colab"), false);
  } finally { stub.restore(); }
});

test("worker rejecting the gateway token returns a sanitized 502", async () => {
  const e = env();
  await register(e);
  const stub = stubFetch(() => new Response('{"detail":"Invalid or missing worker token"}', { status: 401 }));
  try {
    const res = await call(e, "POST", "/api/ai/chat", { token: "client-secret", body: { message: "hi" } });
    assert.equal(res.status, 502);
    assert.doesNotMatch(await res.text(), /Invalid or missing worker token/);
  } finally { stub.restore(); }
});

test("capabilities is proxied", async () => {
  const e = env();
  await register(e);
  const stub = stubFetch(() => new Response(JSON.stringify({ chat: { ready: true } }), { status: 200, headers: { "content-type": "application/json" } }));
  try {
    const res = await call(e, "GET", "/api/ai/capabilities", { token: "client-secret" });
    assert.equal(res.status, 200);
    assert.equal((await res.json()).chat.ready, true);
    assert.equal(stub.calls[0].url, "https://abc-def.trycloudflare.com/capabilities");
  } finally { stub.restore(); }
});

test("heartbeat refreshes registration and returns 404 for unknown workers", async () => {
  const e = env();
  assert.equal((await call(e, "POST", "/api/ai/heartbeat", { token: "reg-secret", body: { id: "colab" } })).status, 404);
  await register(e);
  const rec = JSON.parse(e.BACKENDS.m.get("ai:worker:colab"));
  rec.lastSeen -= 60000;
  e.BACKENDS.m.set("ai:worker:colab", JSON.stringify(rec));
  assert.equal((await call(e, "POST", "/api/ai/heartbeat", { token: "reg-secret", body: { id: "colab" } })).status, 200);
  assert.ok(JSON.parse(e.BACKENDS.m.get("ai:worker:colab")).lastSeen > rec.lastSeen);
});

test("unregister removes the worker", async () => {
  const e = env();
  await register(e);
  assert.equal((await call(e, "POST", "/api/ai/unregister", { token: "reg-secret", body: { id: "colab" } })).status, 200);
  assert.equal(e.BACKENDS.m.has("ai:worker:colab"), false);
});

test("missing worker token fails closed", async () => {
  const e = env();
  delete e.AI_WORKER_TOKEN;
  await register(e);
  const res = await call(e, "POST", "/api/ai/chat", { token: "client-secret", body: { message: "hi" } });
  assert.equal(res.status, 503);
});
