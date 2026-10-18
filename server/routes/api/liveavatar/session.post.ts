import { defineEventHandler, getRequestURL, readBody, setResponseStatus } from "h3";
import { liveAvatarAllowed } from "../../../utils/liveavatar-access";

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

const STUDIO_LOOK_IDS = new Set([
  "9c59a215-4c9f-478f-9d95-edca74c7b0d0",
  "de82b2cc-7314-40a1-b41f-cc456c66601c",
  "ab0765ad-69de-41fb-9f8a-bd01c3c52d6f",
  "63014563-22f7-4401-95db-034f3c992ec3",
  "42700a53-38ab-4485-b46f-26be6e0953dc",
  "06bcaebf-feeb-4e7a-8ab8-16b9f9537a19",
  "bfed3e3e-7d44-4fdb-b2be-ce9a9fd0b9b5",
  "334c4101-4c2d-4aa4-9c4e-342867842608",
  "ebdfdc7e-7e2c-4d2c-8407-a78883e5000a",
  "649e4023-7e82-4a01-af90-4476d75df75d",
  "b4fc2d60-3b82-4694-b243-93e9d2bb0242",
  "65ee9a5b-00ae-4c96-acf2-3326d9566467",
  "38ad67ed-98f0-407c-a2d2-4f0998b306fc",
  "3466af9c-45f5-40f2-8392-c51f8385422c",
  "509609b9-cda3-4f74-b1b2-97b4d98834fd",
  "b26c00a5-8861-4fd3-90cc-144791d2d81d",
  "bb1f6ebc-b388-4a39-9e2b-8df618e0377c",
  "f0a9978d-634a-4063-8164-42ba6670542f",
  "03f8332d-9046-42a1-bff3-3b2309f77b58",
  "fc4125a5-83fa-45e2-8574-bf657ac19998",
  "26393b8e-e944-4367-98ef-e2bc75c4b792",
  "260d706a-bf31-48fd-96d0-511553a9060e",
  "09919247-f4b2-45d8-a75e-86fc2fceaebf",
  "69cf601f-b35b-4d1b-a701-c854d223b5a5",
  "f86e8b45-3389-424a-b3d7-7f6e8729e36d",
  "f0953388-a391-4518-945b-f2db3b602e77",
  "8532b602-89e8-44fa-a9e2-5a4259a058cc",
  "9d4d6cdd-38a1-448e-a336-1ac682ba6a27",
  "200eba85-74c0-4210-8670-81ceab4efd0d",
  "90a94dae-8df2-4b12-99a8-5bbc34c9551e",
  "7001c332-8101-4e5a-b695-eac2a72d9568",
  "9a5a4cb2-a32e-415f-8689-aa9d61acee1b",
  "075abc67-2fae-4548-8ca9-b815fcbd34c7",
  "de16689a-234a-4334-b504-3b379d30daa1",
  "0aae6046-0ab9-44fe-a08d-c5ac3f406d34",
  "5c6e2257-bb91-48f4-a75d-d4c9ad212af9",
  "16141106-96b5-4dd9-9846-593728c5d0ed",
  "37521110-f8cf-4c34-b37e-bbb4f670711e",
  "246e8d9d-5826-4f49-b8a0-07cb73ff7556",
  "6a1906e3-6caa-4aba-995f-c49088661560",
]);

const TONES: Record<string, string> = {
  warm: "Be warm, supportive, empathetic, and encouraging. Use natural conversational language.",
  professional: "Be professional, concise, clear, and respectful. Focus on practical next steps.",
  calm: "Be calm, thoughtful, patient, and measured. Avoid rushing the conversation.",
  energetic: "Be upbeat, optimistic, lively, and motivating without being overwhelming.",
  friendly: "Be friendly, relaxed, approachable, and conversational.",
};

export default defineEventHandler(async (event) => {
   if (!(await liveAvatarAllowed())) {
    setResponseStatus(event, 401);
    return { error: "Live avatars are restricted. The owner must enable LIVEAVATAR_ALLOW_ANONYMOUS or add sign-in." };
  }

  const requestUrl = getRequestURL(event);
  const origin = event.node?.req?.headers?.origin;
    let sameOrigin = false;
  try {
    sameOrigin = typeof origin === "string" && new URL(origin).host === requestUrl.host;
  } catch {
    sameOrigin = false;
  }
  if (event.method !== "POST" || !sameOrigin) {
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
    // Supplied studio-look IDs may not be enumerated by the account list endpoint.
    // Allow only this explicit allowlist through to session-token creation; the provider
    // remains the final authority and its token response is still checked below.
    if (!selected && !STUDIO_LOOK_IDS.has(avatarId)) {
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
