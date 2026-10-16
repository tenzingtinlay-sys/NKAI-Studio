import { createFileRoute } from "@tanstack/react-router";
import { getAIWorkerStatuses } from "@/../server/utils/ai-gateway-worker";

export const Route = createFileRoute("/api/ai/health")({
  server: { handlers: { GET: async () => {
    const workers = await getAIWorkerStatuses();
    const healthy = workers.filter((worker) => worker.healthy);
    return Response.json({
      status: healthy.length ? "ready" : "degraded",
      model: healthy.map((worker) => worker.id).join(", ") || undefined,
      configuredWorkers: workers.length,
      healthyWorkers: healthy.length,
      workers,
    }, { headers: { "cache-control": "no-store" } });
  }}}
});
