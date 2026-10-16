import { createFileRoute } from "@tanstack/react-router";

type WorkerConfig = { id: string; platform: string; baseUrl: string; token: string; priority: number };
type WorkerStatus = {
  id: string; platform: string; priority: number; healthy: boolean; status: string;
  latencyMs?: number; capabilities?: unknown; detail?: string;
};
type GatewayAction = "chat" | "tts" | "capabilities" | "health" | "live-offer" | "live-human" | "live-interrupt";
const ACTION_PATHS: Record<GatewayAction, string> = {
  chat: "/chat", tts: "/tts", capabilities: "/capabilities", health: "/health",
  "live-offer": "/offer", "live-human": "/human", "live-interrupt": "/interrupt_talk",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: {
    "content-type": "application/json; charset=utf-8", "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  }});
}
function getEnv(name: string): string {
  try { return (process.env[name] || "").trim(); } catch { return ""; }
}
function loadWorkers(): WorkerConfig[] {
  const raw = getEnv("AI_GPU_WORKERS");
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.flatMap((entry, index) => {
        if (!entry || typeof entry !== "object") return [];
        const item = entry as Record<string, unknown>;
        const id = typeof item.id === "string" ? item.id.trim() : "";
        const platform = typeof item.platform === "string" ? item.platform.trim() : "custom";
        const baseUrl = typeof item.baseUrl === "string" ? item.baseUrl.trim() : "";
        const token = typeof item.token === "string" ? item.token.trim() : "";
        const priority = Number.isFinite(item.priority) ? Number(item.priority) : index;
        if (!id || !baseUrl || !token) return [];
        try {
          const url = new URL(baseUrl);
          if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") return [];
          if (url.username || url.password || url.search || url.hash) return [];
          return [{ id, platform, baseUrl: url.origin + url.pathname.replace(/\/$/, ""), token, priority }];
        } catch { return []; }
      }).sort((a, b) => a.priority - b.priority);
    } catch { return []; }
  }
  const baseUrl = getEnv("AI_WORKER_INTERNAL_URL");
  const token = getEnv("AI_WORKER_API_TOKEN");
  if (!baseUrl || !token) return [];
  try {
    const url = new URL(baseUrl);
    if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") return [];
    if (url.username || url.password || url.search || url.hash) return [];
    return [{ id: "primary", platform: getEnv("AI_WORKER_PLATFORM") || "self-hosted",
      baseUrl: url.origin + url.pathname.replace(/\/$/, ""), token, priority: 0 }];
  } catch { return []; }
}
function allowedOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try { return new URL(origin).origin === new URL(request.url).origin; } catch { return false; }
}
async function requestWorker(worker: WorkerConfig, path: string, init: RequestInit = {}) {
  return fetch(worker.baseUrl.replace(/\/$/, "") + path, {
    ...init,
    headers: { authorization: "Bearer " + worker.token,
      ...(init.body ? { "content-type": "application/json" } : {}), ...(init.headers || {}) },
    cache: "no-store", redirect: "error", signal: init.signal || AbortSignal.timeout(12_000),
  });
}
async function probe(worker: WorkerConfig): Promise<WorkerStatus> {
  const started = Date.now();
  try {
    const response = await requestWorker(worker, "/health", { signal: AbortSignal.timeout(4500) });
    const raw = await response.text();
    let data: Record<string, unknown> = {};
    try { data = JSON.parse(raw) as Record<string, unknown>; } catch { /* handled as unavailable */ }
    const healthy = response.ok && ["ready", "healthy", "ok", "running"].includes(String(data.status || "").toLowerCase());
    let capabilities: unknown;
    if (healthy) {
      try { const cap = await requestWorker(worker, "/capabilities", { signal: AbortSignal.timeout(3500) }); if (cap.ok) capabilities = await cap.json(); } catch { /* optional */ }
    }
    return { id: worker.id, platform: worker.platform, priority: worker.priority, healthy,
      status: healthy ? String(data.status) : "unavailable", latencyMs: Date.now() - started,
      ...(capabilities === undefined ? {} : { capabilities }),
      ...(!response.ok ? { detail: "Health endpoint returned HTTP " + response.status } : {}) };
  } catch (error) {
    return { id: worker.id, platform: worker.platform, priority: worker.priority, healthy: false,
      status: "unreachable", latencyMs: Date.now() - started,
      detail: error instanceof Error ? error.message : "Health probe failed" };
  }
}
export const Route = createFileRoute("/api/ai-gateway")({
  server: { handlers: {
    GET: async ({ request }) => {
      if (!allowedOrigin(request)) return json({ error: "Cross-origin requests are not allowed." }, 403);
      const workers = loadWorkers();
      const statuses = await Promise.all(workers.map(probe));
      const healthy = statuses.filter((worker) => worker.healthy);
      return json({ service: "nkai-ai-gateway", version: 1, status: healthy.length ? "ready" : "degraded",
        configuredWorkers: workers.length, healthyWorkers: healthy.length,
        routing: "priority-order; healthy compatible worker first", workers: statuses,
        features: { healthChecks: true, automaticWorkerSelection: true, chatProxy: true, ttsProxy: true,
          liveTalkingProxy: true, persistentQueue: false, sessionMigration: false },
        note: workers.length ? undefined : "Configure AI_WORKER_INTERNAL_URL and AI_WORKER_API_TOKEN, or AI_GPU_WORKERS, as server-side secrets." });
    },
    POST: async ({ request }) => {
      if (!allowedOrigin(request)) return json({ error: "Cross-origin requests are not allowed." }, 403);
      if (!(request.headers.get("content-type") || "").includes("application/json")) return json({ error: "Expected application/json." }, 415);
      const length = Number(request.headers.get("content-length") || 0);
      if (length > 64_000) return json({ error: "Request body exceeds 64 KB." }, 413);
      let body: Record<string, unknown>;
      try { body = await request.json() as Record<string, unknown>; } catch { return json({ error: "Invalid JSON request body." }, 400); }
      const action = body.action;
      if (typeof action !== "string" || !(action in ACTION_PATHS)) {
        return json({ error: "Unsupported action. Use chat, tts, capabilities, health, live-offer, live-human, or live-interrupt." }, 400);
      }
      const path = ACTION_PATHS[action as GatewayAction];
      const workers = loadWorkers();
      if (!workers.length) return json({ error: "No GPU workers are configured.", code: "NO_WORKERS" }, 503);
      const payload = { ...body }; delete payload.action;
      const method = action === "capabilities" || action === "health" ? "GET" : "POST";
      // Do not replay a generation request after an ambiguous timeout: the first
      // worker may already have started inference. Failover is for connection failures.
      for (const worker of workers) {
        const health = await probe(worker);
        if (!health.healthy) continue;
        try {
          const upstream = await requestWorker(worker, path, {
            method, ...(method === "POST" ? { body: JSON.stringify(payload), signal: AbortSignal.timeout(120_000) } : {}),
          });
          const headers = new Headers();
          const contentType = upstream.headers.get("content-type");
          if (contentType) headers.set("content-type", contentType);
          headers.set("cache-control", "no-store"); headers.set("x-nkai-worker", worker.id);
          return new Response(upstream.body, { status: upstream.status, headers });
        } catch { continue; }
      }
      return json({ error: "No healthy GPU worker could accept this request.", code: "NO_HEALTHY_WORKERS" }, 503);
    },
  }},
});
