import { defineEventHandler, getRequestURL, readBody, setResponseStatus } from "h3";
import { getSessionUser } from "../../../../src/lib/auth/verify.server";

const API_URL = "https://api.liveavatar.com";
type LiveAvatarItem = { id: string; name?: string; is_expired?: boolean };
type ApiPage = { data?: { results?: LiveAvatarItem[]; next?: string | null }; message?: string; error?: string };

async function collect(path: string, apiKey: string): Promise<LiveAvatarItem[]> {
  let next: URL | null = new URL(API_URL + "/v1" + path);
  next.searchParams.set("page_size", "100");
  const items: LiveAvatarItem[] = [];
  const seen = new Set<string>();
  for (let page = 0; next && page < 30; page++) {
    if (next.origin !== API_URL || !next.pathname.startsWith("/v1/")) throw new Error("Unexpected LiveAvatar pagination URL.");
    if (seen.has(next.href)) break;
    seen.add(next.href);
    const response = await fetch(next, { headers: { "X-API-KEY": apiKey, Accept: "application/json" }, signal: AbortSignal.timeout(12000) });
    const payload = await response.json().catch(() => ({})) as ApiPage;
    if (!response.ok) throw new Error(payload.message || payload.error || "LiveAvatar catalog validation failed (HTTP " + response.status + ").");
    const data = payload.data;
    if (Array.isArray(data?.results)) items.push(...data.results);
    next = typeof data?.next === "string" && data.next ? new URL(data.next, API_URL) : null;
  }
  return items;
}

const TONES: Record<string, string> = {
  warm: "Be warm, supportive, empathetic, and encouraging. Use natural conversational language.",
  professional: "Be professional, concise, clear, and respectful. Focus on practical next steps.",
  calm: "Be calm, thoughtful, patient, and measured. Avoid rushing the conversation.",
  energetic: "Be upbeat, optimistic, lively, and motivating without being overwhelming.",
  friendly: "Be friendly, relaxed, approachable, and conversational.",
};

