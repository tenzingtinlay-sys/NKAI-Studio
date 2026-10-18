export type Avatar = { id: string; name?: string; preview_url?: string; is_expired?: boolean; default_voice?: { id?: string } };
export type Voice = { id: string; name?: string; language?: string; gender?: string; tags?: string[] | string; description?: string };

async function fetchJson(path: string, opts?: RequestInit) {
  const res = await fetch(path, opts);
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(payload.error || payload.message || `HTTP ${res.status}`);
  return payload;
}

export async function listCatalog(): Promise<{ avatars: Avatar[]; voices: Voice[]; counts?: { avatars?: number; voices?: number } }> {
  return fetchJson('/api/liveavatar/catalog');
}

export type StartInput = { language?: string; language_name?: string; voice_id?: string; avatar_id?: string; topic?: string };
export async function startSession(input: { data: StartInput }) {
  return fetchJson('/api/liveavatar/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
}

export async function stopSession(input: { data: { session_id?: string } }) {
  return fetchJson('/api/liveavatar/stop', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
}
