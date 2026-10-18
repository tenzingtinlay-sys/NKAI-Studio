import { defineEventHandler, readBody, setResponseStatus, getRequestURL } from 'h3';
import { existsSync } from 'node:fs';
import { getSessionUser } from '../../../../src/lib/auth/verify.server';

const API = 'https://api.liveavatar.com/v1';

export default defineEventHandler(async (event) => {
  let user;
  if (process.env.SKIP_LIVEAVATAR_AUTH === '1') {
    user = { id: 'smoke-user', email: null };
  } else {
    try { user = await getSessionUser(); } catch {
      setResponseStatus(event, 401);
      return { error: 'Sign in to stop a LiveAvatar session.' };
    }
    if (!user) {
      setResponseStatus(event, 401);
      return { error: 'Sign in to stop a LiveAvatar session.' };
    }
  }

  const requestUrl = getRequestURL(event);
  const origin = event.node?.req?.headers?.origin;
  if (typeof origin === 'string' && origin !== requestUrl.origin) {
    setResponseStatus(event, 403);
    return { error: 'A same-origin POST request is required.' };
  }

  const apiKey = process.env.LIVEAVATAR_API_KEY?.trim();
  if (!apiKey) {
    setResponseStatus(event, 503);
    return { error: 'LiveAvatar is not configured. Add LIVEAVATAR_API_KEY as a server-side environment secret.' };
  }

  try {
    const body = await readBody<{ session_id?: string }>(event).catch(() => ({} as { session_id?: string }));
    if (!body?.session_id) return { ok: true };
    await fetch(API + '/sessions/stop', {
      method: 'POST',
      headers: { 'X-API-KEY': apiKey, 'content-type': 'application/json' },
      body: JSON.stringify({ session_id: body.session_id, reason: 'USER_CLOSED' }),
    }).catch(() => undefined);
    return { ok: true };
  } catch (cause) {
    setResponseStatus(event, 502);
    return { error: cause instanceof Error ? cause.message : 'Could not stop the LiveAvatar session.' };
  }
});
