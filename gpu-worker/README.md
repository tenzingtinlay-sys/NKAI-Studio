# NKAI Studio open-source GPU worker

This optional worker gives the NKAI Studio avatar generated answers using open model weights. It does not use a paid AI API or API key. The first launch downloads the model weights, so the host needs outbound access to Hugging Face.

## Model

Default: `Qwen/Qwen2.5-1.5B-Instruct`. Set `MODEL_ID` to another compatible Hugging Face Transformers causal language model if desired. Check each model's license and hosting terms before use.

## Run on a GPU host that permits persistent inference services

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 7860
```

On Windows, activate with `.venv\\Scripts\\activate`. Set `CORS_ORIGINS` to the exact NKAI Studio origin in production. The default `*` is convenient for a temporary test, not ideal for a public deployment.

For a public endpoint, set a long random `WORKER_API_TOKEN` environment secret on the worker host. Paste the same token into the avatar panel's **Optional worker access token** field. The token is sent only as an HTTPS Bearer header and is not saved by the browser UI. If `WORKER_API_TOKEN` is unset, `/chat` remains unauthenticated, which is suitable only for a private test.

## Build a GPU Docker image

From the `gpu-worker` directory on a machine with Docker and NVIDIA Container Toolkit:

```bash
docker build -t nkai-open-source-worker .
docker run --rm --gpus all -p 7860:7860 \
  -e MODEL_ID=Qwen/Qwen2.5-1.5B-Instruct \
  -e CORS_ORIGINS=https://YOUR-STUDIO-ORIGIN \
  -e WORKER_API_TOKEN=YOUR_LONG_RANDOM_SECRET \
  nkai-open-source-worker
```

Use your host's secret manager rather than putting the real token into shell history or a committed file. The first startup downloads model weights. A compatible NVIDIA driver and container toolkit are required for GPU mode; otherwise use a host with a supported GPU runtime.

## Connect the UI

In NKAI Studio's **Open-source AI Avatar** panel, set the worker URL to the HTTPS URL ending in `/chat`. The UI sends JSON shaped like `{ "message": "...", "history": [...] }` and expects `{ "reply": "..." }`. A `GET /health` endpoint reports model readiness and is used by the connection-check button. Configure CORS to include the Studio origin and the `Authorization` header when using a token.

## About free GPU notebooks

This is worker code, not a promise that any notebook tier permits or will keep a public web service running. Colab, Kaggle, Hugging Face, and Lightning AI have different session, networking, and usage rules. Use only deployment modes explicitly allowed by the platform; the browser UI automatically falls back if the worker goes offline. A notebook restart or free-tier quota cannot be used to guarantee 24/7 GPU inference.

## Hardware

A T4-class GPU is a reasonable starting point for this 1.5B model in FP16. CPU fallback is supported for testing but can be slow. Initial model download and load take time.
