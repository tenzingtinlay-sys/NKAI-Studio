import { createFileRoute } from "@tanstack/react-router";
import { getAIWorkerStatuses } from "@/../server/utils/ai-gateway-worker";

export const Route = createFileRoute("/api/ai/tts-capabilities")({
  server: { handlers: { GET: async () => {
    const workers = await getAIWorkerStatuses();
    const ready = workers.filter((worker) => worker.healthy);
    const capabilities = ready.map((worker) => {
      const value = worker.capabilities as Record<string, unknown> | undefined;
      return { worker: worker.id, ...(value || {}) };
    });
    const first = capabilities[0] || {};
    return Response.json({
      status: ready.length ? "ready" : "degraded",
      workers: workers.map(({ id, platform, healthy, status }) => ({ id, platform, healthy, status })),
      chat: (first.chat as unknown) || { ready: false },
      tts: (first.tts as unknown) || { ready: false, detail: "No ready worker advertises TTS capability." },
      capabilities,
    }, { headers: { "cache-control": "no-store" } });
  }}}
});
