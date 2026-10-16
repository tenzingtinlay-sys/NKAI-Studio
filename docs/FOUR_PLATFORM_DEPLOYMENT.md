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

## No paid API / no credit dependency

The application must not require OpenAI API, paid third-party inference APIs, prepaid API credits, or an API billing balance to run its core chat/avatar workflow. Prefer local browser inference or open-weight models served by the selected compute provider. Keep provider adapters behind the existing gateway, and fail over only to configured, reachable providers. Never add a paid API as an invisible fallback. This is a no-paid-API design, not a promise of unlimited free compute: each platform can impose its own session limits, GPU quotas, queues, storage limits, or acceptable-use restrictions. If all eligible free workers are unavailable, show a clear temporary-unavailable state rather than charging a user or silently switching to a paid service.

## Public application deployment

The public studio is a full-stack app because it uses Nitro server routes for private worker proxying. Deploy it as a Docker Space on Hugging Face Spaces using the repository-root `Dockerfile`; do not use a static-only GitHub Pages build and do not deploy to Vercel.

- The Space serves the web UI and same-origin `/api/ai/*` gateway.
- The GPU worker can be deployed independently on Lightning AI.
- Secrets stay in the Space's server environment, never in `VITE_*` variables or committed files. Deployment authentication tokens are hosting credentials, not inference API credits; keep them private and use only the minimum permissions needed.
- The included GitHub Actions workflow creates or updates a Docker Space, configures server-only Space secrets, waits for the Space runtime, and smoke-tests `/deployment`. It does not claim that the GPU, voice, or WebRTC worker is healthy merely because the page loads.
- Add the following GitHub repository secrets under **Settings → Secrets and variables → Actions**:
  - `HF_TOKEN`: Hugging Face write token.
  - `HF_SPACE_ID`: `your-hf-username/nkai-studio`, or another Space ID you control.
  - `NKAI_BETTER_AUTH_SECRET`: a strong random session/signing secret.
  - `NKAI_GOOGLE_CLIENT_ID`, `NKAI_GOOGLE_CLIENT_SECRET`: the Google OAuth 2.0 Web application client. Register this exact authorized redirect URI in Google Cloud Console: `https://<owner>-<space-name>.hf.space/api/auth/callback/google`. For the configured Space ID `TenzingT/nkai-studio`, the URL is `https://tenzingt-nkai-studio.hf.space/api/auth/callback/google`.
  - `NKAI_DATABASE_URL`: PostgreSQL connection string for persistent user sessions and app data.
  - `NKAI_AI_WORKER_INTERNAL_URL`, `NKAI_AI_WORKER_API_TOKEN`: reachable HTTPS base URL and matching private token for the first self-hosted chat worker.
  - Optional: `NKAI_TTS_INTERNAL_URL`, `NKAI_TTS_API_TOKEN` for a dedicated OpenVoice TTS worker, and `NKAI_LIVETALKING_INTERNAL_URL` for the separate live avatar stream.
- The workflow copies these values into Hugging Face Space secrets and derives `BETTER_AUTH_URL` from `HF_SPACE_ID`. The production Docker image enables the real sign-in UI; deployment deliberately fails before upload if the required auth, persistent database, or protected chat-worker secrets are missing. Do not paste any secret values into chat or commit them to Git.
- After adding secrets, run **Actions → Deploy NKAI Studio to Hugging Face Spaces → Run workflow**. The workflow creates the Docker Space if needed and the token has write permission, then waits up to 15 minutes for the runtime and checks the actual `/deployment` route. A successful page smoke test is not a substitute for real chat, TTS, or WebRTC acceptance tests.
- This deployment requires a real Google OAuth Web client and PostgreSQL URL; neither can be safely invented by the code. The database can use a free provider tier if available to your account, but its uptime/storage limits still apply.

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
