# NKAI Studio — Open-Source Talking-Avatar Ecosystem Review

**Review date:** 2026-10-18  
**Purpose:** Select reusable, licence-compatible components for an interactive, voice-driven human avatar in NKAI Studio.  
**Scope note:** GitHub and Hugging Face are too large for an exhaustive search of every repository. This is a curated survey of relevant upstream projects and public demos, not a claim that every repository or hosted Space was exhaustively tested. A README/demo is evidence of project capability, not proof that a live endpoint is currently healthy.

## Executive recommendation

Build one provider-neutral avatar experience around the existing NKAI chat/worker and gateway, with these tiers:

1. **Default, no paid avatar API required:** keep the existing Qwen worker for conversation; use the browser's native speech-recognition fallback and available local/browser TTS until an open TTS worker is configured. Render a licensed GLB/GLTF in-browser for an economical 3D option. This is functional but does not produce photorealistic streaming video.
2. **Self-hosted real-time video avatar:** integrate the existing LiveTalking WebRTC bridge as the primary video stream adapter. It supports text-driven talking and real-time audio/video output when a compatible GPU service, model weights, and network path are running. Keep GPU worker availability and ICE/UDP reachability visible in UI.
3. **Potentially cleaner commercial self-hosted engine:** evaluate Mynah (Apache-2.0 core; documented FlashHead/MuseTalk 1.5 defaults) for a later deployment if GPU capacity and model provenance are validated. Its README says the FlashHead default needs a high-end NVIDIA GPU; its lighter wav2lipLS profile needs operator-provided self-trained weights.
4. **Hosted photorealism:** retain HeyGen LiveAvatar as an optional provider adapter, not a hard dependency. It needs server-side credentials and a paid/limited service account; create session tokens server-side and never expose provider secrets in the browser.
5. **Duix:** treat it as an offline video-generation/cloning engine, not the primary live interactive engine. Its own README distinguishes non-real-time synthesis from real-time interaction.

Do not bundle every project into one runtime. They have different Python/CUDA versions, GPU requirements, model formats, transport APIs, and licences. Normalize them behind a small provider contract and load one runtime per session.

## Candidate projects

