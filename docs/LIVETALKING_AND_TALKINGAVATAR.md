# LiveTalking and TalkingAvatar integrations

NKAI Studio must run its avatar workflows inside the product. The previous outbound launch controls have been removed. LiveTalking is being integrated through a same-origin backend route; the hosted TalkingAvatar site is not embedded or called because its private backend/API and redistribution rights are not established.

## 1. LiveTalking: self-hosted real-time streaming engine inside NKAI Studio

- Source: https://github.com/lipku/LiveTalking
- Project website: https://www.livetalking.ai/
- Documentation: https://doc.livetalking.ai/en/
- License: the upstream repository declares Apache-2.0 for code. Verify the exact checkpoint, dataset, sample avatar and output-media terms separately.
- Capabilities documented upstream: WebRTC and RTMP streaming, Wav2Lip/MuseTalk/ER-NeRF/Ultralight model options, TTS integrations, interruptible speech, custom avatar generation, action choreography and HTTP APIs.

### Deployment outline

1. Provision a Linux GPU host with a CUDA/PyTorch combination supported by the upstream LiveTalking release. Its current English README documents Python 3.12 and CUDA 12.8 as a tested setup; check the upstream README before pinning dependencies.
2. Clone the upstream repository and install the exact upstream requirements in an isolated environment.
3. Download model checkpoints and avatar assets from upstream instructions, then audit their individual licences. Do not assume the Apache-2.0 code licence applies to model weights or sample media.
4. Start the server with a selected model and avatar ID, following the upstream README. The documented example is `python app.py --transport webrtc --model wav2lip --avatar_id wav2lip256_avatar1`.
5. Configure networking for the selected transport. The upstream README warns that WebRTC requires TCP 8010 and a broad UDP port range in its default setup; do not expose a GPU server to the public internet without a firewall, authentication/reverse proxy strategy and TLS.
6. Set `LIVETALKING_INTERNAL_URL` in the app server environment (for example `http://127.0.0.1:8010` locally or a private service hostname in a shared deployment). NKAI Studio embeds `/api/livetalking/` in its own panel and proxies HTTP requests through the backend; the upstream hostname is not exposed in the UI.

### What is integrated today vs. next

- **Implemented:** in-app streaming panel, same-origin backend HTTP proxy, private server-side upstream configuration, and documentation.
- **Not yet verified:** a deployed GPU host, model checkpoint installation, full WebRTC/ICE behavior through the deployment network, authenticated streaming session lifecycle, and end-to-end browser/audio tests. The HTTP proxy does not tunnel UDP; WebRTC media ports must be reachable under the deployment firewall. LiveTalking's session protocol is not the same as NKAI's existing `/chat` and `/tts` worker contract.
- **Operational requirement:** the GPU process and model weights must actually be running. A passing frontend build does not establish that the stream is live.

For API integration, read the upstream API documentation before implementing a bridge:
https://github.com/lipku/LiveTalking/blob/main/docs/api.md
https://github.com/lipku/LiveTalking/blob/main/docs/avatar_api.md

## 2. TalkingAvatar: not used as a runtime dependency

- Creation library: https://www.talkingavatar.ai/create-avatar/ai-creation-library
- Provider website: https://www.talkingavatar.ai/

The hosted website is not linked from the app and is not used as a runtime dependency. To make avatar creation genuinely in-app, implement a first-party workflow using licensed open models and locally stored outputs. Do not scrape private APIs or copy paid assets/backend code. A provider integration should be considered only after its official API and commercial/export rights are confirmed.

## 3. Product role in NKAI Studio

| Layer | Best-fit role |
|---|---|
| TalkingHead / local GLB | Lightweight in-browser 3D character and local avatar preview |
| OpenVoice / Indic Parler / other TTS workers | Generate speech audio through the existing worker interface |
| LiveTalking | Separate real-time audio/video avatar streaming service with GPU inference |
| TalkingAvatar | Optional hosted creation library for avatar ideation/creation; use subject to provider terms |

These layers complement one another; they are not interchangeable runtimes. The long-term integration should use a typed provider adapter with explicit health checks, session lifecycle management, auth, timeout handling, and per-provider capability reporting.
