# OpenVoice container deployment

This container packages OpenVoice V2 + MeloTTS and the NKAI worker API. It is intended for a GPU host that explicitly permits a persistent inference service; it is not a way to keep a free notebook alive indefinitely.

## Build

Run from the repository root:

```bash
docker build -f gpu-worker/Dockerfile.openvoice -t nkai-openvoice-worker .
```

The image installs Python 3.9, the OpenVoice and MeloTTS code, and a CUDA 11.8 PyTorch wheel. The image is large. On a compatible NVIDIA host, use NVIDIA Container Toolkit. CPU fallback is possible but can be slow.

## Run

Create a private folder for the authorized reference audio and persist the checkpoints. Do not commit the recording or model weights to Git.

```bash
mkdir -p ./openvoice-checkpoints ./voice-secrets
# Place an authorized voice recording at ./voice-secrets/voice-reference.wav
docker run --rm --gpus all -p 7861:7861 \
  -e WORKER_API_TOKEN='replace-with-a-long-random-secret' \
  -e CORS_ORIGINS='https://YOUR-STUDIO-HOST' \
  -e OPENVOICE_CHECKPOINT_ROOT=/opt/OpenVoice/checkpoints_v2 \
  -e OPENVOICE_REFERENCE_AUDIO=/run/secrets/voice-reference.wav \
  -v "$PWD/openvoice-checkpoints:/opt/OpenVoice/checkpoints_v2" \
  -v "$PWD/voice-secrets/voice-reference.wav:/run/secrets/voice-reference.wav:ro" \
  nkai-openvoice-worker
```

On first start, the entrypoint downloads the official checkpoint archive when the volume is empty, then starts the API. Keep enough disk space for the archive and extracted weights. Subsequent starts reuse the mounted checkpoint directory. Set `DOWNLOAD_OPENVOICE_CHECKPOINTS=false` if you pre-populate it.

## Verify actual speech

```bash
WORKER_API_TOKEN='replace-with-a-long-random-secret' \
  python gpu-worker/smoke_test_openvoice.py http://localhost:7861
WORKER_API_TOKEN='replace-with-a-long-random-secret' \
  python gpu-worker/smoke_test_openvoice.py http://localhost:7861 --test-tts --consent-confirmed --language en-US --output nkai-test.wav
```

Then configure the Studio worker endpoint as `https://YOUR-OPENVOICE-HOST/chat` (the TTS router derives `/tts` from it). The OpenVoice service intentionally returns HTTP 501 for `/chat`; put a separate language-model worker in the same ordered endpoint list for generated chat.

The container cannot create a hosting account, set provider secrets, obtain a GPU, or publish a public HTTPS hostname. Those are host-side deployment requirements.
