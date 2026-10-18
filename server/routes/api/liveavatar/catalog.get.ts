import { defineEventHandler, getRequestURL, setResponseStatus } from "h3";
import { getSessionUser } from "../../../../src/lib/auth/verify.server";

const API = "https://api.liveavatar.com/v1";
type Item = { id: string; name?: string; is_expired?: boolean; [key: string]: unknown };
type Page = { data?: { results?: Item[]; next?: string | null; count?: number }; results?: Item[]; next?: string | null; message?: string };

async function getPage(url: URL, key: string): Promise<Page> {
  const response = await fetch(url, {
    headers: { "X-API-KEY": key, Accept: "application/json" },
    signal: AbortSignal.timeout(12000),
  });
  const payload = await response.json().catch(() => ({})) as Page;
  if (!response.ok) {
    throw new Error(typeof payload.message === "string" ? payload.message : "LiveAvatar catalog request failed (HTTP " + response.status + ").");
  }
  return payload;
}

async function collect(path: string, key: string): Promise<Item[]> {
  const first = new URL(API + "/" + path.replace(/^\/+/, ""));
  first.searchParams.set("page_size", "100");
  const output: Item[] = [];
  const seenPages = new Set<string>();
  let next: URL | null = first;
  for (let page = 0; next && page < 30; page++) {
    if (next.origin !== new URL(API).origin || !next.pathname.startsWith("/v1/")) {
      throw new Error("LiveAvatar returned an unexpected pagination URL.");
    }
    if (seenPages.has(next.href)) break;
    seenPages.add(next.href);
    const payload = await getPage(next, key);
    const data = payload.data ?? payload;
    if (Array.isArray(data.results)) output.push(...data.results);
    const candidate = data.next;
    next = typeof candidate === "string" && candidate
      ? new URL(candidate, API)
      : null;
  }
  return output;
}

export default defineEventHandler(async (event) => {
  let user;
  try {
    user = await getSessionUser();
  } catch {
    setResponseStatus(event, 401);
    return { error: "Sign in to load the LiveAvatar catalog." };
  }
  if (!user) {
    setResponseStatus(event, 401);
    return { error: "Sign in to load the LiveAvatar catalog." };
  }

  const requestUrl = getRequestURL(event);
  const origin = event.node?.req?.headers?.origin;
  if (typeof origin === "string" && origin !== requestUrl.origin) {
    setResponseStatus(event, 403);
    return { error: "A same-origin request is required." };
  }

  const apiKey = process.env.LIVEAVATAR_API_KEY?.trim();
  if (!apiKey) {
    setResponseStatus(event, 503);
    return { error: "LiveAvatar is not configured. Add LIVEAVATAR_API_KEY as a server-side environment secret." };
  }

  try {
    const [publicAvatars, accountAvatars, voices] = await Promise.all([
      collect("/avatars/public", apiKey),
      collect("/avatars", apiKey),
      collect("/voices?voice_type=public", apiKey),
    ]);
    const unique = new Map<string, Item>();
    for (const avatar of [...publicAvatars, ...accountAvatars]) {
      if (avatar && typeof avatar.id === "string" && !avatar.is_expired) unique.set(avatar.id, avatar);
    }
    const uniqueVoices = new Map<string, Item>();
    for (const voice of voices) {
      if (voice && typeof voice.id === "string") uniqueVoices.set(voice.id, voice);
    }
    return {
      avatars: [...unique.values()],
      voices: [...uniqueVoices.values()],
      counts: { avatars: unique.size, voices: uniqueVoices.size },
      // Sandbox session creation only accepts the official Wayne test avatar.
      // Expose the mode so the client never auto-selects an avatar that the API will reject.
      sandbox: process.env.LIVEAVATAR_IS_SANDBOX !== "false",
      sandbox_avatar_id: "dd73ea75-1218-4ef3-92ce-606d5f7fbc0a",
    };
  } catch (cause) {
    setResponseStatus(event, 502);
    return { error: cause instanceof Error ? cause.message : "Could not load the LiveAvatar catalog." };
  }
});
