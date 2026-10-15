# Optional Indic Parler-TTS worker

This optional worker provides neural speech for 20 Indian languages plus English, using the Apache-2.0 `ai4bharat/indic-parler-tts` model. The model is gated on Hugging Face: the operator must accept the model conditions and configure a Hugging Face token as the server-side `HF_TOKEN` secret. It does not clone voices; it uses model-provided voice styles. Model weights are large and require a suitable GPU for practical latency.

## Install

Use Python 3.10+ and a compatible PyTorch/CUDA stack:

```bash
pip install -r gpu-worker/requirements-indic-parler.txt
```

Accept the model conditions at https://huggingface.co/ai4bharat/indic-parler-tts, create a Hugging Face token with permission to read that model, and set:

```bash
export HF_TOKEN='your-hugging-face-read-token'
export WORKER_API_TOKEN='a-long-random-worker-secret'
export CORS_ORIGINS='https://YOUR-STUDIO-HOST'
uvicorn gpu-worker.indic_parler_app:app --host 0.0.0.0 --port 7862
```

For a direct module launch from the `gpu-worker` directory, use `uvicorn indic_parler_app:app --host 0.0.0.0 --port 7862`.

## API

- `GET /health` reports model, authentication and gate readiness.
- `GET /capabilities` lists supported languages and default voice labels.
- `POST /tts` accepts `{"text":"नमस्ते","language":"hi-IN"}` and returns base64 WAV audio.
- `/chat` intentionally returns HTTP 501; configure a separate chat worker.

In the Studio, add the worker's HTTPS endpoint ending in `/chat` to the endpoint list. The UI derives `/tts` for speech and sends the same `WORKER_API_TOKEN`. Put this worker ahead of MMS-TTS for Indian languages if you want to avoid MMS's CC-BY-NC model terms. OpenVoice can be first for English, Spanish, French, Chinese, Japanese and Korean.

## Model access, licence and runtime

The model card identifies the model as Apache-2.0 but requires agreeing to its gated access conditions. Check the model card, license text, upstream Parler-TTS dependency and any current access conditions before commercial use. Do not put `HF_TOKEN` or `WORKER_API_TOKEN` in the browser or commit them to Git. A 0.9B model still needs substantial RAM/VRAM and first-time downloads; this optional worker is not bundled into the default worker or the Compose stack.
