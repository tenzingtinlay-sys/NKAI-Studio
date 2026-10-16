# NKAI Studio: live-avatar setup (one host first)

This guide describes the intended free/self-hosted path. It has not been verified against a real Cloudflare account or a running GPU host yet. Treat every step as unverified until you see the stated result.

## Step 0 — prerequisites

- Free Cloudflare account, Node.js/npm, and a GPU machine with NVIDIA drivers.
- The LiveTalking repository and compatible model files.
- NKAI Studio deployed on an HTTPS site. Browser-local avatar chat works separately and does not require this GPU path.
- A free cloud GPU can be added later if its current terms permit this kind of long-running server.

## Step 1 — deploy the gateway

Follow [gateway/README.md](gateway/README.md). Create a KV namespace, set its ID in `gateway/wrangler.toml`, set the exact frontend origin in `ALLOWED_ORIGINS`, set the private `REGISTER_SECRET`, then run `wrangler deploy`.

Open `https://YOUR-GATEWAY/health`. Expected before a host is registered:

```json
{"gateway":true,"servers":[]}
```

## Step 2 — run LiveTalking on one GPU host

Use the installation and model-download instructions in the official [LiveTalking repository](https://github.com/lipku/LiveTalking). Verify the required Python, CUDA, PyTorch, and checkpoint versions against the repository's current README before copying install commands; they can change.

The example command in the proposed setup is:

```bash
python app.py --transport webrtc --model wav2lip --avatar_id wav2lip256_avatar1
```

Open `http://127.0.0.1:8010/index.html` on that machine. Do not proceed until LiveTalking's own UI loads and its terminal shows no model or CUDA errors.

## Step 3 — register the GPU host

Install `cloudflared` from its official release page, then from the NKAI Studio repository root run:

```bash
python gateway/host_agent.py --gateway https://YOUR-GATEWAY --secret YOUR_SECRET --id mypc --priority 1
```

Keep LiveTalking and the host agent running. Open `https://YOUR-GATEWAY/health`; expected: `mypc` appears with `"up": true`. If it does not, inspect the agent logs and gateway Worker logs before continuing.

## Step 4 — connect the frontend

The current Studio intentionally uses a same-origin server adapter rather than asking the browser to hold a gateway URL. In the hosting environment for NKAI Studio, set the server-side environment variable `LIVETALKING_INTERNAL_URL` to the Cloudflare Worker base URL, for example `https://nkai-avatar-gateway.YOURNAME.workers.dev` (no path and no trailing slash). Do not put `REGISTER_SECRET` in the frontend or set it as a public `VITE_*` variable.

The browser continues to call the authenticated same-origin `/api/livetalking/offer` and `/api/livetalking/human` routes; the server adapter forwards those requests to the gateway. The gateway then selects a registered GPU host. Sign in to NKAI Studio before using live streaming.

After configuring the server variable and redeploying/restarting the app, open the Studio over HTTPS, choose the avatar/live-video control, connect, and verify both remote video and audio. The gateway's `ALLOWED_ORIGINS` list is needed only if calling the gateway directly from a browser; the current same-origin server adapter does not require direct browser-to-gateway calls. Browser-local chat and device speech remain available independently.

## Step 5 — troubleshoot

| Symptom | First checks |
|---|---|
| `No live avatar server has registered yet` | Start LiveTalking and the host agent; inspect `/health`. |
| Host missing or stale | Confirm the agent process is alive and heartbeat requests succeed. |
| Gateway reports an origin error | Set `ALLOWED_ORIGINS` to the exact site origin and redeploy. |
| Offer succeeds but video is black or absent | Inspect LiveTalking logs, browser WebRTC stats, ICE candidates, UDP/NAT/firewall rules, and codec compatibility. |
| Browser reports HTTP required / HTTPS required | Use the HTTPS Worker URL and an HTTPS frontend. |
| GPU model fails to load | Check driver, CUDA/PyTorch compatibility, checkpoint paths, and available VRAM against LiveTalking's current documentation. |

## Step 6 — add temporary free cloud hosts

Only after the local host works end-to-end, repeat Step 2 and Step 3 on one permitted platform at a time. Give each host a unique ID and a priority number. Keep in mind that free sessions can stop without warning; a gateway registration is not a guarantee of uninterrupted GPU capacity. Test failover by stopping the preferred host and verifying that a new offer is routed to another live host.

## Cost and safety notes

This path avoids paid inference APIs but is not literally cost-free in all circumstances: your electricity, hardware, internet, bandwidth, and optional TURN relay may have costs. Never commit gateway secrets, API tokens, or private credentials. Do not expose the LiveTalking port directly to the public internet; use the tunnel and keep the gateway origin allowlist narrow.
