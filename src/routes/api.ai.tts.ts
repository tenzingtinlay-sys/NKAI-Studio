import { createFileRoute } from "@tanstack/react-router";
import { proxyAIRequest, sameOrigin } from "@/../server/utils/ai-gateway-worker";

export const Route = createFileRoute("/api/ai/tts")({
  server: { handlers: { POST: async ({ request }) => {
    if (!sameOrigin(request)) return Response.json({ error: "Cross-origin requests are not allowed." }, { status: 403 });
    if (!(request.headers.get("content-type") || "").includes("application/json")) return Response.json({ error: "Expected application/json." }, { status: 415 });
    let body: Record<string, unknown>;
    try { body = await request.json() as Record<string, unknown>; } catch { return Response.json({ error: "Invalid JSON." }, { status: 400 }); }
    if (typeof body.text !== "string" || !body.text.trim()) return Response.json({ error: "Text is required." }, { status: 400 });
    return proxyAIRequest("/tts", body);
  }}}
});
