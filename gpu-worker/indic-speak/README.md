# NKAI Studio — Indic-Speak voice worker

This is an **optional, separate** multilingual speech service for the NKAI Studio app. It uses the model that was successfully tested in Colab: `bodhan-ai/indic-speak`. It does not bundle model weights in Git; the first startup downloads several gigabytes from Hugging Face.

## Important separation

The existing chat/MMS worker pins Transformers below version 5. Indic-Speak requires Transformers 5 or newer, so keep this service isolated rather than upgrading the existing worker in place.

## Access and model terms

The model repository is gated. First accept the model's current access conditions on Hugging Face, then provide an authorized `HF_TOKEN` as a **private host secret**. Do not commit tokens, model weights, or private reference audio. Review the model card and licence/terms before using the model in a public or commercial product. Do not assume that access approval alone grants commercial rights.

## Run on a GPU host

Use a GPU host that supports persistent HTTP services and the model's required GPU runtime. On the host, set these environment secrets/configuration values:

- `HF_TOKEN`: authorized Hugging Face read token, configured as a host secret.
- `WORKER_API_TOKEN`: a long random secret shared only with NKAI Studio's server-side gateway.
- `CORS_ORIGINS`: exact deployed NKAI Studio origin(s), comma-separated.
- Optional `INDIC_SPEAK_MODEL_ID`: defaults to `bodhan-ai/indic-speak`.
- Optional `INDIC_SPEAK_SPEAKER`: defaults to `Amit`.

Build from this directory and deploy the container on the GPU host. The host must have enough GPU memory and disk space for the full model; verify startup and a real generated WAV before marking the service ready. Lightning AI is the preferred first hosting target for NKAI Studio, subject to its current service/networking limits.

## HTTP contract

- `GET /health`: reports readiness.
- `GET /capabilities`: reports the provider and declared language set.
- `POST /tts`: accepts JSON such as `{"text":"नमस्ते, NKAI Studio में आपका स्वागत है।","language":"hi-IN","speaker":"Amit"}`; returns `audio_base64`, `mime_type`, and sample rate.

The `language` field is metadata for the caller; this adapter passes the text to the model and does not claim a separate language-forcing parameter. Test each language and speaker before exposing it in the selector. The output is a complete WAV, not incremental audio chunks, so true low-latency streaming remains a separate task.

## Connect to NKAI Studio

Configure `AI_TTS_INTERNAL_URL` to this service's private HTTPS origin and `AI_TTS_API_TOKEN` to the matching `WORKER_API_TOKEN` in the app host's server-side environment. The existing same-origin `/api/ai/tts` gateway routes to this dedicated TTS service while chat remains on `AI_WORKER_INTERNAL_URL`. Keep both values on the server; never put them in browser code. The gateway expects `POST /tts` with a JSON body and a response containing `audio_base64` and `mime_type`.

After deployment, verify `/health`, `/capabilities`, and a real `/tts` request from the Studio gateway. This guide and adapter do not themselves deploy the service or prove that a live host is running.

## Language coverage

Indic-Speak targets English and Indian languages, including languages outside the existing MMS-TTS list. It is not a universal global-language model. Keep the existing voice providers for other supported languages and choose a provider based on tested coverage and its licence. Never advertise a language as voice-enabled until an actual audio test passes.
