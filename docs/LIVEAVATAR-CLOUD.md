# NKAI Studio: HeyGen LiveAvatar Cloud

The landing page now includes a **HeyGen LiveAvatar** tab. It loads the public and account avatar catalogues plus public voices from the server, then lets a signed-in user choose an avatar, voice, language, and conversation tone before starting a hosted live session.

## Server configuration

Set the following as server-side deployment secrets/environment variables. Never use a `VITE_` prefix or expose the API key to the browser.

- `LIVEAVATAR_API_KEY`: API key for the LiveAvatar API product.
- `LIVEAVATAR_IS_SANDBOX`: defaults to sandbox mode unless explicitly set to `false`.
- `LIVEAVATAR_LANGUAGE`: optional fallback language; defaults to `en`.

The older `LIVEAVATAR_AVATAR_ID` and `LIVEAVATAR_VOICE_ID` settings are optional defaults only; the landing-page selector sends the user's chosen IDs to the server.

## Request flow and security

- `GET /api/liveavatar/catalog` requires a signed-in user and reads public/account avatars and public voices using server-side `LIVEAVATAR_API_KEY`.
- Catalog pagination is followed with a bounded page count; expired avatars are omitted and duplicate IDs are deduplicated.
- `POST /api/liveavatar/session` requires a signed-in user and same-origin JSON POST.
- The server verifies the selected avatar is visible to the API key, creates/reuses a tone-specific conversation context, and exchanges the API key for a short-lived session token.
- Only the short-lived session token is passed to `@heygen/liveavatar-web-sdk`. The API key never reaches the browser.

## Sandbox versus full catalogue

LiveAvatar sandbox mode is conservative and only supports the Wayne test avatar. If `LIVEAVATAR_IS_SANDBOX` is unset or not `false`, choosing another avatar returns an explicit message instead of silently switching faces. To use the selected avatar from the full catalogue, set `LIVEAVATAR_IS_SANDBOX=false` on the server deployment. Non-sandbox sessions may consume account credits; check the account's current plan before testing.

The tone selector maps to a server-managed conversation context (warm, professional, calm, energetic, or friendly). Gender filtering uses provider metadata when present; if the provider does not supply gender metadata for a particular avatar, that avatar is shown under the unspecified category rather than guessed.

## Limits and verification

LiveAvatar is a hosted service and is separate from the local Qwen/LiveTalking worker. Account API access, a supported avatar and voice, internet connectivity, and available plan credits are required. The UI reports API and session errors instead of claiming that video is live. Confirm a real browser session with received video/audio before considering streaming verified.

Upstream SDK: https://github.com/heygen-com/liveavatar-web-sdk
API documentation: https://docs.liveavatar.com
