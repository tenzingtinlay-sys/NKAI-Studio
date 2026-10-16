---
title: NKAI Studio
emoji: 🤖
colorFrom: blue
colorTo: purple
sdk: docker
app_port: 7860
pinned: false
---

# NKAI Studio


NKAI Studio includes an open-source avatar chat panel with local-first AI options and an optional self-hosted GPU worker.

## Avatar features

- Interactive 3D model preview.
- One bundled starter avatar plus custom GLB URL and local-file support. A second bundled human avatar is pending licence-verified rigged assets.
- Optional TalkingHead + HeadTTS mode for rigged-avatar lip-sync and English neural speech, running in the browser without a paid TTS API.
- Language selector for English, Hindi, Tamil, Telugu, Bengali, Marathi, Punjabi, Kannada, Malayalam, French, German, Spanish, Chinese, Japanese, and Korean. Neural speech uses the optional `/tts` endpoint when the configured worker supports that language; installed browser voices are the fallback.
- Optional browser-local Qwen2.5-0.5B-Instruct model through Transformers.js (WebGPU first, WASM fallback). The first use downloads model files and may require substantial memory and bandwidth.
- Optional self-hosted Transformers/FastAPI GPU worker using open model weights.
- Same-origin private AI gateway routes for chat, TTS, health, and capability checks. Worker addresses and bearer tokens remain server-side.
- An in-app deployment diagnostics page at `/deployment` that checks the live AI, voice, and streaming endpoints.

## Cost and API policy

The core studio must not depend on paid inference APIs, prepaid API credits, or a paid API billing balance. Use browser-local inference or open-weight models on the selected permitted compute platform. Do not add a paid API as a silent fallback. If all eligible free workers are unavailable or over quota, explain that service is temporarily unavailable and allow retry/provider failover. Free platforms can still impose compute, session, queue, storage and usage limits; this project does not claim unlimited free GPU uptime. Hosting tokens such as `HF_TOKEN` are deployment credentials, not paid inference credits, and must remain private.

## Optional Indic-Speak multilingual voice worker

The app now has a separate worker adapter for the Hindi voice model successfully tested in Colab: [Indic-Speak worker setup](gpu-worker/indic-speak/README.md). It is isolated from the existing chat/MMS worker because it requires Transformers v5, while the existing worker pins Transformers below v5. The new adapter is code only; the several-gigabyte model still must be downloaded on an authorized GPU host, and the host must be configured in the app's server-side TTS gateway before the app can use it. The model is gated, so set a private Hugging Face token after accepting its current access conditions. Confirm the current model licence and access terms before public or commercial use. Indic-Speak covers English and Indian languages; it does not replace all global-language voice providers. Full streaming audio and live GPU deployment are not yet verified.

## Optional LiveTalking gateway

For self-hosted real-time WebRTC avatar streaming, start with [the ordered live-avatar guide](LIVE-AVATAR.md) and [Cloudflare gateway setup](gateway/README.md). This path is optional: browser-local avatar/chat remains available without a GPU host. Live video is not considered working until a real browser WebRTC session receives audio/video from a running LiveTalking host.

## Deploy the AI worker

See [Lightning AI worker deployment and end-to-end test guide](gpu-worker/LIGHTNING_AI_DEPLOYMENT.md) for the chat worker, optional natural-speech worker, and LiveTalking deployment boundaries.

## Run the Studio

Install Node.js 22+, then:

```bash
npm ci
npm run dev
```

Run checks:

```bash
npm run typecheck
npm test
npm run build
```

## Avatar assets and model licences

