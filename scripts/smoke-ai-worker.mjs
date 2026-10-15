#!/usr/bin/env node
/**
 * Real endpoint acceptance test for the self-hosted NKAI GPU worker.
 * No paid inference providers are contacted. Never run against an endpoint
 * you do not control.
 */
import { validateWorkerBaseUrl } from "./smoke-ai-worker-utils.mjs";

const baseUrl = process.env.AI_WORKER_SMOKE_URL || process.env.AI_WORKER_INTERNAL_URL;
const token = process.env.AI_WORKER_SMOKE_TOKEN || process.env.AI_WORKER_API_TOKEN;
const includeTts = process.argv.includes("--tts");

if (!baseUrl || !token) {
  console.error("Set AI_WORKER_SMOKE_URL and AI_WORKER_SMOKE_TOKEN (or AI_WORKER_INTERNAL_URL and AI_WORKER_API_TOKEN).");
  process.exit(2);
}

const base = validateWorkerBaseUrl(baseUrl);
const authHeaders = { authorization: "Bearer " + token };
const timeout = (ms) => AbortSignal.timeout(ms);

async function jsonRequest(path, init = {}) {
  const response = await fetch(new URL(path.replace(/^\//, ""), base.href.endsWith("/") ? base : base.href + "/"), {
    ...init,
    headers: { ...(init.body ? { "content-type": "application/json" } : {}), ...authHeaders, ...(init.headers || {}) },
    cache: "no-store",
    redirect: "error",
    signal: init.signal || timeout(30000),
  });
  const type = response.headers.get("content-type") || "";
  const body = type.includes("json") ? await response.json() : await response.text();
  return { response, body };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  console.log("NKAI worker smoke test:", base.origin);

  const health = await jsonRequest("/health");
  assert(health.response.ok && typeof health.body === "object", "Health endpoint did not return JSON successfully.");
  assert(["ready", "healthy", "ok", "running"].includes(String(health.body.status || "").toLowerCase()), "Worker is not ready: " + String(health.body.status || "unknown"));
  console.log("PASS /health:", health.body.status, "| model:", health.body.model || "not reported", "| CUDA:", Boolean(health.body.cuda));

  const capabilities = await jsonRequest("/capabilities");
  assert(capabilities.response.ok && typeof capabilities.body === "object", "Capabilities endpoint failed.");
  assert(capabilities.body.chat?.ready !== false, "Chat capability reports not ready.");
  console.log("PASS /capabilities: chat model", capabilities.body.chat?.model || "reported");

  // A configured token must actually protect inference, not just be documented.
  const unauthorized = await fetch(new URL("chat", base.href.endsWith("/") ? base : base.href + "/"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message: "unauthorized smoke probe" }),
    cache: "no-store",
    redirect: "error",
    signal: timeout(15000),
  });
  assert(unauthorized.status === 401, "Unauthenticated /chat must return HTTP 401; got " + unauthorized.status + ". Ensure WORKER_API_TOKEN is configured.");
  console.log("PASS unauthenticated chat is rejected (HTTP 401)");

  const chat = await jsonRequest("/chat", {
    method: "POST",
    body: JSON.stringify({ message: "Reply with a short greeting for NKAI Studio.", language: "en-IN", history: [] }),
    signal: timeout(120000),
  });
  assert(chat.response.ok && typeof chat.body?.reply === "string" && chat.body.reply.trim().length > 0,
    "Authenticated /chat did not return a non-empty generated reply (HTTP " + chat.response.status + ").");
  console.log("PASS /chat generated", chat.body.reply.length, "characters");

  const streamResponse = await fetch(new URL("chat/stream", base.href.endsWith("/") ? base : base.href + "/"), {
    method: "POST",
    headers: { "content-type": "application/json", ...authHeaders },
    body: JSON.stringify({ message: "Say hello in one short sentence.", language: "en", history: [] }),
    cache: "no-store",
    redirect: "error",
    signal: timeout(120000),
  });
  assert(streamResponse.ok, "Streaming endpoint failed with HTTP " + streamResponse.status);
  assert((streamResponse.headers.get("content-type") || "").includes("text/event-stream"), "Streaming endpoint did not return text/event-stream.");
  const reader = streamResponse.body?.getReader();
  assert(reader, "Streaming endpoint returned no readable body.");
  const decoder = new TextDecoder();
  let streamed = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    streamed += decoder.decode(value, { stream: true });
    if (streamed.length > 1_000_000) throw new Error("Streaming response exceeded the 1 MB smoke-test limit.");
  }
  assert(streamed.includes("data: [DONE]"), "SSE stream did not finish with data: [DONE].");
  assert(streamed.includes('"token"'), "SSE stream contained no token events.");
  console.log("PASS /chat/stream emitted SSE token events");

  if (includeTts) {
    const tts = await jsonRequest("/tts", {
      method: "POST",
      body: JSON.stringify({ text: "Hello from NKAI Studio.", language: "en-IN" }),
      signal: timeout(180000),
    });
    assert(tts.response.ok && typeof tts.body?.audio_base64 === "string" && tts.body.audio_base64.length > 100,
      "TTS did not return encoded audio (HTTP " + tts.response.status + ").");
    assert(tts.body.mime_type === "audio/wav", "TTS response is not WAV audio.");
    console.log("PASS /tts returned WAV audio. Review the model's licence before commercial use.");
  }

  console.log("All requested worker smoke checks passed.");
}

main().catch((error) => {
  console.error("NKAI worker smoke test FAILED:", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
