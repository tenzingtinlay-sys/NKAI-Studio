# Duix Avatar research deployment for NKAI Studio

## Current status

This is a research deployment plan, not a claim that Duix is running. The ZIP has now been extracted into [`vendor/duix-avatar/source/Duix-Avatar-main`](../../vendor/duix-avatar/source/Duix-Avatar-main), and the original archive remains in Git LFS at `vendor/duix-avatar/Duix-Avatar-main.zip`. The extracted upstream project is a standalone Electron/Vue desktop application plus a Docker-backed offline avatar/video-generation stack; it is not a React component that can simply be imported into the NKAI web Studio. NKAI Studio's existing LiveTalking adapter is a separate integration and is not compatible with Duix endpoints.

## Target architecture

- **LLM:** keep the existing authenticated Qwen worker (`Qwen/Qwen2.5-1.5B-Instruct`) on Google Colab.
- **Speech/video:** validate Duix services independently before connecting them. Duix's documented full stack uses ASR, TTS and video-generation containers and exposes local service ports including 18180 and 8383.
- **Studio backend:** add a dedicated Duix adapter only after the real service request/response contracts have been tested. Do not point `LIVETALKING_INTERNAL_URL` at Duix: the existing route and browser panel expect LiveTalking's offer/human/interrupt API and WebRTC behavior.
- **Secrets:** keep `WORKER_API_TOKEN` and any new internal service tokens in runtime secrets, never in committed notebook output, source files or browser code.

## Run the Docker services on a compatible NVIDIA Linux host

A Linux-host Docker Compose stack is provided in this directory. It defines the upstream Duix ASR, TTS and video-generation containers, uses configurable persistent data paths, and binds ports to loopback so they are not directly exposed to the public internet.

**Requirements:** NVIDIA GPU and driver, Docker Engine with Compose v2, NVIDIA Container Toolkit, adequate disk (upstream guidance recommends 100 GB+ free; images/model downloads may be tens of GB). A normal Google Colab notebook runtime is not a supported Docker host; do not stop or alter the working Qwen Colab worker to try this.

From the repository root on that Linux host:

```bash
cd deploy/duix-avatar
cp .env.example .env
# Edit .env and set DUIX_DATA_DIR to an absolute persistent directory with enough disk space.
./../../scripts/run-duix-docker.sh
```

The script checks Docker daemon and GPU passthrough before downloading images, then pulls and starts all three services. It is deliberately fail-fast: if Docker/GPU access is unavailable, it exits before pulling large images. To inspect services, run `docker compose --env-file .env ps` and `docker compose --env-file .env logs -f`; stop them with `docker compose --env-file .env down`. First boot can download tens of GB and may take a long time. These containers are **not yet connected to NKAI's web runtime**, and their endpoints are loopback-only.

## Step 1 — preflight the active Colab runtime

Run this before downloading any model or Docker image:

```python
import os, shutil, subprocess, torch

print("Python:", __import__("sys").version)
print("PyTorch:", torch.__version__)
print("CUDA available:", torch.cuda.is_available())
if torch.cuda.is_available():
    print("GPU:", torch.cuda.get_device_name(0))
    print("GPU memory (GiB):", round(torch.cuda.get_device_properties(0).total_memory / 1024**3, 2))

usage = shutil.disk_usage("/")
print("Root disk free (GiB):", round(usage.free / 1024**3, 2))
print("Docker executable:", shutil.which("docker"))

if shutil.which("docker"):
    p = subprocess.run(["docker", "info"], text=True, capture_output=True, timeout=20)
    print("Docker info exit:", p.returncode)
    print((p.stdout or p.stderr)[-3000:])
else:
    print("Docker CLI is absent. Do not try to start the official Duix compose stack in this runtime.")
```

### Go/no-go criteria

Do not proceed with the official Docker stack unless all of the following are true:

