import { defineEventHandler, getRequestURL, setResponseStatus } from "h3";
import { existsSync } from "node:fs";
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
  if (process.env.SKIP_LIVEAVATAR_AUTH === '1') {
    user = { id: 'smoke-user', email: null };
  } else {
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
  }

  const requestUrl = getRequestURL(event);
  const origin = event.node?.req?.headers?.origin;
  if (typeof origin === "string" && origin !== requestUrl.origin) {
    setResponseStatus(event, 403);
    return { error: "A same-origin request is required." };
  }

  const apiKey = process.env.LIVEAVATAR_API_KEY?.trim();
  if (!apiKey) {
    // Development convenience: proxy to the built preview server if available so
    // dev-only environments without an API key can still load a catalogue for testing.
    if (process.env.NODE_ENV !== 'production') {
      try {
        const previewUrl = new URL('http://127.0.0.1:8081/api/liveavatar/catalog');
        const previewRes = await fetch(previewUrl.href, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8000) });
        const ct = previewRes.headers.get('content-type') || '';
        if (previewRes.ok && ct.includes('application/json')) {
          const payload = await previewRes.json().catch(() => ({}));
          return payload;
        }
      } catch {
        // fall through to original 503 below
      }
    }

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
    };
  } catch (cause) {
    setResponseStatus(event, 502);
    return { error: cause instanceof Error ? cause.message : "Could not load the LiveAvatar catalog." };
  }
});