- Run `npm run assets:download` to download the approved MPFB starter avatar into `public/assets/avatars/` and write its SHA-256 provenance record. CI runs this step before building.
- Run `npm run assets:rocketbox` to download Microsoft's MIT-licensed Rocketbox collection into `downloads/third-party/Microsoft-Rocketbox/`. It contains FBX assets rather than browser-ready GLB files; use the [Blender conversion guide](docs/ROCKETBOX_CONVERSION.md) to export one character or run `npm run assets:rocketbox:all` to batch-convert the downloaded library into an ignored local GLB cache and inspect per-character morph-target reports. The collection is ignored by Git so large binaries are not committed.
- Review the [AI avatar ecosystem and build blueprint](docs/AI_AVATAR_ECOSYSTEM.md), [product parity matrix](docs/PRODUCT_PARITY_MATRIX.md), and [avatar/voice registry](src/data/avatar-catalog.json) before bundling or redistributing assets.
- Optional multilingual voice cloning worker: [OpenVoice V2 setup](gpu-worker/OPENVOICE_SETUP.md)
- The TalkingHead library is MIT, but its sample avatars do not all share that licence. Some examples are non-commercial or CC BY-NC. Do not bundle them in a commercial app without permission.
- The current MMS-TTS voice worker supports the languages listed in the registry, but those checkpoints are generally CC-BY-NC 4.0. Commercial deployments need an appropriately licensed TTS engine/checkpoint, such as a separately audited OpenVoice V2 setup for its supported languages.

## Run both AI workers with Docker Compose

For a combined Qwen chat worker and OpenVoice V2 multilingual voice worker, use [docker-compose.ai-workers.yml](docker-compose.ai-workers.yml), the [safe environment template](.env.example), and the [deployment guide](gpu-worker/AI_WORKERS_COMPOSE.md). This requires a GPU-capable Docker host, a private authorized reference recording, and a configured worker token; first startup downloads large model weights.

## Connect an open-source GPU worker

See [GPU worker setup](gpu-worker/README.md) and the [deployment / uptime guide](gpu-worker/DEPLOYMENT.md). The multilingual MMS-TTS checkpoints currently use CC-BY-NC 4.0; use them for non-commercial testing only unless you have a separate licence that permits your use. See the worker README before deploying them. Set `CORS_ORIGINS` to the Studio origin and configure `WORKER_API_TOKEN` as a host secret before exposing the worker publicly.

## Important deployment note

The local browser model can provide AI responses without an inference API key, but it depends on the user's browser and device. Configure `AI_WORKER_INTERNAL_URL` and optionally `AI_WORKER_API_TOKEN` as server-side environment variables on the deployment host; never paste public worker URLs or secrets into the browser. Configure `LIVETALKING_INTERNAL_URL` for the embedded streaming workspace. The full-stack app must run on a server host that supports the Nitro server routes; a static-only host such as GitHub Pages cannot execute these routes. The deployment target for this project is Hugging Face Spaces (Docker), not Vercel. See `docs/FOUR_PLATFORM_DEPLOYMENT.md`. No setup can guarantee unlimited 24/7 free remote GPU compute. Visit `/deployment` on the deployed app to check which services are actually responding.

## Open-source components

- [TalkingHead](https://github.com/met4citizen/TalkingHead) — 3D avatar rendering and viseme lip-sync.
- [HeadTTS](https://github.com/met4citizen/HeadTTS) — browser neural speech and viseme timestamps.
- [Transformers.js](https://github.com/huggingface/transformers.js) — in-browser open model inference.
- [Qwen2.5-0.5B-Instruct ONNX](https://huggingface.co/onnx-community/Qwen2.5-0.5B-Instruct) — optional local browser language model.

## Unified runtime

See `docs/UNIFIED_AI_RUNTIME.md` for the server-side timed worker-pool design.

## Build the embedded LiveTalking runtime

The in-app LiveTalking panel is backed by the existing same-origin adapter. To package the upstream engine for a permitted NVIDIA GPU host, use [the LiveTalking container setup](deploy/livetalking/README.md). It builds the upstream open-source engine and mounts model/avatar files separately; it does not include or redistribute checkpoints. Real WebRTC audio/video still requires a running GPU host and working ICE/UDP (or TURN) networking.
