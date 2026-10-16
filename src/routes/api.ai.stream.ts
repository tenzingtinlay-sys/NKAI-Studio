import { createFileRoute } from "@tanstack/react-router";
import { proxyAIRequest, sameOrigin } from "@/../server/utils/ai-gateway-worker";

export const Route = createFileRoute("/api/ai/stream")({
  server: { handlers: { POST: async ({ request }) => {
    if (!sameOrigin(request)) return Response.json({ error: "Cross-origin requests are not allowed." }, { status: 403 });
    if (!(request.headers.get("content-type") || "").includes("application/json")) return Response.json({ error: "Expected application/json." }, { status: 415 });
    const length = Number(request.headers.get("content-length") || 0);
    if (length > 64_000) return Response.json({ error: "Request body exceeds 64 KB." }, { status: 413 });
    let body: Record<string, unknown>;
    try { body = await request.json() as Record<string, unknown>; } catch { return Response.json({ error: "Invalid JSON." }, { status: 400 }); }
    if (typeof body.message !== "string" || !body.message.trim()) return Response.json({ error: "A message is required." }, { status: 400 });
    const result = await proxyAIRequest("/chat/stream", body);
    return result;
  }}}
});
