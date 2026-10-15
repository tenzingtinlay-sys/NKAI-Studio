# NKAI Studio

NKAI Studio includes an open-source avatar chat panel with local-first AI options and an optional self-hosted GPU worker.

## Avatar features

- Interactive 3D model preview.
- Multiple sample rigged avatar presets plus custom GLB URL support.
- Optional TalkingHead + HeadTTS mode for rigged-avatar lip-sync and English neural speech, running in the browser without a paid TTS API.
- Language selector for English, Hindi, Tamil, Telugu, Bengali, Marathi, Punjabi, Kannada, Malayalam, French, German, and Spanish. Non-English neural speech uses the optional `/tts` endpoint in the GPU worker; installed browser voices are the fallback.
- Optional browser-local Qwen2.5-0.5B-Instruct model through Transformers.js (WebGPU first, WASM fallback). The first use downloads model files and may require substantial memory and bandwidth.
- Optional self-hosted Transformers/FastAPI GPU worker using open model weights.
- Persistent timed platform rotation (configured hours and endpoint per slot), ordered worker failover, and an explicitly labeled scripted fallback.
- Optional bearer-token protection for the GPU worker.

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
- Run `npm run assets:rocketbox` to download Microsoft's MIT-licensed Rocketbox collection into `downloads/third-party/Microsoft-Rocketbox/`. It contains FBX assets rather than browser-ready GLB files; use the [selected-character Blender conversion guide](docs/ROCKETBOX_CONVERSION.md) and `scripts/blender/convert_rocketbox_to_glb.py` to export one character to GLB and inspect its morph-target report. The collection is ignored by Git so large binaries are not committed.
- Review the [AI avatar ecosystem and build blueprint](docs/AI_AVATAR_ECOSYSTEM.md), [product parity matrix](docs/PRODUCT_PARITY_MATRIX.md), and [avatar/voice registry](src/data/avatar-catalog.json) before bundling or redistributing assets.
- Optional multilingual voice cloning worker: [OpenVoice V2 setup](gpu-worker/OPENVOICE_SETUP.md). It requires its own model checkpoints and an authorized reference voice recording; it is not automatically installed with the default worker.
- The TalkingHead library is MIT, but its sample avatars do not all share that licence. Some examples are non-commercial or CC BY-NC. Do not bundle them in a commercial app without permission.
- The current MMS-TTS voice worker supports the languages listed in the registry, but those checkpoints are generally CC-BY-NC 4.0. Commercial deployments need an appropriately licensed TTS engine/checkpoint, such as a separately audited OpenVoice V2 setup for its supported languages.

## Connect an open-source GPU worker

See [GPU worker setup](gpu-worker/README.md) and the [deployment / uptime guide](gpu-worker/DEPLOYMENT.md). The multilingual MMS-TTS checkpoints currently use CC-BY-NC 4.0; use them for non-commercial testing only unless you have a separate licence that permits your use. See the worker README before deploying them. Set `CORS_ORIGINS` to the Studio origin and configure `WORKER_API_TOKEN` as a host secret before exposing the worker publicly.

## Important deployment note

The local browser model can provide AI responses without an inference API key, but it depends on the user's browser and device. GPU worker failover can switch between already-running endpoints; it cannot restart expired notebook sessions or guarantee 24/7 free cloud GPU access. Verify the current terms and quotas of any Colab, Kaggle, Hugging Face, or Lightning AI account before using it as a service host.

## Open-source components

- [TalkingHead](https://github.com/met4citizen/TalkingHead) — 3D avatar rendering and viseme lip-sync.
- [HeadTTS](https://github.com/met4citizen/HeadTTS) — browser neural speech and viseme timestamps.
- [Transformers.js](https://github.com/huggingface/transformers.js) — in-browser open model inference.
- [Qwen2.5-0.5B-Instruct ONNX](https://huggingface.co/onnx-community/Qwen2.5-0.5B-Instruct) — optional local browser language model.
