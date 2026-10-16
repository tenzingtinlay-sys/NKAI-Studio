# NKAI Studio: live-avatar setup across four platforms

The agreed four-platform plan is: **(1) your own NVIDIA GPU PC, (2) Lightning AI, (3) Kaggle, and (4) Cloudflare Workers + Tunnel as the gateway**. Important distinction: Cloudflare is the signalling gateway/tunnel, not a GPU compute host. The three GPU execution options are your PC, Lightning AI, and Kaggle. A fourth actual GPU host can be added later if one is selected and verified; do not count Cloudflare as GPU capacity.

The goal is one embedded NKAI Studio experience. The browser talks to NKAI's authenticated same-origin routes; those route signalling through the Cloudflare gateway to whichever registered LiveTalking GPU host is available. No external avatar website is shown to the end user.

## Platform status

| Platform | Role | Current status |
|---|---|---|
| Own NVIDIA PC | First controlled LiveTalking GPU host; best place to validate models and WebRTC end-to-end | Not yet verified |
| Lightning AI | Optional cloud GPU host for LiveTalking or separate chat/voice workers, subject to current account/compute terms | Setup guide exists; not deployed or verified |
| Kaggle | Optional temporary GPU execution/testing; session limits mean it is not a reliable always-on server without a permitted supported hosting method | Not deployed or verified |
| Cloudflare Workers + Quick Tunnel | Gateway, host registration, and private tunnel/signalling route; does not run the avatar model or GPU inference | Code/docs exist; account deployment and end-to-end networking not verified |

**No free platform should be represented as unlimited 24/7 GPU compute.** Sessions can end, queues and quotas apply, and WebRTC media may need a separate TURN relay. We will add GPU hosts one at a time only after the first host passes the full test.

## Step 0 — prerequisites

- A Linux NVIDIA GPU machine with compatible drivers, or a permitted cloud GPU session.
- Docker Engine/Compose and NVIDIA Container Toolkit for the included container path.
- LiveTalking model checkpoint and avatar assets from sources whose terms permit your use.
- NKAI Studio deployed on HTTPS with the authenticated `/api/livetalking/*` adapter.
- Cloudflare account for the gateway and `cloudflared` on a host that can run the engine.

## Step 1 — first make one GPU host work

Follow [the LiveTalking container setup](deploy/livetalking/README.md). Use the own NVIDIA PC first if available; do not add cloud hosts until LiveTalking's own UI loads without checkpoint/CUDA errors and a real NKAI browser session receives audio and video.

## Step 2 — deploy the gateway

Follow [gateway/README.md](gateway/README.md). Configure its KV namespace, exact allowed frontend origin, and private `REGISTER_SECRET`; then deploy with Wrangler. Check `https://YOUR-GATEWAY/health`. An empty server list means the gateway is up but no GPU host has registered.

## Step 3 — register the working GPU host

Install `cloudflared` and run from the repository root:

```bash
python gateway/host_agent.py --gateway https://YOUR-GATEWAY --secret YOUR_SECRET --id mypc --priority 1
```

Keep LiveTalking and the host agent running. Check `/health` for the host with `"up": true`. Never commit the registration secret.

## Step 4 — connect NKAI Studio

Set server-side `LIVETALKING_INTERNAL_URL` to the HTTPS gateway base URL (no path or trailing slash), then restart/redeploy NKAI. Keep all secrets server-side. The browser calls NKAI's same-origin authenticated routes; the gateway forwards HTTP signalling. WebRTC media still travels browser-to-host, so ICE candidates, UDP/firewall rules, and possibly TURN must work too.

## Step 5 — add the other GPU options

- **Lightning AI:** use the deployment guide in [gpu-worker/LIGHTNING_AI_DEPLOYMENT.md](gpu-worker/LIGHTNING_AI_DEPLOYMENT.md). Verify current GPU availability, session behavior, and cost before provisioning. Register the host only after the engine works and networking is validated.
- **Kaggle:** treat it as a temporary experiment/validation option, not an assumed permanent server. Confirm current Kaggle terms and session/network constraints before trying to expose LiveTalking. If inbound/reachable WebRTC media or a permitted long-running process is unavailable, it is not a valid LiveTalking host for this architecture.
- **Own NVIDIA PC:** retain as the baseline controlled host and fallback when it is online.

Give each active host a unique ID and priority. Test failover by stopping the preferred host and verifying that a new offer routes to another live host. The gateway's host list alone does not prove video/audio works.

## Troubleshooting

| Symptom | Check |
|---|---|
| No registered host | Start LiveTalking and host agent; inspect gateway `/health` and logs |
| Offer succeeds but no video/audio | ICE candidates, UDP/NAT/firewall, codec compatibility, model logs, and TURN |
| CUDA/model error | Driver/PyTorch/CUDA compatibility, VRAM, checkpoint paths |
| Cloud session ends | Session limits; treat host as unavailable and test fallback |
| HTTPS or browser errors | HTTPS on frontend/gateway and authenticated same-origin NKAI routes |

## Cost and safety

This avoids paid inference APIs, but it cannot promise free unlimited GPU time. Hardware, electricity, bandwidth, optional TURN, and cloud compute may cost money. Do not expose LiveTalking directly to the public internet; use the gateway/tunnel and narrow firewall access. Use only avatar/model/voice assets permitted for your intended distribution.
