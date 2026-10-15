# NKAI Studio worker deployment guide

## What is already implemented

- The Studio avatar panel accepts multiple HTTPS `/chat` endpoints in priority order.
- It tries each endpoint, then switches to an explicitly labeled local scripted fallback if all workers fail.
- The FastAPI worker exposes `GET /health` and `POST /chat`.
- Optional bearer-token protection is available through the `WORKER_API_TOKEN` environment variable.
- Model weights are open-source Hugging Face weights; the worker does not call a paid model API.

## Deploy the FastAPI worker

Use a host that explicitly permits a persistent HTTP inference service and has enough GPU memory for the model.

1. Deploy the `gpu-worker` directory or build from the repository root with `gpu-worker` as the service root.
2. Install `gpu-worker/requirements.txt`.
3. Start the service with `uvicorn app:app --host 0.0.0.0 --port 7860`.
4. Set `MODEL_ID=Qwen/Qwen2.5-1.5B-Instruct`.
5. Set `CORS_ORIGINS` to the exact deployed NKAI Studio origin.
6. Set a long random `WORKER_API_TOKEN` as a host secret.
7. Confirm `GET https://YOUR-HOST/health` returns JSON with `"status":"ready"`.
8. In the Studio avatar panel, add `https://YOUR-HOST/chat` and paste the same token into the optional token field.
9. To configure failover, add a second independently deployed worker URL on the next line.

Do not commit tokens, passwords, or provider credentials to GitHub.


## Lightning AI setup

Lightning AI documents public app hosting through its [Host web apps guide](https://lightning.ai/docs/platform/build/host-web-apps) and production deployments through [Deploy a Studio](https://lightning.ai/docs/platform/build/ai-studio/deploy-a-studio). Deploy the `gpu-worker` service with port `7860` exposed and health check path `/health`. Keep `WORKER_API_TOKEN` in the platform's secret manager, then copy the resulting HTTPS `/chat` URL into the Lightning AI schedule slots in NKAI Studio. The endpoint must also expose `/tts` on the same origin for multilingual neural speech.

## Timed platform rotation

In the Studio UI, each schedule line uses `platform name | hours | HTTPS /chat URL`. The default cycle is four hours on Lightning AI, twelve hours on Kaggle, then two four-hour Lightning AI windows. Add a real endpoint URL to each slot. The scheduler saves its clock in this browser, chooses the current slot first, and tries other configured endpoints if needed. It does not create, start, or restart provider sessions.

Provider limits still apply: Colab free tier must not be used to offer a web service; ZeroGPU's free quota is too short for continuous serving; and Kaggle session/weekly quotas may prevent a daily twelve-hour slot. Lightning free Studios restart every four hours. Use only hosting modes permitted by each provider.

## Free GPU services: practical limits

- **Google Colab:** useful for experiments, but notebook sessions and inbound/public networking are not a guaranteed always-on production service. Use only a deployment mode allowed by Colab's current terms.
- **Kaggle notebooks:** useful for testing model inference, but notebook runtimes are session-limited and are not a guaranteed permanent public API server. Do not use background keep-alive workarounds to evade limits.
- **Hugging Face ZeroGPU:** it allocates GPU time on demand and has quotas. The published free-account quota is limited (currently documented as 5 minutes of GPU time per day for hosting/using ZeroGPU), so it is not a 24-hour inference host. ZeroGPU Spaces also require the Gradio SDK; this FastAPI worker is not a drop-in ZeroGPU Space.
- **Hugging Face regular GPU Spaces / other persistent GPU hosts:** check current hardware pricing, grants, sleep policy, and account eligibility. Persistent GPU time may require paid hardware or an approved grant.
- **Lightning AI:** check the current account's free compute quota, public endpoint availability, and runtime/sleep policy before treating it as an always-on worker.

Free notebook providers can be configured as temporary workers only when their current rules allow the needed endpoint. A chain of endpoints improves recovery when another worker is already running, but it cannot start a notebook that has shut down or guarantee 24/7 free compute.

## Acceptance checklist

- [ ] `GET /health` returns `status: ready`.
- [ ] `POST /chat` with JSON `{"message":"Say hello","history":[]}` returns `{"reply":"..."}`.
- [ ] An invalid token returns HTTP 401 when `WORKER_API_TOKEN` is configured.
- [ ] A valid token returns a model-generated reply.
- [ ] The deployed Studio origin can call the worker without a CORS error.
- [ ] A second worker can be added and selected when the first is unreachable.
- [ ] Browser fallback is clearly labeled as scripted, not as model-generated AI.
- [ ] Session continuity has been tested across an actual provider restart before claiming 24/7 availability.