export default defineEventHandler(async (event) => {
  let user;
  try { user = await getSessionUser(); } catch {
    setResponseStatus(event, 401);
    return { error: "Sign in to start a LiveAvatar session." };
  }
  if (!user) {
    setResponseStatus(event, 401);
    return { error: "Sign in to start a LiveAvatar session." };
  }

  const requestUrl = getRequestURL(event);
  const origin = event.node?.req?.headers?.origin;
  if (event.method !== "POST" || typeof origin !== "string" || origin !== requestUrl.origin) {
    setResponseStatus(event, 403);
    return { error: "A same-origin POST request is required." };
  }
  const contentType = String(event.node?.req?.headers?.["content-type"] || "").split(";")[0].trim().toLowerCase();
  if (contentType !== "application/json") {
    setResponseStatus(event, 415);
    return { error: "Content-Type must be application/json." };
  }

  const apiKey = process.env.LIVEAVATAR_API_KEY?.trim();
  if (!apiKey) {
    setResponseStatus(event, 503);
    return { error: "LiveAvatar is not configured. Set LIVEAVATAR_API_KEY as a server-side secret." };
  }

  try {
    const body = await readBody<{ mode?: unknown; avatar_id?: unknown; voice_id?: unknown; language?: unknown; tone?: unknown }>(event).catch(() => ({} as { mode?: unknown; avatar_id?: unknown; voice_id?: unknown; language?: unknown; tone?: unknown }));
    if (body?.mode !== "FULL") {
      setResponseStatus(event, 400);
      return { error: "Only FULL LiveAvatar sessions are supported." };
    }
    const avatarId = typeof body.avatar_id === "string" ? body.avatar_id.trim() : "";
    const voiceId = typeof body.voice_id === "string" ? body.voice_id.trim() : "";
    const language = typeof body.language === "string" && /^[a-z]{2,3}(?:-[A-Z]{2})?$/.test(body.language) ? body.language : (process.env.LIVEAVATAR_LANGUAGE?.trim() || "en");
    const tone = typeof body.tone === "string" && TONES[body.tone] ? body.tone : "warm";
    if (!avatarId || avatarId.length > 128) {
      setResponseStatus(event, 400);
      return { error: "Choose an avatar from the LiveAvatar catalogue first." };
    }

    // Confirm the selected avatar is visible to this API key; never silently replace it with a different face.
    const [publicAvatars, accountAvatars] = await Promise.all([
      collect("/avatars/public", apiKey),
      collect("/avatars", apiKey),
    ]);
    const selected = [...publicAvatars, ...accountAvatars].find((item) => item.id === avatarId && !item.is_expired);
    if (!selected) {
      setResponseStatus(event, 400);
      return { error: "That avatar is unavailable to this LiveAvatar account. Reload the catalogue and choose another." };
    }

    const sandbox = process.env.LIVEAVATAR_IS_SANDBOX !== "false";
    const sandboxAvatarId = "dd73ea75-1218-4ef3-92ce-606d5f7fbc0a";
    if (sandbox && avatarId !== sandboxAvatarId) {
      setResponseStatus(event, 400);
      return { error: "LiveAvatar sandbox mode only supports the Wayne test avatar. To use your selected avatar from the full catalogue, set LIVEAVATAR_IS_SANDBOX=false on the server; production sessions may consume account credits." };
    }

    const contextsResponse = await fetch(API_URL + "/v1/contexts?page_size=100", {
      headers: { "X-API-KEY": apiKey, Accept: "application/json" },
      signal: AbortSignal.timeout(12000),
    });
    const contextsPayload = await contextsResponse.json().catch(() => ({})) as { data?: { results?: { id?: string; name?: string }[] }; message?: string };
    if (!contextsResponse.ok) throw new Error(contextsPayload.message || "Could not read LiveAvatar conversation contexts.");
    const contextName = "NKAI Studio " + tone;
    let contextId = contextsPayload.data?.results?.find((context) => context.name === contextName)?.id;
    if (!contextId) {
      const created = await fetch(API_URL + "/v1/contexts", {
        method: "POST",
        headers: { "X-API-KEY": apiKey, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          name: contextName,
          prompt: "You are the live conversational avatar inside NKAI Studio. " + TONES[tone] + " Speak in the selected language. Listen to the user's intent, answer naturally, and ask one useful follow-up when appropriate. Do not claim to see, know, or do things that are not available in the session.",
          opening_text: "Hello! I’m your NKAI Studio conversation partner. What would you like to talk about?",
        }),
        signal: AbortSignal.timeout(12000),
      });
      const createdPayload = await created.json().catch(() => ({})) as { data?: { id?: string }; message?: string };
      if (!created.ok || !createdPayload.data?.id) throw new Error(createdPayload.message || "Could not create the LiveAvatar conversation style.");
      contextId = createdPayload.data.id;
    }

    const response = await fetch(API_URL + "/v1/sessions/token", {
      method: "POST",
      headers: { "X-API-KEY": apiKey, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        mode: "FULL",
        avatar_id: avatarId,
        interactivity_type: "CONVERSATIONAL",
        avatar_persona: {
          ...(voiceId ? { voice_id: voiceId } : {}),
          language,
          context_id: contextId,
        },
        is_sandbox: sandbox,
      }),
      signal: AbortSignal.timeout(15000),
    });
    const payload = await response.json().catch(() => null) as { data?: { session_token?: string }; error?: string; message?: string } | null;
    const token = payload?.data?.session_token;
    if (!response.ok || typeof token !== "string" || !token) {
      setResponseStatus(event, response.ok ? 502 : response.status);
      return { error: payload?.error || payload?.message || "LiveAvatar did not return a session token." };
    }
    return { session_token: token, sandbox };
  } catch (cause) {
    setResponseStatus(event, 502);
    return { error: cause instanceof Error ? cause.message : "Could not reach the LiveAvatar API." };
  }
});
