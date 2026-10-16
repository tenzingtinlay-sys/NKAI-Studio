
export function getLiveTalkingConfig() {
  const baseUrl = (process.env.LIVETALKING_INTERNAL_URL || "").trim();
  const token = (process.env.LIVETALKING_API_TOKEN || "").trim();
  if (!baseUrl) return null;
  try {
    const url = new URL(baseUrl);
    if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") return null;
    if (url.username || url.password || url.search || url.hash) return null;
    return { baseUrl: url.origin + url.pathname.replace(/\/$/, ""), token };
  } catch { return null; }
}

export async function proxyLiveTalking(path: string, requestBody: unknown) {
  const config = getLiveTalkingConfig();
  if (!config) return Response.json({ error: "LiveTalking is not configured. Set LIVETALKING_INTERNAL_URL as a server-side secret." }, { status: 503 });
  try {
    const response = await fetch(config.baseUrl + path, {
      method: "POST",
      headers: { "content-type": "application/json", ...(config.token ? { authorization: "Bearer " + config.token } : {}) },
      body: JSON.stringify(requestBody),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(30_000),
    });
    const contentType = response.headers.get("content-type") || "application/json";
    return new Response(response.body, { status: response.status, headers: { "content-type": contentType, "cache-control": "no-store" } });
  } catch (error) {
    return Response.json({ error: "Could not reach the LiveTalking worker.", detail: error instanceof Error ? error.message : "network error" }, { status: 502 });
  }
}
