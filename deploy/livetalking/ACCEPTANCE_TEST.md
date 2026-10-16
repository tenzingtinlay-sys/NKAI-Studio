# LiveTalking deployment acceptance test

This test is intentionally opt-in because it needs a deployed NKAI app, a signed-in session, a running GPU engine, model weights, and working WebRTC networking. It does not create or provision any of those resources.

## Required deployment

1. Use a Linux NVIDIA GPU host that supports the LiveTalking model/runtime.
2. Follow [README.md](./README.md) and upstream model instructions. The \`wav2lip.pth\` checkpoint and \`data/avatars/wav2lip256_avatar1\` folder must be present on the host.
3. Ensure the GPU service's HTTP signaling endpoint is reachable by the NKAI server and the server has \`LIVETALKING_INTERNAL_URL\` configured server-side.
4. Ensure the ICE candidates advertised by LiveTalking are reachable by the browser. The NKAI HTTP proxy does not relay UDP media. A successful status check or SDP offer is not a successful media test.
5. Deploy the NKAI app with this branch's panel and sign in using an account authorized for live streaming.

## Run browser acceptance

From the repository root, install dependencies (\`npm ci\`) and set the page URL to the NKAI route that contains the live-avatar panel. In the same terminal, provide the authenticated session cookie as environment variables; never commit them or paste them into an issue.

PowerShell:

\`\`\`powershell
$env:NKAI_AVATAR_PAGE_URL = "https://YOUR-NKAI-APP/ROUTE-WITH-LIVE-AVATAR"
$env:NKAI_SESSION_COOKIE = "COOKIE_NAME=COOKIE_VALUE"
$env:NKAI_LIVETALKING_TEST_TEXT = "Hello. Please speak this sentence."
node scripts/smoke-livetalking-browser.mjs
\`\`\`

The cookie name/value is from your own signed-in browser session. Keep it private and clear the terminal environment after testing. If the app uses multiple cookies or a different authentication mechanism, adapt the test setup rather than sharing credentials.

The script checks, in order:
- Authenticated service status is reachable.
- WebRTC reaches the connected state.
- The video element receives a live video track with nonzero dimensions and a live audio track.
- The \`/human\` text command is accepted.
- The interrupt command is accepted.
- No browser page/console errors were recorded.

A pass confirms that browser tracks and control requests work at test time; it does not guarantee sustained performance, production concurrency, or commercial rights to the selected model/avatar. The script does not log the cookie value.
