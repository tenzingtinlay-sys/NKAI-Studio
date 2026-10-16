import { createFileRoute } from "@tanstack/react-router";

type DuixRequest = {
  conversationId?: unknown;
  ttsName?: unknown;
  language?: unknown;
  name?: unknown;
  greetings?: unknown;
  profile?: unknown;
  source?: unknown;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export const Route = createFileRoute("/api/duix/create-avatar")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const origin = request.headers.get("origin");
        if (origin) {
          try {
            if (new URL(origin).origin !== new URL(request.url).origin) return json({ error: "Cross-origin requests are not allowed." }, 403);
          } catch { return json({ error: "Invalid Origin header." }, 403); }
        }
        const token = process.env.DUIX_API_TOKEN;
        if (!token) return json({ error: "Duix is not configured on this deployment. Set the server-side DUIX_API_TOKEN secret." }, 503);
        const contentType = request.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) return json({ error: "Expected application/json." }, 415);
        let body: DuixRequest;
        try { body = await request.json() as DuixRequest; }
        catch { return json({ error: "Invalid JSON request body." }, 400); }

        const conversationId = typeof body.conversationId === "string" ? body.conversationId.trim() : "";
        const ttsName = typeof body.ttsName === "string" ? body.ttsName.trim() : "";
        if (!conversationId || conversationId.length > 256) return json({ error: "A valid Duix conversationId is required." }, 400);
        if (!ttsName || ttsName.length > 100) return json({ error: "A valid Duix voice (ttsName) is required." }, 400);
        if (body.source === "photo") return json({ error: "Photo-upload creation is not enabled until the exact Duix photo-upload API fields are confirmed." }, 400);

        const payload: Record<string, string> = { conversationId, ttsName };
        for (const [key, value, max] of [
          ["name", body.name, 100],
          ["greetings", body.greetings, 1000],
          ["profile", body.profile, 10000],
        ] as const) {
          if (typeof value === "string" && value.trim()) {
            if (value.length > max) return json({ error: `${key} exceeds the ${max}-character limit.` }, 400);
            payload[key] = value.trim();
          }
        }

        try {
          const upstream = await fetch("https://app.duix.ai/duix-openapi-v2/sdk/v2/createAvatar", {
            method: "POST",
            headers: { "Content-Type": "application/json", token },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(45000),
          });
          const text = await upstream.text();
          let data: unknown;
          try { data = JSON.parse(text); } catch { data = { message: text.slice(0, 1500) }; }
          if (!upstream.ok) return json({ error: "Duix avatar creation request failed.", upstreamStatus: upstream.status, details: data }, upstream.status >= 500 ? 502 : upstream.status);
          return json(data, 200);
        } catch (error) {
          return json({ error: error instanceof Error && error.name === "TimeoutError" ? "Duix API timed out. Check your Duix account and retry." : "Could not reach the Duix API from the server." }, 502);
        }
      },
    },
  },
});
