# NKAI Studio Unified AI Runtime

## Goal

Keep the browser experience stable while a server-side gateway chooses an eligible inference worker. The frontend calls only same-origin routes such as `/api/ai/chat`, `/api/ai/tts`, `/api/ai/health`, and `/api/ai/capabilities`.

## How time windows work

Set `AI_WORKER_POOL_JSON` as a **server-side secret/environment variable** containing an ordered JSON array. Each entry must use a stable, reachable worker URL that implements the NKAI worker HTTP contract:

```json
[
  {
    "id": "lightning-primary",
    "platform": "lightning-ai",
    "baseUrl": "https://YOUR-APPROVED-WORKER-ENDPOINT",
    "token": "YOUR_WORKER_TOKEN",
    "leaseHours": 4,
    "priority": 10,
    "liveServingAllowed": true
  },
  {
    "id": "secondary-worker",
    "platform": "custom",
    "baseUrl": "https://YOUR-SECOND-APPROVED-WORKER-ENDPOINT",
    "token": "ANOTHER_WORKER_TOKEN",
    "leaseHours": 2,
    "priority": 20,
    "liveServingAllowed": true
  }
]
```

The scheduler calculates the active time slot deterministically, so multiple stateless application instances agree about the preferred worker. For each request it probes health and uses another eligible worker if the preferred worker is unavailable. Requests are sent only to entries that explicitly set `liveServingAllowed: true`. Tokens stay server-side.

This is a **routing and failover framework**, not a connector that can automatically create, sign into, or restart provider sessions. Every configured endpoint must already exist, be reachable from the gateway, expose the compatible `/health`, `/capabilities`, `/chat`, and `/tts` routes, and be allowed by that provider's current terms. A provider's own restart limit is not extended by the scheduler.

## Provider guardrails

- **Lightning AI:** candidate for a four-hour lease only after a real worker endpoint, GPU allocation, and intended serving method are verified. Restart/expiry is not guaranteed to be seamless.
- **Hugging Face ZeroGPU:** do not configure as a generic long-running worker unless the particular Space/API pattern and workload are supported. Shared GPU jobs are short-lived and quota-limited.
- **Kaggle Notebooks:** excluded from live worker routing by default. Use for permitted experiments/benchmarking, not a public third-party inference service without explicit authorization.
- **Google Colab:** excluded from live worker routing. Use for interactive development and experiments consistent with Colab's terms, not as a public backend/proxy.
- The code rejects Google Colab and Kaggle platform labels in the live pool even if mistakenly marked eligible.

## Health and failure behavior

- `/api/ai/health` and `/api/ai/capabilities` proxy to the preferred healthy worker.
- `/api/ai/chat` and `/api/ai/tts` check candidate health before forwarding work.
- If no eligible worker responds, the gateway returns a truthful unavailable response. It does not fake an answer or claim a provider is online.
- Conversation state remains the browser/app's responsibility; a provider switch cannot preserve an in-progress GPU process or an active WebRTC media session.
- LiveTalking media and WebRTC ICE/TURN remain separate from this chat/TTS worker pool.

## Dedicated natural-speech worker

For a separate TTS service such as the optional OpenVoice V2 worker, configure the server-only environment variables `AI_TTS_INTERNAL_URL` and `AI_TTS_API_TOKEN`. The URL is the TTS service base URL, without `/tts`; the token must match that service's `WORKER_API_TOKEN`. Requests to `/api/ai/tts` are health-checked and sent to this service instead of the chat worker. Chat continues to use the configured AI worker pool. If the TTS worker is not ready, the gateway reports it as unavailable rather than silently claiming the requested neural voice succeeded.

OpenVoice requires its checkpoints and a private reference recording the operator is authorized to use. Voice cloning must not be used to impersonate someone without permission.

## Deployment checklist

1. Deploy NKAI Studio to a server runtime that supports its Nitro routes.
2. Deploy the chat worker and, if desired, a separate natural-speech worker on hosts that explicitly permit the intended inference service. See [Lightning AI deployment guide](../gpu-worker/LIGHTNING_AI_DEPLOYMENT.md).
3. Configure `AI_WORKER_POOL_JSON` as a server-only secret. Do not add it to `VITE_*` variables or client code.
4. Open `/deployment` and run the live checks.
5. Test real chat, generated WAV audio, language selection, and avatar lip-sync separately.
6. Review each model's licence. The default MMS-TTS checkpoints have non-commercial restrictions that may not fit a public/commercial launch.

## Backwards compatibility

If `AI_WORKER_POOL_JSON` is unset, the existing `AI_WORKER_INTERNAL_URL` and optional `AI_WORKER_API_TOKEN` single-worker configuration continues to work.
