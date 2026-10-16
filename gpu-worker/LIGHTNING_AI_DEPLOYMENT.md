# Lightning AI deployment plan for NKAI Studio

This guide prepares NKAI's existing worker for Lightning AI. It does **not** create a Lightning account, provision a GPU, publish a container, or spend credits automatically.

## Recommended split

Use two independently deployable services so text generation, natural speech, and real-time video do not compete for one small GPU:

1. **Chat worker** — `gpu-worker/app.py`, exposing `/health`, `/capabilities`, `/chat`, and the fallback `/tts`.
2. **Natural voice worker (optional)** — `gpu-worker/openvoice_app.py`, exposing `/health`, `/capabilities`, and `/tts`. This needs the official OpenVoice V2 checkpoints, MeloTTS dependencies, a permitted reference recording, and a server-side `WORKER_API_TOKEN`.
3. **Live avatar stream** — the separate LiveTalking service behind `/api/livetalking/`. The NKAI web app proxy does not itself run LiveTalking or provide WebRTC ICE/TURN networking.

For a natural voice that resembles a particular speaker, use only a recording you own or have explicit permission to use. The UI's consent checkbox is not a substitute for legal permission. Do not upload sensitive reference audio to a public repository.

## 1. Create and test the worker image

From the repository root, build the existing chat-worker container:

```bash
docker build -t nkai-ai-worker:local -f gpu-worker/Dockerfile gpu-worker
docker run --rm --gpus all -p 7860:7860 \
  -e MODEL_ID=Qwen/Qwen2.5-1.5B-Instruct \
  -e CORS_ORIGINS=https://YOUR-STUDIO-DOMAIN \
  -e WORKER_API_TOKEN=REPLACE_WITH_A_LONG_RANDOM_SECRET \
  nkai-ai-worker:local
```

Test locally before publishing:

```bash
curl -H "Authorization: Bearer REPLACE_WITH_A_LONG_RANDOM_SECRET" http://127.0.0.1:7860/health
curl -H "Authorization: Bearer REPLACE_WITH_A_LONG_RANDOM_SECRET" http://127.0.0.1:7860/capabilities
```

The model downloads weights on first startup. Check GPU memory and model licence before choosing a machine or using it commercially.

## 2. Deploy on Lightning AI

Use Lightning AI's current **Deployments** workflow for an HTTPS inference endpoint, or use a Studio with an exposed port for a controlled prototype. The current CLI supports deployment creation from an image or a Studio; exact machine, region, and auth options can change, so confirm them in the installed CLI's `lightning deployment create --help` before running.

If you publish the image to a container registry, keep registry credentials private and use a pinned version tag rather than `latest`. Example shape (replace every placeholder and validate the CLI options first):

```bash
lightning login
lightning deployment create nkai-ai-worker \
  --image ghcr.io/YOUR-OWNER/nkai-ai-worker:YOUR-VERSION \
  --token-auth REPLACE_WITH_A_LONG_RANDOM_SECRET
lightning deployment list
lightning deployment inspect nkai-ai-worker
lightning deployment logs nkai-ai-worker --tail 100
```

**Cost guardrail:** do not set a minimum replica count above zero or choose a paid GPU size until you have reviewed the current estimate and explicitly approved the spend. A free allowance, credits, GPU availability, scale-to-zero behavior, and endpoint eligibility depend on the account and current platform terms. A successful deployment is not proof that the API contract works; test the actual HTTPS endpoint.

## 3. Configure NKAI Studio secrets

On the NKAI server host (not GitHub Pages and not any `VITE_*` variable), set:

- `AI_WORKER_INTERNAL_URL` to the chat worker base URL, without `/chat`.
- `AI_WORKER_API_TOKEN` to the exact token configured on the chat worker.
- Optionally, `AI_TTS_INTERNAL_URL` to the OpenVoice worker base URL, without `/tts`.
- `AI_TTS_API_TOKEN` to the exact token configured on the OpenVoice worker.
- `LIVETALKING_INTERNAL_URL` to the private LiveTalking service URL when that service is separately deployed.

Restart/redeploy the NKAI server after changing environment variables. The browser should call only the same-origin `/api/ai/*` and `/api/livetalking/*` routes.

The dedicated `AI_TTS_INTERNAL_URL` route checks the TTS worker's `/health` before forwarding speech requests. It uses `AI_TTS_API_TOKEN` rather than falling back to the chat token. If the OpenVoice reference audio or checkpoints are missing, the TTS route should report unavailable rather than claim that a natural voice is ready.

## 4. Run the real worker acceptance smoke test

After the Lightning endpoint is deployed, run this from the repository root in a trusted terminal. Do not put the token in browser code or commit it to Git:

```bash
# PowerShell:
$env:AI_WORKER_SMOKE_URL = "https://YOUR-LIGHTNING-ENDPOINT"
$env:AI_WORKER_SMOKE_TOKEN = "YOUR_PRIVATE_WORKER_TOKEN"
npm run smoke:ai-worker

# Optional built-in MMS-TTS check on the chat worker:
npm run smoke:ai-worker -- --tts

# Dedicated OpenVoice TTS worker (only when you own or have permission to use its reference voice):
$env:AI_WORKER_SMOKE_URL = "https://YOUR-OPENVOICE-ENDPOINT"
$env:AI_WORKER_SMOKE_TOKEN = "YOUR_PRIVATE_TTS_WORKER_TOKEN"
$env:AI_WORKER_SMOKE_VOICE_CONSENT = "true"
npm run smoke:ai-worker -- --tts-only
```

The chat-worker smoke test checks readiness, token enforcement, generated chat, and SSE completion; `--tts` additionally checks the built-in MMS-TTS response. The dedicated `--tts-only` mode checks OpenVoice readiness, verifies that unauthenticated TTS is rejected, and requests a WAV response. It requires the explicit `AI_WORKER_SMOKE_VOICE_CONSENT=true` confirmation because it uses the configured reference voice. It contacts only the endpoint you configure and does not use paid inference APIs.

For remote endpoints, the script requires HTTPS and a token. It deliberately fails if unauthenticated chat is accepted, because the worker must have `WORKER_API_TOKEN` configured. Do not run it against a service you do not control.

## 5. End-to-end acceptance tests

- [ ] Chat worker `/health` reports `status: ready`.
- [ ] Chat worker `/chat` returns a model-generated reply with the correct token.
- [ ] Wrong or missing worker tokens are rejected.
- [ ] TTS worker `/health` reports `status: ready` and `/capabilities` reports voice readiness.
- [ ] NKAI `/api/ai/chat` returns a real answer through the deployed worker.
- [ ] NKAI `/api/ai/tts` returns playable WAV audio through the configured TTS worker.
- [ ] TalkingHead lip-sync is tested against the actual generated audio; the current fallback viseme estimator is approximate, not phoneme-accurate.
- [ ] LiveTalking UI is tested on the deployed site with actual WebRTC media and ICE/TURN connectivity.
- [ ] Mobile browser, microphone permissions, reconnect behavior, request timeouts, and model cold starts are tested.
- [ ] Check model, voice, avatar, and checkpoint licences for the intended distribution and commercial use.

## Official references

- [Lightning AI Deployments CLI](https://lightning.ai/docs/cli/stable/command-details/deployment)
- [Lightning AI AI Studio](https://lightning.ai/docs/overview/ai-studio/)
- [Lightning AI host web apps](https://lightning.ai/docs/platform/build/host-web-apps)
- [NKAI OpenVoice setup](./OPENVOICE_SETUP.md)
- [NKAI LiveTalking integration notes](../docs/LIVETALKING_AND_TALKINGAVATAR.md)
