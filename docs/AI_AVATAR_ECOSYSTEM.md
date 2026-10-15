# NKAI Studio AI Avatar Ecosystem and Build Blueprint

This blueprint maps open-source components and legal/licensing requirements for an original avatar product. It is not permission to copy proprietary website source code, private backends, brands, or paid assets. A library's software licence does not automatically cover its demo avatars, voice checkpoints, datasets, or model weights.

## Important: "all avatars"

There is no single complete, legally redistributable set of every open-source AI avatar. Assets include 3D GLB/VRM characters, talking-head video models, motion models, and creator/stock assets. Some example avatars in open-source repositories are explicitly non-commercial. NKAI should ship a curated registry, bundle only assets whose exact licences permit the intended use, and support import of user-owned GLB/GLTF/VRM files.

## Component catalogue

| Component | What it provides | Licence / caveat | Integration |
|---|---|---|---|
| TalkingHead — https://github.com/met4citizen/TalkingHead | Three.js full-body GLB avatars, lip-sync, expressions, animation hooks | Library MIT; sample avatars have separate licences | Browser renderer |
| Microsoft Rocketbox — https://github.com/microsoft/Microsoft-Rocketbox | 115 rigged human characters, including facial blendshape variants; FBX source files need conversion to GLB and per-character compatibility testing | MIT repository licence | Offline avatar library after conversion |
| LiveTalking — https://github.com/lipku/LiveTalking | Real-time WebRTC/RTMP digital humans, audio/video sync, Wav2Lip/MuseTalk/ER-NeRF options | Apache-2.0 project; model checkpoints and datasets need separate licence review | Optional GPU streaming service |
| OpenVoice V2 — https://github.com/myshell-ai/OpenVoice | Cross-lingual voice-tone cloning and style control; native English, Spanish, French, Chinese, Japanese, Korean | Project states MIT and commercial use; check upstream dependencies and checkpoints | Optional TTS service |
| Indic Parler-TTS — https://huggingface.co/ai4bharat/indic-parler-tts | Neural speech across 20 Indic languages plus English, with multiple built-in voice styles | Apache-2.0 model card, but gated access requires accepting model conditions and a Hugging Face token; audit upstream dependencies | Optional gated self-hosted TTS worker |
| XTTS-v2 — https://huggingface.co/coqui/XTTS-v2 | Multilingual speech and voice cloning, including Hindi; 17 listed languages | Coqui Public Model License; do not assume commercial permission | Optional TTS adapter |
| Piper — https://github.com/rhasspy/piper and https://huggingface.co/rhasspy/piper-voices | Fast local speech with many language voices | Engine and each voice checkpoint have separate licence/metadata | Optional TTS adapter |
| Meta MMS-TTS — https://huggingface.co/models?search=facebook%2Fmms-tts | Per-language single-speaker VITS models; current worker includes English, Hindi, Tamil, Telugu, Bengali, Marathi, Punjabi, Kannada, Malayalam, French, German and Spanish | Referenced checkpoints are generally CC-BY-NC 4.0; non-commercial testing only unless separately licensed | Existing worker /tts |
| Qwen2.5 Instruct — https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct | Local/self-hosted chat generation | Check selected model's current licence and hosting terms | Existing worker /chat |

## Avatar asset policy

The TalkingHead README identifies the following example asset restrictions:

- MPFB sample mpfb.glb is described upstream as CC0; preferred redistribution-friendly starter, but verify the exact file and current metadata before bundling.
- brunette.glb is Ready Player Me and CC BY-NC 4.0; not for commercial use without a separate grant.
- avaturn.glb is described as a non-commercial example; do not bundle commercially without permission.
- avatarsdk.glb is described as a non-commercial example; do not bundle commercially without permission.
- vroid.glb is a non-commercial example; do not assume the TalkingHead MIT code licence covers it.

Do not mirror the full avatars folder into a public application. Source: https://github.com/met4citizen/TalkingHead

## Website feature benchmarks (implement original equivalents)