1. A CUDA GPU is available.
2. Docker daemon access succeeds (not just the Docker CLI).
3. The Docker runtime can access the NVIDIA GPU.
4. Available storage and memory are sufficient for the images and model data.
5. You have confirmed the stack can coexist with the already-running Qwen process.

A failed Docker/GPU-container check means this Colab session is not a supported place to run the official Duix stack as documented. Keep Qwen running and use a compatible NVIDIA host for Duix, or choose a separately licensed, Colab-compatible avatar/voice implementation.

## Step 2 — verify the existing Qwen worker remains healthy

Use the existing authenticated `/capabilities` check and chat smoke test already used for the NKAI worker. Never print the token. Expected capability fields include `chat: true`, `streaming: true`, and the current worker model name. The current worker previously reported `tts: false`, so do not treat Qwen chat as a speech-generation endpoint.

## Step 3 — verify Duix services locally before exposing them

The upstream project's documented service ports include:

- TTS: host port `18180`
- Video generation: host port `8383`
- ASR: host port `10095`

These are local service ports from the upstream compose configuration, not public URLs and not yet NKAI routes. Start with the upstream's current compose files and instructions; inspect health/logs and test the actual model-training, synthesis and video-generation API payloads. Do not expose these ports directly to the public internet.

## Step 4 — bridge only validated APIs into NKAI Studio

The existing `/api/livetalking/*` adapter is deliberately restricted to LiveTalking paths and expects its WebRTC signaling contract. Do not reuse it for Duix by changing only an environment variable.

A Duix integration should have its own server-only adapter with:
- allowlisted actions (health, voice synthesis, avatar/video generation);
- request schema and body-size validation;
- authenticated user session and rate limits;
- upstream timeouts and bounded job polling;
- private service URL/token configuration;
- clear asynchronous job status for long video renders;
- tests using mocked upstream responses before a live GPU test.

For Colab, use an authenticated HTTPS tunnel only after the backend is running and protected. Keep any tunnel credential and worker tokens in Colab secrets/environment variables. Never commit public tunnel URLs as permanent service endpoints; Colab sessions can change.

## Licensing and attribution

Keep the upstream licence and required attribution with the research integration. The extracted source retains `LICENSE` and both language versions of the model community licensing agreement, and includes the required `NOTICE` text file. The app UI must prominently display **Built with DUIX.COM** when distributing or making the integration available. Research intent does not waive these terms. This repository's current intended use is research-only/non-commercial; do not deploy commercially or exceed the licence's 1,000 monthly-active-user condition without the required separate commercial grant. Review model, voice, Docker-image, and bundled dependency terms separately.

## Acceptance checklist

- [ ] Colab GPU and disk preflight recorded.
- [ ] Docker daemon and NVIDIA-container support verified, or Colab rejected for Duix.
- [ ] Existing Qwen capabilities and chat smoke tests still pass.
- [ ] Duix TTS request succeeds and returns playable audio.
- [ ] Duix video-generation request succeeds and returns a playable video.
- [ ] NKAI backend adapter passes schema, auth, timeout and mocked tests.
- [ ] End-to-end Studio test uses Qwen response -> speech -> avatar video.
- [ ] Attribution/licence notices retained.
- [ ] No secrets, private tunnel credentials, or large model weights committed.

## References

- Upstream repository: https://github.com/duixcom/Duix-Avatar
- Upstream compose file: https://github.com/duixcom/Duix-Avatar/blob/main/deploy/docker-compose.yml
- Google Colab FAQ: https://research.google.com/colaboratory/faq.html


## Extraction result

- Source directory: `vendor/duix-avatar/source/Duix-Avatar-main`
- GitHub Actions extraction run: https://github.com/tenzingtinlay-sys/NKAI-Studio/actions/runs/38932831040
- Extraction workflow result: successful; source was committed to `main`.
- The source extraction is **not** a successful runtime deployment. The Duix Docker services, GPU models, and NKAI web adapter have not yet been launched or verified.
