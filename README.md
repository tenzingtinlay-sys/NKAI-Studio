# NKAI Studio

NKAI Studio includes an open-source avatar chat panel with local-first AI options and an optional self-hosted GPU worker.

## Avatar features

- Interactive 3D model preview.
- Optional TalkingHead + HeadTTS mode for rigged-avatar lip-sync and English neural speech, running in the browser without a paid TTS API.
- Optional browser-local Qwen2.5-0.5B-Instruct model through Transformers.js (WebGPU first, WASM fallback). The first use downloads model files and may require substantial memory and bandwidth.
- Optional self-hosted Transformers/FastAPI GPU worker using open model weights.
- Ordered worker failover and an explicitly labeled scripted fallback.
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

## Connect an open-source GPU worker

See [GPU worker setup](gpu-worker/README.md) and the [deployment / uptime guide](gpu-worker/DEPLOYMENT.md). Set `CORS_ORIGINS` to the Studio origin and configure `WORKER_API_TOKEN` as a host secret before exposing the worker publicly.

## Important deployment note

The local browser model can provide AI responses without an inference API key, but it depends on the user's browser and device. GPU worker failover can switch between already-running endpoints; it cannot restart expired notebook sessions or guarantee 24/7 free cloud GPU access. Verify the current terms and quotas of any Colab, Kaggle, Hugging Face, or Lightning AI account before using it as a service host.

## Open-source components

- [TalkingHead](https://github.com/met4citizen/TalkingHead) — 3D avatar rendering and viseme lip-sync.
- [HeadTTS](https://github.com/met4citizen/HeadTTS) — browser neural speech and viseme timestamps.
- [Transformers.js](https://github.com/huggingface/transformers.js) — in-browser open model inference.
- [Qwen2.5-0.5B-Instruct ONNX](https://huggingface.co/onnx-community/Qwen2.5-0.5B-Instruct) — optional local browser language model.
