import { getSessionUser } from "../../src/lib/auth/verify.server";

/**
 * Live avatars are open only when LIVEAVATAR_ALLOW_ANONYMOUS=true is set on the server.
 * Otherwise a signed-in session is required, as before.
 */
export async function liveAvatarAllowed(): Promise<boolean> {
  if (process.env.LIVEAVATAR_ALLOW_ANONYMOUS?.trim() === "true") return true;
  try {
    return Boolean(await getSessionUser());
  } catch {
    return false;
  }
}
