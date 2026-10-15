# NKAI Studio: four-platform deployment

## Required architecture

Keep one studio UI and one stable same-origin server gateway. The gateway chooses only workers that have a real, reachable endpoint and are permitted to serve the requested workload. The four provider roles are intentionally different:

| Platform | Intended role | Live public inference |
|---|---|---|
| Google Colab | Development, notebook experiments and prototyping | Not used as a permanent public API |
| Kaggle | Permitted experiments, evaluation and batch benchmarks | Not used as a public third-party inference server |
| Hugging Face ZeroGPU | Eligible short inference tasks or compatible hosted Spaces | Only through a supported Space/API integration and within quotas |
| Lightning AI | First candidate for the primary persistent/managed GPU worker | Only after the actual endpoint, auth, health and costs are verified |

The four platforms are not interchangeable. Colab and Kaggle notebook sessions can end or disconnect, and must not be treated as stable 24/7 HTTP services. They can contribute models, evaluation and approved batch jobs without being falsely advertised as healthy online workers. The current worker-pool validator deliberately rejects them from live routing. Hugging Face ZeroGPU is quota/session-oriented and is not automatically a generic always-on endpoint. Lightning is the first live worker to configure, subject to account permissions and a verified endpoint.

## Public application deployment

The public studio is a full-stack app because it uses Nitro server routes for private worker proxying. Deploy it as a Docker Space on Hugging Face Spaces using the repository-root `Dockerfile`; do not use a static-only GitHub Pages build and do not deploy to Vercel.

- The Space serves the web UI and same-origin `/api/ai/*` gateway.
- The GPU worker can be deployed independently on Lightning AI.
- Secrets stay in the Space's server environment, never in `VITE_*` variables or committed files.
- The included GitHub Actions workflow can upload the repository to an existing HF Space when manually dispatched, once repository secrets `HF_TOKEN` and `HF_SPACE_ID` are configured.
- The deployment workflow can create the Docker Space automatically if it does not exist and the token has write permission. Add GitHub repository secrets under **Settings → Secrets and variables → Actions**: `HF_TOKEN` (a Hugging Face write token) and `HF_SPACE_ID` (`your-hf-username/nkai-studio`, or another Space ID you control). Then run **Actions → Deploy NKAI Studio to Hugging Face Spaces → Run workflow**. Deployment cannot proceed without a valid token and Space ID.
- The default PGLite database may be ephemeral on hosted containers. Configure a supported persistent database/storage before relying on durable user accounts or long-lived user data.

## First live worker: Lightning AI

1. Build and deploy `gpu-worker/Dockerfile` through an authorized Lightning AI deployment.
2. Configure its `WORKER_API_TOKEN` as a private host secret.
3. Test `/health`, `/capabilities`, `/chat`, `/chat/stream` and (if enabled) `/tts` using the exact deployed endpoint.
4. Add the verified endpoint to the app host's server-only `AI_WORKER_POOL_JSON` (or legacy `AI_WORKER_INTERNAL_URL`) and set the matching token.
5. Open `/deployment` on the public Space and run the endpoint checks.
6. Validate streaming in a real browser, then test generated voice, lip-sync and WebRTC separately.

Never claim a provider is online from configuration alone. A worker is live only after a real request succeeds. Review provider terms, model licences, GPU quotas and current pricing before running workloads; do not assume free compute is permanent or uninterrupted.

## Current implementation boundaries

- The unified gateway now exposes `/api/ai/stream` and proxies it to the worker's `/chat/stream` SSE endpoint.
- The GPU worker streams generated text with Transformers' `TextIteratorStreamer`.
- The avatar chat UI consumes incremental SSE chunks. This does not itself provide streaming audio/video or WebRTC.
- The default avatar remains the existing MPFB sample. A second distributable, rigged human avatar must be added only after its model asset and redistribution licence are verified. The UI supports loading a user-owned GLB locally.
- Voice/TTS and LiveTalking are separate acceptance checks; a passing frontend build is not proof of live GPU, speech or video functionality.
