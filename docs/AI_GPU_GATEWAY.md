# NKAI Studio AI GPU Gateway

## Goal

Keep the NKAI Studio UI and public URL stable while GPU inference can move between independently deployed open-source workers.

## Gateway endpoints

### `GET /api/ai-gateway`

Returns worker health, latency, capabilities when available, and feature flags. It does not reveal worker tokens.

### `POST /api/ai-gateway`

JSON request examples:

```json
{"action":"chat","message":"Hello","language":"en-IN","history":[]}
{"action":"tts","text":"Hello from NKAI","language":"en-US","consent_confirmed":true}
{"action":"capabilities"}
```

The gateway strips `action` before forwarding the body and uses a server-side bearer token for the worker.

Supported generic gateway actions are `chat`, `tts`, `capabilities`, and `health`. LiveTalking uses a separate adapter configured with `LIVETALKING_INTERNAL_URL`, because it is a distinct WebRTC service rather than a chat-worker endpoint.

## Multi-provider routing

Configure `AI_GPU_WORKERS` as a JSON array of `id`, `platform`, `baseUrl`, `token`, and `priority` entries. Lower priority numbers are attempted first. If omitted, the gateway supports a single worker via `AI_WORKER_INTERNAL_URL`, `AI_WORKER_API_TOKEN`, and optional `AI_WORKER_PLATFORM`.

Worker health is checked before forwarding. A worker that is not ready is skipped. If a connection fails before the gateway receives a response, the next healthy worker can be tried. Once an upstream response has been received, its status and body are passed through without replay.

## Security and availability

- Store worker URLs and tokens in hosting secrets.
- Use HTTPS for remote workers.
- Keep inference behind the application's authenticated user flow and add durable quotas/rate limiting before public exposure.
- Do not rely on in-memory queues or worker-local storage for persistent avatar assets.
- WebRTC sessions cannot be transparently migrated between GPU workers; reconnect after worker loss.
- A provider's free GPU allocation may stop, sleep, or require manual restart. The gateway can route around that only when another worker is already available.

## Validation checklist

- [ ] `GET /api/ai-gateway` returns JSON with configured/healthy counts.
- [ ] No worker configuration returns `NO_WORKERS` rather than a fake success.
- [ ] A ready worker receives authenticated requests.
- [ ] Unhealthy workers are skipped.
- [ ] A connection failure before an upstream response falls back to the next healthy worker.
- [ ] Provider tokens never appear in browser responses or logs.
- [ ] A two-worker test confirms failover for new requests.
- [ ] Chat, TTS, avatar generation, and WebRTC are tested separately on real GPU workers.
