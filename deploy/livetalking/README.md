# NKAI Studio — LiveTalking runtime

This folder adds a containerized deployment path for the **actual LiveTalking engine** used by NKAI Studio's existing same-origin WebRTC adapter. It builds from upstream open-source source code and keeps the engine behind NKAI's own UI/API; it does not copy a third-party website.

- Upstream: https://github.com/lipku/LiveTalking
- Upstream licence: Apache License 2.0; preserve licence and notices when redistributing.
- NKAI browser adapter: `src/components/studio/livetalking-native-panel.tsx`
- NKAI server-side URL: `LIVETALKING_INTERNAL_URL`, configured server-side (never a public `VITE_*` variable).

## Agreed four-platform plan

1. **Own NVIDIA GPU PC** — first controlled host for getting the real avatar/video/audio path working.
2. **Lightning AI** — optional cloud GPU host, subject to current availability, terms, and cost/session constraints.
3. **Kaggle** — optional temporary GPU testing host only if current rules and network constraints support the needed process. Do not assume it can host a permanent WebRTC service.
4. **Cloudflare Workers + Quick Tunnel** — gateway/registration/signalling infrastructure, **not a GPU host**. It forwards signalling to registered GPU hosts; it does not execute the avatar model.

The three compute options are the PC, Lightning AI, and Kaggle. Cloudflare is the fourth infrastructure platform in the agreed plan. This architecture does not promise unlimited free 24/7 GPU capacity.

## Prerequisites

- Linux GPU host with NVIDIA drivers and NVIDIA Container Toolkit.
- Docker Engine and Docker Compose v2.
- LiveTalking-compatible model checkpoint and avatar data from sources whose terms permit your intended use.
- Running NKAI Studio server and its authenticated `/api/livetalking/*` adapter.

**Model weights and avatar recordings are not included.** Upstream excludes these assets from source control; they have separate download/access/licensing requirements. Do not commit gated assets or bundle them into a public image.

## Prepare and start

From this directory on the GPU host:

1. Copy `.env.example` to `.env` and review `LIVETALKING_REF`. Pin a reviewed upstream commit for reproducibility.
2. Create the directories configured by `LIVETALKING_MODELS_DIR` and `LIVETALKING_AVATARS_DIR`.
3. Place the compatible `wav2lip.pth` checkpoint in the models directory and the complete `wav2lip256_avatar1` avatar directory in the avatars directory. Verify these names against upstream instructions; adjust the launch command for a different supported model/avatar.
4. Start:

```bash
docker compose --env-file .env up --build -d
docker compose --env-file .env logs -f livetalking
```

The default launch command is `python app.py --transport webrtc --model wav2lip --avatar_id wav2lip256_avatar1`. Check the upstream README for current Python/CUDA/PyTorch requirements before using this configuration; dependencies can change.

## Connect it to NKAI

Set the NKAI server's `LIVETALKING_INTERNAL_URL` to the HTTPS Cloudflare gateway URL that routes signalling to the registered host. Keep registration secrets private. The gateway proxies HTTP signalling only; browser WebRTC media still needs reachable ICE candidates and UDP/network configuration, or a suitable TURN relay.

Do not expose LiveTalking directly to the public internet. Host networking is selected because WebRTC media ports are dynamic; restrict firewall access and validate the topology.

## Platform-specific guidance

- **Own NVIDIA PC:** first choice for initial model and browser acceptance tests.
- **Lightning AI:** see [Lightning deployment guide](../../gpu-worker/LIGHTNING_AI_DEPLOYMENT.md); confirm current costs/quotas before provisioning.
- **Kaggle:** only use where current Kaggle terms and session/network behavior allow this service. If it cannot provide reachable WebRTC media or a permitted server process, it cannot serve as a live-avatar host in this setup.
- **Cloudflare:** deploy gateway using [gateway instructions](../../gateway/README.md); it selects registered hosts but supplies no GPU.

## What this change does and does not do

- Provides a container build path for the upstream engine.
- Keeps large/separately licensed model files out of Git and the image.
- Connects conceptually to NKAI's existing embedded video panel and backend adapter.
- Does **not** provision GPUs, fetch gated assets, guarantee free compute, configure TURN, or prove a live session before acceptance testing.

## Verify

Check model/CUDA startup logs, then use the deployed NKAI site and verify all three: remote video, remote audio, and text-to-avatar speech/interruption. An HTTP 200 or successful SDP offer alone is not sufficient to mark the stream working.