| Project | What it provides | Runtime / dependencies | Avatar and voice resources | Licence / commercial notes | Evidence status |
|---|---|---|---|---|---|
| [Mynah](https://github.com/honwee/mynah) | Self-hosted full conversation loop; browser WebRTC; pluggable avatar, TTS, ASR, LLM, turn detector; admin console, channels, voice cloning | Go realtime core + Python workers + WebRTC/gRPC; GPU for default FlashHead; lighter wav2lipLS profile | Built-in Luna/Nova presets; prepare a likeness from a video; swappable TTS/ASR/LLM workers; model weights fetched by setup scripts rather than all vendored | Core Apache-2.0. Upstream licensing matrix documents FlashHead Apache-2.0 and MuseTalk 1.5 MIT, with caveats for optional LTX VAE and selected models. Check exact weights and data before shipping. | README and licensing file inspected; no NKAI deployment test |
| [LiveTalking](https://github.com/lipku/LiveTalking) | Real-time synchronized audio/video, text-driven avatar, interruption, WebRTC/RTMP, custom avatar, multi-model support | Python + PyTorch/CUDA + WebRTC; models and checkpoints required; upstream README currently lists Python 3.12 / PyTorch 2.9.1 / CUDA 12.8 in its tested setup | Supports MuseTalk, ER-NeRF, Wav2Lip and Ultralight-Digital-Human; external checkpoints/avatar data; TTS/ASR adapters | Repository code Apache-2.0; individual checkpoints, datasets and voices have separate terms. Classic Wav2Lip assets can be non-commercial. Do not assume all downloaded assets are commercially usable. | README inspected; NKAI has a WebRTC adapter, but real streaming only proven when worker connects |
| [OpenTalking](https://github.com/datascale-ai/opentalking) | Integrated Web UI, avatar/voice libraries, knowledge base, memory, LLM/STT/TTS configuration, real-time WebRTC and model adapters | React + FastAPI; mock mode for UI/API trial; local or remote QuickTalk/Wav2Lip/FlashTalk/FasterLivePortrait-style drivers | Project-managed avatar and voice libraries plus configurable model backends | Apache-2.0 project licence; third-party models and weights retain their own licences | README inspected; not deployed in NKAI |
| [Realtime Interactive Avatar](https://github.com/whitphx/realtime-interactive-avatar-lam) | Browser-based talking avatar; WebRTC speech-to-speech; ARKit expression control; emotion and barge-in state | Vite/React/TypeScript; Realtime API token endpoint; LAM renderer; GPU reconstruction/audio-expression endpoints optional | Requires a prepared LAM asset or a reconstruction backend; audio-to-expression model is a separate GPU dependency for phoneme-level sync | Repo reports Apache-2.0 for LAM code/weights, but notes FLAME 3DMM research-only licensing. External speech API costs apply. | README and architecture inspected; no NKAI deployment test |
| [TalkingHead](https://github.com/met4citizen/TalkingHead) | Browser-rendered 3D talking head, visemes, expressions and motions; can pair with browser or remote speech | JavaScript/WebGL; GLB/glTF with suitable rig/blendshapes; browser TTS or external voice/LLM services | Avatar GLB files are separate assets; examples demonstrate Microsoft/Google TTS and speech/AI integrations | Check repository licence and each model/voice asset separately. A code licence does not automatically license the sample avatar's likeness. | README inspected; best low-compute browser-rendered candidate |
| [Duix Avatar](https://github.com/duixcom/Duix-Avatar) | Offline appearance/voice cloning and text/audio-driven video synthesis | Desktop/Electron + Docker services; NVIDIA GPU and model services; setup instructions are hardware-specific | User-provided person video/audio and downloaded model resources; voice/appearance cloning | Has a project licence plus a separate model community licensing agreement; read both before use. README says its local engine is non-real-time and points users to the hosted site for interaction. | README inspected; not suitable as NKAI live-stream primary without a different bridge |
| [Linly-Talker-Stream](https://github.com/chenhao324/avatar) | Streaming digital-human architecture with WebRTC and duplex conversation; switchable 2D/3D drivers | Vue/Python multimodal services, WebRTC, model-specific dependencies | Wav2Lip, MuseTalk, ER-NeRF, TalkingGaussian drivers; configured model/data directories | Review root and upstream model licences individually; repository describes ongoing iteration and some roadmap items still TODO | README inspected; useful design reference, not assumed production-ready |
| [Realtime Interactive Avatar LAM fork / demos](https://github.com/whitphx/realtime-interactive-avatar-lam) | In-browser renderer, voice loop and expression pipeline separated into stages | Browser rendering + token backend + optional GPU services | Prebuilt LAM archive or photo reconstruction | Same FLAME research-only caveat as above | Architecture inspected, not live-tested |
| [MuseTalk](https://github.com/TMElyralab/MuseTalk) | Audio-driven lip-sync generation for face/video; a driver engine rather than a complete chat product | Python/PyTorch, model weights, GPU; can be embedded in a WebRTC orchestration service | Input face/video + synthesized audio; generates lip-synced output | Code and trained model are described as MIT / commercially usable by upstream, but test data is non-commercial and all dependencies need separate review | Upstream disclaimer inspected; not a standalone full conversation app |
| [Hugging Face MuseTalk Space](https://huggingface.co/spaces/scratchyourbrain123/MuseTalk) | Gradio demo for audio-driven lip-sync experiments | Hosted Space; can sleep or be paused and is not a reliable production endpoint | User-uploaded face/video and audio | Space wrapper and underlying model/data licences must be checked separately | Space page found; current always-on health not independently verified |
| [OpenAvatarChat](https://github.com/HumanAIGC-Engineering/OpenAvatarChat) | Modular interactive digital-human app with configuration-based handlers and model download tooling | CUDA >= 12.8 per current getting-started docs; uv-managed Python dependencies; model weights fetched for selected config | Model/handler config chooses avatar and speech pipeline | Audit each selected handler, checkpoint and avatar licence; do not infer all components share the root licence | Official setup docs inspected; no NKAI deployment test |
| [Hallo-Live](https://github.com/fudan-generative-vision/Hallo-Live) | Research implementation for streaming joint audio/video avatar generation | Large diffusion model; upstream reports 20.38 FPS / 0.94 s latency on two NVIDIA H200 GPUs, so not a fit for free single-T4 production without major optimization | Generated speech/video stream driven by text; research checkpoints and supporting model weights required | Repository marked MIT; third-party component terms and checkpoint provenance still need review | README inspected; compute requirement reported by upstream, not independently benchmarked |
| [Hallo](https://github.com/fudan-generative-vision/hallo) / [Hallo2](https://github.com/fudan-generative-vision/hallo2) | Audio-driven portrait animation/video generation; useful for creating clips or evaluating a visual driver, not by itself a full interactive WebRTC conversation stack | Python/PyTorch, CUDA, multiple pretrained checkpoints; Hallo README tests A100 and CUDA 12.1 | Source portrait + driving audio; pretrained models hosted separately on Hugging Face | Code repository marked MIT, but third-party face-analysis/model/data licences must be checked; research/demo assets may have separate restrictions | Official README inspected; not live-streamed in NKAI |
| [LivePortrait](https://github.com/KwaiVGI/LivePortrait) | Efficient portrait animation and retargeting; useful for idle/motion assets or a driver component | Python/PyTorch inference and downloaded checkpoints; separate real-time conversation transport/LLM/TTS still needed | Source portrait plus driving motion/audio/video pipeline depending on integration | Check the upstream licence and face-analysis dependencies; never assume model/dataset rights from code licence alone | Upstream repository found; not an end-to-end talking assistant |
| [EchoMimic](https://github.com/antgroup/echomimic) and [EchoMimicV2](https://github.com/antgroup/echomimic_v2) | Audio-driven portrait and semi-body animation/video generation; potential offline asset or avatar-worker candidate | GPU-heavy PyTorch generation, checkpoint downloads and model-specific dependencies; not a complete browser voice conversation by itself | Portrait/reference image plus audio; checkpoints hosted separately | Check exact repo, checkpoint, dataset and dependency terms before commercial deployment; each series version has its own provenance | Official repositories found; not verified as low-latency continuous WebRTC runtime |
| [OpenAvatarChat demo fork](https://github.com/JackMABEE/OpenAvatarChatd_demo) | Example of browser voice interaction, streamed lip-sync, interruptions | Project-specific backend and model stack | Depends on upstream OpenAvatarChat configuration | Check upstream and bundled asset/model terms | README/demo description found; fork's compiled frontend is not a substitute for reviewing upstream source |
| [Realtime Human](https://github.com/DuanHangyu/Realtime_human) | Video-to-character training and browser-side WebGL/WASM animation with voice backend | React/WebGL + FastAPI/PyTorch training + .NET voice backend | User-provided video is used to create a character; voice interaction uses ASR/LLM/TTS | Verify exact licence and training-data rights before commercial use | README found; not tested in NKAI |
| [LiveAvatar Web SDK](https://github.com/heygen-com/liveavatar-web-sdk) and [session token docs](https://liveavatar.readme.io/reference/create_session_token_v1_sessions_token_post) | Hosted, realistic streamed avatars with browser SDK and LiveKit session infrastructure | Server creates a session token; browser starts the SDK/WebRTC session; account and session configuration required | Provider-managed avatar/voice catalogue and account-specific IDs | Commercial service terms and usage/credit limits apply; API secret must stay server-side | Official SDK and API docs found; production credentials and live session in NKAI are not verified |

## Hugging Face and model discovery

Hugging Face Spaces are useful for finding demonstrations, not automatically for embedding production services. A Space can be sleeping, paused, rate-limited, private, or tied to a specific Gradio interface. Do not hotlink a demo as a permanent avatar backend. For production, pin the upstream model revision, read its licence/model card, download permitted weights into an owned runtime, expose a health/capabilities API, and monitor the worker.

Useful discovery pages:
- [Spaces tagged/searching avatar](https://huggingface.co/spaces?search=avatar)
- [MuseTalk Space example](https://huggingface.co/spaces/scratchyourbrain123/MuseTalk)
- [MuseTalk upstream model/code](https://github.com/TMElyralab/MuseTalk)
- [TalkingHead browser avatar](https://github.com/met4citizen/TalkingHead)
- [Mynah's component provenance](https://github.com/honwee/mynah/blob/main/LICENSING.md)

A Space showing “Running” on a search page is only a snapshot; it is not an uptime SLA and does not prove that its endpoint can be called from NKAI.

## Recommended NKAI Studio architecture

```text
Browser (NKAI Studio)
  ├─ Avatar picker + consent/licence metadata
  ├─ Mic capture / browser ASR fallback
  ├─ WebRTC video/audio element (when a video provider is connected)
  └─ Chat transcript, interrupt, mute, connection state
          │
          ▼
NKAI backend / Cloudflare gateway (secrets remain server-side)
  ├─ Conversation adapter → existing Qwen worker
  ├─ TTS adapter → existing worker TTS; browser TTS only as fallback
  ├─ LiveTalking adapter → SDP offer + text/interrupt endpoints
  ├─ LiveAvatar adapter → catalog + token + session endpoints
  └─ Future provider adapters → Mynah/OpenTalking-compatible worker contracts
          │
          ▼
Provider workers
  ├─ Qwen conversation worker (already reported working by project owner)
  ├─ TTS / ASR worker (capabilities must be probed)
  └─ Avatar engine + model assets + WebRTC media transport
```

### Provider contract to standardize

Each provider should expose:
- `GET /health` and `GET /capabilities`: health, model name, streaming support, supported languages, TTS/ASR flags, GPU and readiness.
- `GET /catalog`: only selectable avatars/voices the current runtime actually provides, each with licence, source, attribution, and required model/voice IDs.
- `POST /session` and `DELETE /session/:id`: create/close a session without exposing upstream secrets.
- `POST /message`: send text and optional conversation context.
- `POST /interrupt`: stop current speech when supported.
- WebRTC or streaming media transport for real-time video/audio. A successful chat HTTP response is not proof of a live avatar stream.

Keep statuses distinct: **connected**, **configured but offline**, **not configured**, and **unsupported**. Never label a provider “connected” just because its code exists.

## Acceptance tests before calling the avatar live

1. Health endpoint returns success from the actual worker, not a mocked local response.
2. Capabilities response confirms chat, TTS, and video/streaming support separately.
3. Browser session connects; remote audio and video tracks arrive and render.
4. Text response is spoken by the avatar stream (not by a separate browser voice that can drift out of sync).
5. Microphone speech is transcribed in the selected language and reaches the conversation model.
6. User interruption stops ongoing speech promptly, and the avatar returns to listening state.
7. Disconnect closes WebRTC and server session resources.
8. Verify mobile browser behavior, permissions, refresh, timeout, unavailable GPU, and reconnect.
9. Audit avatar/voice model provenance, consent, and commercial terms.
10. Test deployed URLs and environment variable names without exposing secret values.

## Immediate implementation priorities

1. Preserve the existing Qwen conversation path and Cloudflare gateway.
2. Make the existing LiveTalking WebRTC panel prominent on the landing page and make its health/connection errors visible.
3. Connect the Qwen reply to LiveTalking's text-to-avatar endpoint when the video session is connected, so the displayed human speaks the same response. Keep GPU TTS/browser speech as an explicitly labeled fallback when no stream is connected.
4. Add an honest real GLB/GLTF preview using an explicitly licensed model and a real renderer; do not present initials or a static portrait as a live human.
5. Keep LiveAvatar optional and expose provider status only after server-side health/catalog/session checks.
6. Defer Duix and larger GPU-heavy engines until a supported runtime is actually deployed and tested.

## Important constraints

- No project repository can guarantee a working public demo just because its code is public.
- Model weights, avatar likenesses, voice samples, training datasets and inference code may have different licences.
- Voice cloning and likeness generation must use authorized, consented source material.
- Real-time photorealistic video has real GPU/network cost. A free Colab session is suitable for experiments, not an uptime guarantee for production.
- Never copy proprietary website code or assets without permission. Reuse public source only under its licence and preserve required notices.
