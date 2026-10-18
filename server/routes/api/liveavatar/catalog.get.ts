import { defineEventHandler, getRequestURL, setResponseStatus } from "h3";
import { getSessionUser } from "../../../../src/lib/auth/verify.server";

const API = "https://api.liveavatar.com/v1";
type Item = { id: string; name?: string; is_expired?: boolean; [key: string]: unknown };
type Page = { data?: { results?: Item[]; next?: string | null; count?: number }; results?: Item[]; next?: string | null; message?: string };
// Supplied studio looks. Each orientation has its own provider avatar ID.
// These entries are shown even when the account catalogue endpoint does not enumerate them;
// session creation still validates availability with the provider before returning a token.
const STUDIO_LOOKS: Item[] = [
  { id: "9c59a215-4c9f-478f-9d95-edca74c7b0d0", name: "Alessandra in Black Suit · Landscape", type: "studio-look", tags: ["studio look", "landscape"], gender: female },
  { id: "de82b2cc-7314-40a1-b41f-cc456c66601c", name: "Alessandra in Black Suit · Portrait", type: "studio-look", tags: ["studio look", "portrait"], gender: female },
  { id: "ab0765ad-69de-41fb-9f8a-bd01c3c52d6f", name: "Alessandra in Grey Sweater · Landscape", type: "studio-look", tags: ["studio look", "landscape"], gender: female },
  { id: "63014563-22f7-4401-95db-034f3c992ec3", name: "Alessandra in Grey Sweater · Portrait", type: "studio-look", tags: ["studio look", "portrait"], gender: female },
  { id: "42700a53-38ab-4485-b46f-26be6e0953dc", name: "Amina in Black Suit · Landscape", type: "studio-look", tags: ["studio look", "landscape"], gender: female },
  { id: "06bcaebf-feeb-4e7a-8ab8-16b9f9537a19", name: "Amina in Black Suit · Portrait", type: "studio-look", tags: ["studio look", "portrait"], gender: female },
  { id: "bfed3e3e-7d44-4fdb-b2be-ce9a9fd0b9b5", name: "Amina in Blue Suit · Landscape", type: "studio-look", tags: ["studio look", "landscape"], gender: female },
  { id: "334c4101-4c2d-4aa4-9c4e-342867842608", name: "Amina in Blue Suit · Portrait", type: "studio-look", tags: ["studio look", "portrait"], gender: female },
  { id: "ebdfdc7e-7e2c-4d2c-8407-a78883e5000a", name: "Anastasia in Black Suit · Landscape", type: "studio-look", tags: ["studio look", "landscape"], gender: female },
  { id: "649e4023-7e82-4a01-af90-4476d75df75d", name: "Anastasia in Black Suit · Portrait", type: "studio-look", tags: ["studio look", "portrait"], gender: female },
  { id: "b4fc2d60-3b82-4694-b243-93e9d2bb0242", name: "Anastasia in Grey Shirt · Landscape", type: "studio-look", tags: ["studio look", "landscape"], gender: female },
  { id: "65ee9a5b-00ae-4c96-acf2-3326d9566467", name: "Anastasia in Grey Shirt · Portrait", type: "studio-look", tags: ["studio look", "portrait"], gender: female },
  { id: "38ad67ed-98f0-407c-a2d2-4f0998b306fc", name: "Anthony in Black Suit · Landscape", type: "studio-look", tags: ["studio look", "landscape"], gender: male },
  { id: "3466af9c-45f5-40f2-8392-c51f8385422c", name: "Anthony in Black Suit · Portrait", type: "studio-look", tags: ["studio look", "portrait"], gender: male },
  { id: "509609b9-cda3-4f74-b1b2-97b4d98834fd", name: "Anthony in White Suit · Landscape", type: "studio-look", tags: ["studio look", "landscape"], gender: male },
  { id: "b26c00a5-8861-4fd3-90cc-144791d2d81d", name: "Anthony in White Suit · Portrait", type: "studio-look", tags: ["studio look", "portrait"], gender: male },
  { id: "bb1f6ebc-b388-4a39-9e2b-8df618e0377c", name: "Graham in Black Shirt · Landscape", type: "studio-look", tags: ["studio look", "landscape"], gender: male },
  { id: "f0a9978d-634a-4063-8164-42ba6670542f", name: "Graham in Black Shirt · Portrait", type: "studio-look", tags: ["studio look", "portrait"], gender: male },
  { id: "03f8332d-9046-42a1-bff3-3b2309f77b58", name: "Graham in Black Suit · Landscape", type: "studio-look", tags: ["studio look", "landscape"], gender: male },
  { id: "fc4125a5-83fa-45e2-8574-bf657ac19998", name: "Graham in Black Suit · Portrait", type: "studio-look", tags: ["studio look", "portrait"], gender: male },
  { id: "26393b8e-e944-4367-98ef-e2bc75c4b792", name: "Katya in Black Suit · Landscape", type: "studio-look", tags: ["studio look", "landscape"], gender: female },
  { id: "260d706a-bf31-48fd-96d0-511553a9060e", name: "Katya in Black Suit · Portrait", type: "studio-look", tags: ["studio look", "portrait"], gender: female },
  { id: "09919247-f4b2-45d8-a75e-86fc2fceaebf", name: "Katya in Pink Suit · Landscape", type: "studio-look", tags: ["studio look", "landscape"], gender: female },
  { id: "69cf601f-b35b-4d1b-a701-c854d223b5a5", name: "Katya in Pink Suit · Portrait", type: "studio-look", tags: ["studio look", "portrait"], gender: female },
  { id: "f86e8b45-3389-424a-b3d7-7f6e8729e36d", name: "Marianne in Black Suit · Landscape", type: "studio-look", tags: ["studio look", "landscape"], gender: female },
  { id: "f0953388-a391-4518-945b-f2db3b602e77", name: "Marianne in Black Suit · Portrait", type: "studio-look", tags: ["studio look", "portrait"], gender: female },
  { id: "8532b602-89e8-44fa-a9e2-5a4259a058cc", name: "Marianne in Red Suit · Landscape", type: "studio-look", tags: ["studio look", "landscape"], gender: female },
  { id: "9d4d6cdd-38a1-448e-a336-1ac682ba6a27", name: "Marianne in Red Suit · Portrait", type: "studio-look", tags: ["studio look", "portrait"], gender: female },
  { id: "200eba85-74c0-4210-8670-81ceab4efd0d", name: "Pedro in Black Suit · Landscape", type: "studio-look", tags: ["studio look", "landscape"], gender: male },
  { id: "90a94dae-8df2-4b12-99a8-5bbc34c9551e", name: "Pedro in Black Suit · Portrait", type: "studio-look", tags: ["studio look", "portrait"], gender: male },
  { id: "7001c332-8101-4e5a-b695-eac2a72d9568", name: "Pedro in Blue Shirt · Landscape", type: "studio-look", tags: ["studio look", "landscape"], gender: male },
  { id: "9a5a4cb2-a32e-415f-8689-aa9d61acee1b", name: "Pedro in Blue Shirt · Portrait", type: "studio-look", tags: ["studio look", "portrait"], gender: male },
  { id: "075abc67-2fae-4548-8ca9-b815fcbd34c7", name: "Rika in Black Suit · Landscape", type: "studio-look", tags: ["studio look", "landscape"], gender: female },
  { id: "de16689a-234a-4334-b504-3b379d30daa1", name: "Rika in Black Suit · Portrait", type: "studio-look", tags: ["studio look", "portrait"], gender: female },
  { id: "0aae6046-0ab9-44fe-a08d-c5ac3f406d34", name: "Rika in Blue Suit · Landscape", type: "studio-look", tags: ["studio look", "landscape"], gender: female },
  { id: "5c6e2257-bb91-48f4-a75d-d4c9ad212af9", name: "Rika in Blue Suit · Portrait", type: "studio-look", tags: ["studio look", "portrait"], gender: female },
  { id: "16141106-96b5-4dd9-9846-593728c5d0ed", name: "Thaddeus in Black Shirt · Landscape", type: "studio-look", tags: ["studio look", "landscape"], gender: male },
  { id: "37521110-f8cf-4c34-b37e-bbb4f670711e", name: "Thaddeus in Black Shirt · Portrait", type: "studio-look", tags: ["studio look", "portrait"], gender: male },
  { id: "246e8d9d-5826-4f49-b8a0-07cb73ff7556", name: "Thaddeus in Black Suit · Landscape", type: "studio-look", tags: ["studio look", "landscape"], gender: male },
  { id: "6a1906e3-6caa-4aba-995f-c49088661560", name: "Thaddeus in Black Suit · Portrait", type: "studio-look", tags: ["studio look", "portrait"], gender: male },
];


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
    for (const avatar of [...publicAvatars, ...accountAvatars, ...STUDIO_LOOKS]) {
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
      studio_looks: STUDIO_LOOKS.length,
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