- HeyGen — https://www.heygen.com/: script-to-avatar video, avatar library, voice/language selection, voice cloning, translation, editor/timeline, render queue, export, team/workspace, API.
- Synthesia — https://www.synthesia.io/: presenter-led video, scene/script editor, enterprise workflow, brand templates, localisation and collaboration.
- D-ID — https://www.d-id.com/: photo-to-talking-head, interactive agents and API.
- LiveTalking: open reference for real-time streaming digital humans.
- TalkingHead: open reference for browser-based interactive 3D avatars.

Do not scrape gated libraries, copy proprietary frontend bundles, extract private APIs, or reuse proprietary model weights. Build comparable features with original UI and authorized models/APIs. Official paid APIs can be optional adapters and require the customer's own credentials and billing.

## Recommended NKAI architecture

React/TypeScript Studio: avatar catalogue and licence metadata; GLB/VRM import and local cache; TalkingHead/Three.js renderer; WebAudio and microphone; language/voice selector and subtitles; chat/streaming client.

FastAPI gateway: /health and /capabilities; /chat for Qwen or another approved local LLM; /tts with language/provider routing; optional /stt using a local Whisper model; optional /sessions and /stream for WebRTC; job queue, limits, cancellation, metrics and worker routing.

Workers: LLM worker; TTS workers (OpenVoice, XTTS, Piper, or approved MMS); optional real-time video worker (LiveTalking plus an explicitly licensed model).

## Frontend implementation checklist

1. Replace hard-coded avatar URLs with the versioned registry in src/data/avatar-catalog.json.
2. Display each avatar's source, licence, commercial-use status, size, rig/viseme compatibility and bundled/imported status.
3. Local GLB import is available in the Studio (100 MB limit, browser-session only); add GLTF/VRM import and deeper rig validation next.
4. Load TalkingHead only for compatible facial blendshapes; ordinary GLB models must not be labelled lip-sync-ready.
5. Keep selected language, TTS provider and voice ID separate. Never label an installed browser voice as a bundled neural voice.
6. Read live capability status from GET /capabilities; do not claim a worker is ready when it is offline.
7. Add audio playback, subtitles, stop/cancel, microphone permission/error states and visible attribution.
8. Require consent and rights checks before cloning voices or likenesses.

## Backend implementation checklist

1. Keep /chat and /tts behind a gateway with validation, auth, CORS allow-list, timeouts and rate limits.
2. Implement GET /capabilities to expose available providers, languages, voices and model readiness.
3. Use a TTS adapter interface: synthesize(text, language, voice_id, reference_audio) returns audio and timing/visemes.
4. Route only to compatible, installed language models. Return a structured unsupported-language error instead of claiming success.
5. Use word/phoneme timestamps or viseme IDs for accurate lip-sync. Text-length estimates are only approximations.
6. Load models lazily, cap VRAM use, clean up on eviction and limit input/output sizes.
7. Keep secrets in server environment variables; never put production worker tokens in public client code or localStorage.
8. Expose worker health and latency; do not promise 24/7 service from free notebook sessions.
9. Test supported-language routing, auth, empty text, model-load errors, audio format and health state.
10. Pin dependencies and model revisions; log each model's licence.

## Asset download strategy

Large weights and GLB files should not be committed to Git history. Use a repeatable downloader or build step to fetch approved versions into a cache/object store. Record source URL, revision/hash, byte size, licence URL, commercial status, attribution and verification date. Never bundle unknown-licence assets. Do not commit API keys, voice reference recordings or user likeness data.

## Free GPU platform reality

The frontend can rotate among already-running endpoints, but it cannot start notebooks or guarantee they stay alive. A free platform schedule is best-effort failover, not a 24/7 SLA. Use only hosting modes allowed by each provider; an always-on host can remain an optional production configuration.

## Definition of done

- Every bundled avatar has verified licence metadata and a versioned asset source.
- Every bundled voice/model has licence, language list and commercial-use status.
- UI distinguishes browser speech, local neural speech and remote neural speech.
- Every advertised language is tested with a compatible TTS model and real audio output.
- Lip-sync uses timestamps/visemes from the speech engine, not text-length estimates.
- Backend auth, rate limits, model lifecycle, errors and health are tested.
- Build/tests pass and live smoke test confirms audio from a configured worker.
