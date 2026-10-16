# NKAI Live Avatar Gateway

This folder contains the Cloudflare Worker gateway and the GPU host registration agent. The gateway stores short-lived backend registrations in Cloudflare KV and forwards the LiveTalking signalling HTTP requests to the highest-priority live host.

> This is signalling/proxy infrastructure, not a GPU host. LiveTalking must already be running on a machine with compatible models and an NVIDIA GPU. WebRTC media still travels between browser and GPU host; a successful HTTP offer does not guarantee UDP/media connectivity.

## Requirements

- Free Cloudflare account with Workers and KV enabled.
- Node.js and npm on the machine used to deploy the gateway.
- Python 3.10+ and `cloudflared` on each GPU host.
- A permitted GPU host running LiveTalking on `127.0.0.1:8010`.

## Deploy once

From the repository root:

```bash
npm install -g wrangler
wrangler login
cd gateway
wrangler kv namespace create BACKENDS
```

Copy the printed namespace ID into `wrangler.toml`, replacing `PASTE_THE_ID_FROM_wrangler_kv_namespace_create`. Set `ALLOWED_ORIGINS` to the exact HTTPS origin of the frontend (no path), for example `https://your-site.pages.dev`. Do not use a wildcard for a public deployment.

Then set a long random secret without committing it:

```bash
wrangler secret put REGISTER_SECRET
wrangler deploy
```

Save the Worker URL it prints. Verify `https://YOUR-GATEWAY/health`; it should return JSON with `gateway: true` and an initially empty `servers` array. Never put `REGISTER_SECRET` into frontend code or a public repository.

## Register a GPU host

Start LiveTalking first and confirm its local page loads. Install `cloudflared`, then from the repository root run:

```bash
python gateway/host_agent.py --gateway https://YOUR-GATEWAY --secret YOUR_SECRET --id mypc --priority 1
```

The agent creates an ephemeral HTTPS tunnel, registers it, and renews its registration every 25 seconds. Keep the process running. The gateway expires a host after 90 seconds without a heartbeat. Use a unique ID per host; lower priority values are selected first.

The tunnel URL changes when the host agent restarts. The agent refreshes the URL by re-registering it. Quick tunnels are for testing and may be rate-limited or unsuitable for production.

## Gateway endpoints

- `GET /health` — lists currently registered hosts without exposing their tunnel URLs.
- `POST /register` — host-agent registration; requires `Authorization: Bearer <REGISTER_SECRET>`.
- `POST /heartbeat` — refreshes a registration; same authorization.
- `POST /unregister` — removes a registration; same authorization.
- `POST /api/livetalking/offer` — proxies WebRTC SDP signalling to the selected LiveTalking host.
- `POST /api/livetalking/human` — proxies text commands to the selected host.

The browser-facing signalling routes require the requesting Origin to be listed in `ALLOWED_ORIGINS`. Keep the allowed-origin list narrow. The shared registration secret is only for host-agent operations.

## Limitations

- Cloudflare Worker proxies only the HTTP signalling calls. It does not proxy WebRTC UDP media.
- STUN may be enough on a home network; restrictive NAT/firewalls may require TURN or another supported media-relay setup. Free TURN capacity is not guaranteed.
- Free GPU sessions are temporary and quota-limited. No host means no live video; the bundled local avatar remains available.
- Test on a single machine/network before adding more hosts.


## Deploy from GitHub Actions

The repository includes a manual workflow at [Deploy Cloudflare Live Avatar Gateway](../.github/workflows/deploy-cloudflare-gateway.yml). It deploys the Worker, installs the registration secret, checks `/health`, and verifies the configured origin's CORS header. It does not create a GPU host.

Before running it, add these repository secrets under **Settings → Secrets and variables → Actions**:

- `CLOUDFLARE_API_TOKEN`: scoped token with permission to edit Workers Scripts and Workers KV for the target account.
- `CLOUDFLARE_ACCOUNT_ID`: the Cloudflare account ID for that token.
- `NKAI_GATEWAY_REGISTER_SECRET`: a long random secret shared only with the host registration agent.
- `NKAI_FRONTEND_ORIGIN`: the exact public HTTPS origin of the deployed NKAI Studio, with no path or trailing slash (for example `https://your-app.example`). Do not use a wildcard.

The existing `BACKENDS` KV namespace ID in `wrangler.toml` must exist in that Cloudflare account. If it does not, create a KV namespace named `BACKENDS` in the account and update `wrangler.toml` with the returned ID before deploying.

Then open **GitHub → Actions → Deploy Cloudflare Live Avatar Gateway → Run workflow**. On success, the job logs the public `workers.dev` URL and verifies its health response. Keep the URL for the next setup step. If the workflow fails, use the first failing step's logs to correct the account/token/namespace configuration; do not paste token or secret values into issues or chat.

The initial health response may correctly show `servers: []`: this means the gateway is up, but no GPU host is registered yet. Live avatar streaming is not ready until a permitted host registers and a real browser WebRTC session receives audio and video.
