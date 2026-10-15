const BLOCKED_LIVE_PLATFORMS = new Set(["google-colab", "colab", "kaggle", "kaggle-notebooks"]);

/**
 * Parse a server-only JSON worker pool. A provider is eligible for live routing
 * only when it explicitly opts in and is not a notebook-only platform.
 * Example entry: { id, platform, baseUrl, token, leaseHours, liveServingAllowed }.
 */
export function parseWorkerPool(env = process.env) {
  const raw = env.AI_WORKER_POOL_JSON?.trim();
  if (raw) {
    let parsed;
    try { parsed = JSON.parse(raw); } catch { throw new Error("AI_WORKER_POOL_JSON must be valid JSON."); }
    if (!Array.isArray(parsed)) throw new Error("AI_WORKER_POOL_JSON must be a JSON array.");
    return parsed.filter((item) => {
      if (!item || typeof item !== "object" || item.enabled === false) return false;
      const platform = String(item.platform || "").trim().toLowerCase();
      if (BLOCKED_LIVE_PLATFORMS.has(platform) || item.liveServingAllowed !== true) return false;
      if (typeof item.id !== "string" || !item.id.trim()) return false;
      if (typeof item.baseUrl !== "string") return false;
      let url;
      try { url = new URL(item.baseUrl); } catch { return false; }
      if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return false;
      const leaseHours = Number(item.leaseHours);
      if (!Number.isFinite(leaseHours) || leaseHours <= 0 || leaseHours > 24) return false;
      return true;
    }).map((item) => ({
      id: item.id.trim(),
      platform: String(item.platform || "custom").trim().toLowerCase(),
      baseUrl: item.baseUrl.replace(/\/+$/, ""),
      token: typeof item.token === "string" ? item.token : "",
      leaseHours: Number(item.leaseHours),
      priority: Number.isFinite(Number(item.priority)) ? Number(item.priority) : 100,
    })).sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
  }

  // Backwards-compatible single-worker configuration.
  const baseUrl = env.AI_WORKER_INTERNAL_URL?.trim();
  if (!baseUrl) return [];
  let url;
  try { url = new URL(baseUrl); } catch { return []; }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return [];
  return [{
    id: "legacy-default",
    platform: "custom",
    baseUrl: baseUrl.replace(/\/+$/, ""),
    token: env.AI_WORKER_API_TOKEN?.trim() || "",
    leaseHours: 24,
    priority: 0,
  }];
}

/** Time-window ordering is deterministic across stateless/serverless instances. */
export function orderWorkersForTimeSlot(workers, nowMs = Date.now()) {
  if (!workers.length) return [];
  const totalMs = workers.reduce((sum, worker) => sum + worker.leaseHours * 60 * 60 * 1000, 0);
  let cursor = ((nowMs % totalMs) + totalMs) % totalMs;
  let activeIndex = 0;
  for (let index = 0; index < workers.length; index += 1) {
    const windowMs = workers[index].leaseHours * 60 * 60 * 1000;
    if (cursor < windowMs) { activeIndex = index; break; }
    cursor -= windowMs;
  }
  return [...workers.slice(activeIndex), ...workers.slice(0, activeIndex)];
}

export function workerEndpoint(worker, endpoint) {
  return worker.baseUrl + "/" + endpoint;
}
