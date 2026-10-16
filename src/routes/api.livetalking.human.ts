import { createFileRoute } from "@tanstack/react-router";
import { proxyLiveTalking } from "@/../server/utils/livetalking-proxy";

export const Route = createFileRoute("/api/livetalking/human")({
  server: { handlers: { POST: async ({ request }) => {
    const origin = request.headers.get("origin");
    if (origin) {
      try { if (new URL(origin).origin !== new URL(request.url).origin) return Response.json({ error: "Cross-origin requests are not allowed." }, { status: 403 }); }
      catch { return Response.json({ error: "Invalid Origin header." }, { status: 403 }); }
    }
    if (!(request.headers.get("content-type") || "").includes("application/json")) return Response.json({ error: "Expected application/json." }, { status: 415 });
    let body: Record<string, unknown>;
    try { body = await request.json() as Record<string, unknown>; } catch { return Response.json({ error: "Invalid JSON." }, { status: 400 }); }
    if (typeof body.sessionid !== "string" || !body.sessionid.trim()) return Response.json({ error: "sessionid is required." }, { status: 400 });
    if (typeof body.text !== "string" || !body.text.trim()) return Response.json({ error: "text is required." }, { status: 400 });
    return proxyLiveTalking("/human", body);
  }}}
});
