import { defineEventHandler, getRequestURL, readBody, setResponseStatus } from "h3";
import { getSessionUser } from "../../../../src/lib/auth/verify.server";

const API_URL = "https://api.liveavatar.com";

export default defineEventHandler(async (event) => {
  let user;
  try {
    user = await getSessionUser();
  } catch {
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
  const avatarId = process.env.LIVEAVATAR_AVATAR_ID?.trim();
  const voiceId = process.env.LIVEAVATAR_VOICE_ID?.trim();
  const language = process.env.LIVEAVATAR_LANGUAGE?.trim() || "en";
  if (!apiKey || !avatarId || !voiceId) {
    setResponseStatus(event, 503);
    return { error: "LiveAvatar is not configured. Set LIVEAVATAR_API_KEY, LIVEAVATAR_AVATAR_ID, and LIVEAVATAR_VOICE_ID as server-side secrets." };
  }

  try {
    const body = (await readBody<{ mode?: unknown }>(event).catch(() => undefined)) ?? {};
    if (body?.mode !== "FULL") {
      setResponseStatus(event, 400);
      return { error: "Only the configured FULL LiveAvatar session mode is supported." };
    }
    const upstream = await fetch(API_URL + "/v1/sessions/token", {
      method: "POST",
      headers: { "X-API-KEY": apiKey, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        mode: "FULL",
        avatar_id: avatarId,
        avatar_persona: { voice_id: voiceId, language },
        is_sandbox: process.env.LIVEAVATAR_IS_SANDBOX !== "false",
      }),
      signal: AbortSignal.timeout(15000),
    });
    const payload = await upstream.json().catch(() => null) as { data?: { session_token?: string }; error?: string; message?: string } | null;
    const token = payload?.data?.session_token;
    if (!upstream.ok || typeof token !== "string" || !token) {
      setResponseStatus(event, upstream.ok ? 502 : upstream.status);
      return { error: payload?.error || payload?.message || "LiveAvatar did not return a session token." };
    }
    return { session_token: token };
  } catch {
    setResponseStatus(event, 502);
    return { error: "Could not reach the LiveAvatar API. Check server networking and configuration." };
  }
});
