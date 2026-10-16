# NKAI Studio — LiveTalking runtime

This folder adds a containerized deployment path for the **actual LiveTalking engine** used by NKAI Studio's existing same-origin WebRTC adapter. It does not copy a third-party website; it builds from the upstream open-source repository and keeps the engine behind NKAI's own UI and API routes.

- Upstream source: https://github.com/lipku/LiveTalking
- Upstream licence: Apache License 2.0. Keep its licence and notices when redistributing.
- NKAI browser adapter: `src/components/studio/livetalking-native-panel.tsx`
- NKAI server-side URL: set `LIVETALKING_INTERNAL_URL` on the NKAI server to the private gateway or service URL (not a public `VITE_*` variable).

## Prerequisites

- A Linux GPU host with NVIDIA drivers and NVIDIA Container Toolkit.
- Docker Engine and Docker Compose v2.
- LiveTalking-compatible model checkpoint and avatar data acquired from a source whose terms permit your intended use.
- A running NKAI Studio server and its existing authenticated `/api/livetalking/*` adapter.

**This image does not include model weights or avatar recordings.** The upstream repository excludes its model and data folders; those files have separate download and licence requirements. Do not copy gated assets into this repository or a public image.

## Prepare and start

From this directory on the GPU host:

1. Copy `.env.example` to `.env` and review `LIVETALKING_REF`. For reproducible deployments, replace `main` with a reviewed upstream commit.
2. Create the local directories configured by `LIVETALKING_MODELS_DIR` and `LIVETALKING_AVATARS_DIR`.
3. Put the upstream-compatible `wav2lip.pth` checkpoint in the models directory and the complete `wav2lip256_avatar1` avatar directory in the avatars directory. These names match the default command; adjust the Compose command if using a different supported model/avatar.
4. Start the container:

```bash
docker compose --env-file .env up --build -d
docker compose --env-file .env logs -f livetalking
```

The default upstream launch command is `python app.py --transport webrtc --model wav2lip --avatar_id wav2lip256_avatar1`. Confirm the host's current upstream README and model instructions before relying on these defaults; upstream dependencies and checkpoints can change.

## Connect it to NKAI

The browser uses NKAI's same-origin routes. Configure the NKAI server's `LIVETALKING_INTERNAL_URL` to the HTTPS gateway URL that routes HTTP signalling to this host. The gateway is signalling only; the browser's WebRTC audio/video media path still needs reachable ICE candidates and UDP/network configuration. A successful offer request alone is not proof of a working stream.

Do not expose the LiveTalking process directly to the public internet. Use the NKAI gateway and a private/tunneled host registration where appropriate. Host networking is selected because WebRTC media ports are dynamic; restrict firewall access and validate your actual network topology. If the network blocks direct UDP, configure a suitable TURN/media relay.

## What this change does and does not do

- Provides a reproducible container build path for the upstream engine.
- Keeps large/separately licensed model files out of Git and the image.
- Lets NKAI continue using its existing in-app video panel and backend adapter.
- Does **not** provision a GPU, download gated assets automatically, guarantee free compute, configure TURN for you, or prove a live media session before you run the end-to-end test.

## Verify

After the host starts, inspect its logs for checkpoint loading and model/CUDA errors, then test a real NKAI browser session. Acceptance means the browser receives remote audio and video, sends a text command, and can interrupt speech. Do not mark live video as working based on an HTTP 200 response alone.
