# LiveAvatar Cloud in NKAI Studio

The LiveAvatar Web SDK source archive is preserved under `vendor/liveavatar-web-sdk/` (MIT-licensed upstream SDK and demos). NKAI Studio's integrated entry is **Create → LiveAvatar Cloud**.

## Server configuration

Set these as server-side deployment secrets/environment variables; never use `VITE_*` or expose the API key to the browser:

- `LIVEAVATAR_API_KEY`: API key from your LiveAvatar account.
- `LIVEAVATAR_AVATAR_ID`: avatar UUID supported by your account.
- `LIVEAVATAR_VOICE_ID`: voice UUID for Full Mode.
- `LIVEAVATAR_LANGUAGE`: language code; defaults to `en`.
- `LIVEAVATAR_IS_SANDBOX`: defaults to `true`; set to `false` only when you intend to create non-sandbox sessions and understand the plan/credit cost.

The authenticated same-origin endpoint `POST /api/liveavatar/session` exchanges the server-side API key for a short-lived session token. The frontend passes only that session token to `@heygen/liveavatar-web-sdk`. The endpoint requires a signed-in user and rejects cross-origin requests.

## Limits and verification

LiveAvatar is a hosted service and is not the same as the local Qwen/LiveTalking worker. LiveAvatar account access, a configured avatar/voice, internet connectivity, and available plan credits are required. Without the environment variables, the panel will show a configuration error instead of pretending the avatar is live. Confirm a real browser session before considering streaming verified.

Upstream SDK: https://github.com/heygen-com/liveavatar-web-sdk
API token reference: https://liveavatar.readme.io/reference/create_session_token_v1_sessions_token_post

The root npm lockfile includes `@heygen/liveavatar-web-sdk` and its runtime dependencies.
