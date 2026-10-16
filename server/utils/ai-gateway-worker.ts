type WorkerConfig = { id: string; platform: string; baseUrl: string; token: string; priority: number };
export type WorkerStatus = { id: string; platform: string; priority: number; healthy: boolean; status: string; latencyMs?: number; capabilities?: unknown; detail?: string };

function env(name: string) { try { return (process.env[name] || "").trim(); } catch { return ""; } }

export function getAIWorkers(): WorkerConfig[] {
  const raw = env("AI_GPU_WORKERS");
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
  const baseUrl = env("AI_WORKER_INTERNAL_URL"), token = env("AI_WORKER_API_TOKEN");
  if (!baseUrl || !token) return [];
  try {
    const url = new URL(baseUrl);
    if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") return [];
    if (url.username || url.password || url.search || url.hash) return [];
    return [{ id: "primary", platform: env("AI_WORKER_PLATFORM") || "self-hosted",
      baseUrl: url.origin + url.pathname.replace(/\/$/, ""), token, priority: 0 }];
  } catch { return []; }
}

export async function probeAIWorker(worker: WorkerConfig): Promise<WorkerStatus> {
  const started = Date.now();
  try {
    const response = await fetch(worker.baseUrl + "/health", {
      headers: { authorization: "Bearer " + worker.token }, cache: "no-store", redirect: "error",
      signal: AbortSignal.timeout(4500),
    });
    const raw = await response.text();
    let data: Record<string, unknown> = {};
    try { data = JSON.parse(raw) as Record<string, unknown>; } catch { /* invalid response */ }
    const healthy = response.ok && ["ready", "healthy", "ok", "running"].includes(String(data.status || "").toLowerCase());
    let capabilities: unknown;
    if (healthy) {
      try {
        const cap = await fetch(worker.baseUrl + "/capabilities", {
          headers: { authorization: "Bearer " + worker.token }, cache: "no-store", redirect: "error",
          signal: AbortSignal.timeout(3000),
        });
        if (cap.ok) capabilities = await cap.json();
      } catch { /* capabilities are optional for health */ }
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

export async function getAIWorkerStatuses() {
  return Promise.all(getAIWorkers().map(probeAIWorker));
}

export async function proxyAIRequest(path: string, body: unknown, method: "GET" | "POST" = "POST"): Promise<Response> {
  const workers = getAIWorkers();
  if (!workers.length) return Response.json({ error: "No GPU workers are configured.", code: "NO_WORKERS" }, { status: 503 });
  for (const worker of workers) {
    const status = await probeAIWorker(worker);
    if (!status.healthy) continue;
    try {
      const upstream = await fetch(worker.baseUrl + path, {
        method,
        headers: { authorization: "Bearer " + worker.token, ...(method === "POST" ? { "content-type": "application/json" } : {}) },
        ...(method === "POST" ? { body: JSON.stringify(body) } : {}),
        cache: "no-store", redirect: "error", signal: AbortSignal.timeout(120_000),
      });
      const headers = new Headers();
      const contentType = upstream.headers.get("content-type");
      if (contentType) headers.set("content-type", contentType);
      headers.set("cache-control", "no-store");
      headers.set("x-nkai-worker", worker.id);
      return new Response(upstream.body, { status: upstream.status, headers });
    } catch {
      // Retry another provider only if no upstream response was received.
    }
  }
  return Response.json({ error: "No healthy GPU worker could accept this request.", code: "NO_HEALTHY_WORKERS" }, { status: 503 });
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try { return new URL(origin).origin === new URL(request.url).origin; } catch { return false; }
}
