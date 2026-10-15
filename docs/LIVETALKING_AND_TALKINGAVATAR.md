# LiveTalking and TalkingAvatar integrations

NKAI Studio now exposes both references in the avatar panel and tracks them in `src/data/avatar-catalog.json`. These are deliberately two different integration types.

## 1. LiveTalking: self-hosted real-time streaming engine

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
6. Open the resulting HTTPS browser URL from NKAI Studio's **LiveTalking · real-time streaming avatar** section. The launch control opens the configured server in a separate tab.

### What is integrated today vs. next

- **Implemented:** NKAI Studio provider catalogue entry, provider launch controls, server URL validation, and documentation.
- **Not yet integrated:** embedded WebRTC session negotiation, authenticated API adapter, automatic model download, remote health checks, deployment of a GPU host, and end-to-end browser/audio tests. LiveTalking's `/human` API and session protocol are not the same contract as NKAI's existing `/chat` and `/tts` endpoints; do not send requests to it using the chat worker schema without an adapter.
- **Operational requirement:** the GPU process and model weights must actually be running. A passing frontend build does not establish that the stream is live.

For API integration, read the upstream API documentation before implementing a bridge:
https://github.com/lipku/LiveTalking/blob/main/docs/api.md
https://github.com/lipku/LiveTalking/blob/main/docs/avatar_api.md

## 2. TalkingAvatar AI Creation Library: hosted provider

- Creation library: https://www.talkingavatar.ai/create-avatar/ai-creation-library
- Provider website: https://www.talkingavatar.ai/

NKAI Studio provides a button to open the hosted library. This is an external-service handoff, not a claim that the provider has a public API or permits bulk asset downloads. Before integrating any returned asset into NKAI, verify its download/export rights, commercial use rights, attribution requirements, and whether the provider permits redistribution. Do not scrape private APIs, copy paid assets, or reproduce proprietary backend code.

## 3. Product role in NKAI Studio

| Layer | Best-fit role |
|---|---|
| TalkingHead / local GLB | Lightweight in-browser 3D character and local avatar preview |
| OpenVoice / Indic Parler / other TTS workers | Generate speech audio through the existing worker interface |
| LiveTalking | Separate real-time audio/video avatar streaming service with GPU inference |
| TalkingAvatar | Optional hosted creation library for avatar ideation/creation; use subject to provider terms |

These layers complement one another; they are not interchangeable runtimes. The long-term integration should use a typed provider adapter with explicit health checks, session lifecycle management, auth, timeout handling, and per-provider capability reporting.
