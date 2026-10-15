# Run both NKAI inference workers with Docker Compose

This Compose file starts the chat model and OpenVoice V2 voice worker together. It needs Docker Compose with GPU support, a compatible NVIDIA driver/Container Toolkit, internet access for first-time model downloads, and a voice recording you own or are explicitly authorized to use.

1. Create a private voice folder and put the authorized reference recording at `voice-secrets/voice-reference.wav`. Keep this folder out of Git.
2. Set a strong shared token and the Studio origin in your shell (or a private ignored `.env` file):

```bash
export WORKER_API_TOKEN='replace-with-a-long-random-secret'
export CORS_ORIGINS='http://localhost:3000'
docker compose -f docker-compose.ai-workers.yml up --build
```

The first build/download is large. The chat worker downloads Qwen weights on first startup; OpenVoice downloads its official checkpoint archive on first startup. Keep the `openvoice-checkpoints` volume to avoid re-downloading the OpenVoice checkpoints. The model cache for the chat worker may also be persisted by your Docker runtime.

In the Studio, set worker endpoints in this order:

```text
http://localhost:7861/chat
http://localhost:7860/chat
```

The OpenVoice service intentionally returns HTTP 501 for chat requests, so the Studio proceeds to the Qwen chat worker. For speech, OpenVoice is tried first; check the voice-consent box to authorize use of the configured reference recording. If OpenVoice speech is not ready or consent is not confirmed, the Studio tries the next worker, which may use MMS-TTS. The MMS-TTS checkpoints have non-commercial terms; review the model card before commercial use.

For remote browser use, publish each service behind HTTPS, set `CORS_ORIGINS` to the actual Studio origin, and keep the token in a host secret manager. Do not expose these local HTTP URLs to a remote HTTPS website. This file does not deploy a public hostname or bypass hosting-platform GPU/session rules.
