# Optional Indic Parler-TTS worker

This optional worker provides neural speech for 20 Indian languages plus English, using the Apache-2.0 `ai4bharat/indic-parler-tts` model. The model is gated on Hugging Face: the operator must accept the model conditions and configure a Hugging Face token as the server-side `HF_TOKEN` secret. It does not clone voices; it uses model-provided voice styles. Model weights are large and require a suitable GPU for practical latency. After deployment, verify actual audio with `python gpu-worker/smoke_test_openvoice.py https://YOUR-HOST --test-tts --consent-confirmed --language hi-IN --voice "A female speaker" --output hindi-test.wav`. The smoke-test script works with any compatible NKAI `/health`, `/capabilities`, and `/tts` worker despite its filename.

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
cd gpu-worker && uvicorn indic_parler_app:app --host 0.0.0.0 --port 7862
```

For a direct module launch from the `gpu-worker` directory, use `uvicorn indic_parler_app:app --host 0.0.0.0 --port 7862`.

## Docker option

From the repository root, build with the worker directory as the context:

```bash
docker build -f gpu-worker/Dockerfile.indic-parler -t nkai-indic-parler-worker ./gpu-worker
```

Create a private env file (do not commit it) with `HF_TOKEN`, `WORKER_API_TOKEN`, and `CORS_ORIGINS`, then run:

```bash
docker run --rm --gpus all --env-file gpu-worker/.env -v nkai-indic-parler-cache:/root/.cache/huggingface -p 7862:7862 nkai-indic-parler-worker
```

The container downloads the gated model at startup. Use a persistent model cache/volume on the target host if you need to avoid downloading the model again after a restart. Never bake the Hugging Face token into the image.

## API

- `GET /health` reports model, authentication and gate readiness.
- `GET /capabilities` lists supported languages and default voice labels.
- `POST /tts` accepts `{"text":"नमस्ते","language":"hi-IN"}` and returns base64 WAV audio.
- `/chat` intentionally returns HTTP 501; configure a separate chat worker.

In the Studio, add the worker's HTTPS endpoint ending in `/chat` to the endpoint list. The UI derives `/tts` for speech and sends the same `WORKER_API_TOKEN`. A practical endpoint order is OpenVoice first, Indic Parler second, then your chat worker; add MMS-TTS only as a fallback if its CC-BY-NC model terms are acceptable for your use. OpenVoice handles English, Spanish, French, Chinese, Japanese and Korean; Indic Parler handles Indian languages. For chat requests, both TTS-only workers return HTTP 501 and the Studio continues to the chat worker.

## Model access, licence and runtime

The model card identifies the model as Apache-2.0 but requires agreeing to its gated access conditions. Check the model card, license text, upstream Parler-TTS dependency and any current access conditions before commercial use. Do not put `HF_TOKEN` or `WORKER_API_TOKEN` in the browser or commit them to Git. A 0.9B model still needs substantial RAM/VRAM and first-time downloads; this optional worker is not bundled into the default worker or the Compose stack.
