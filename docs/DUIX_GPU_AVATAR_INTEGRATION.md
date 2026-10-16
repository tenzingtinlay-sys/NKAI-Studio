# Duix Avatar GPU integration for NKAI Studio

Status: provider catalogued; runtime deployment is not yet active.

## Purpose

Integrate the public Duix.Avatar project as a separate GPU-backed engine for realistic talking-human video generation with voice and synchronized mouth movement, while preserving NKAI Studio's existing app, auth, database, browser avatar, TTS workers, and LiveTalking integration.

Upstream:
- Source: https://github.com/duixcom/Duix-Avatar
- Official site: https://www.duix.com/
- Upstream license: https://github.com/duixcom/Duix-Avatar/blob/main/LICENSE

## Capability boundary

Duix.Avatar's public README describes local cloning and non-real-time video synthesis. Its real-time interaction section directs users to the hosted Duix experience. Therefore this integration must not label Duix as a verified, low-latency interactive stream. Keep LiveTalking as NKAI's real-time WebRTC candidate; use Duix for rendered talking-human clips until a supported streaming API is documented and tested.

## Deployment boundary

Run Duix on a separate supported Windows/Linux NVIDIA GPU host. The upstream setup documents Docker services for ASR, voice synthesis and avatar video generation, approximately 70 GB of image downloads, and recommends 32 GB RAM with an NVIDIA RTX 4070. Verify current upstream requirements before provisioning.

Do not:
- run Duix model inference in Cloudflare Workers;
- commit model weights, personal recordings, generated videos, or voice samples to Git;
- store large binary media in the relational database;
- expose the GPU service or its management endpoints directly to the public internet;
- accept arbitrary upstream URLs or filesystem paths from browser requests.

Use PostgreSQL for provider configuration, job state, user consent, asset metadata and object-storage keys. Use private object storage for recordings, audio and rendered video. Keep GPU credentials and internal service URLs server-side.

## Suggested end-to-end workflow

1. The signed-in user creates an avatar using a recording they own or are authorized to use, and explicitly consents to likeness and voice processing.
2. NKAI uploads the recording to private object storage using a short-lived, scoped upload URL. The GPU worker receives only a server-generated object key or signed URL.
3. A server-side Duix adapter creates a job and stores its provider ID, user ID, consent record, status, timestamps and output object key.
4. The worker performs voice/model preparation and video synthesis using the upstream supported API contract. Do not expose Duix's Electron IPC layer as a web API.
5. NKAI polls a bounded status endpoint or consumes a verified callback, then copies the completed media to private object storage.
6. The app plays the resulting video and audio, provides download/delete controls, and displays generation status and errors.
7. Add retention limits, deletion propagation, rate limits, per-user quotas, consent withdrawal and audit events before production use.

## API contract findings

The upstream desktop application calls a face-to-face service using `POST /easy/submit` and `GET /easy/query?code=...`, and a speech service using `POST /v1/invoke` and `POST /v1/preprocess_and_tran`. The video submission payload references `audio_url` and `video_url` plus a job code and generation flags.

These are local service APIs used by the upstream desktop app, not a complete public browser-facing API contract. The current design expects local file paths and a local asset directory. Before implementing a public-facing adapter, verify the exact service payloads, response schemas, path semantics, job status codes, file-return behavior and security model against the deployed upstream version. Never send user-supplied paths to the GPU host.

## Licensing and attribution gate

The upstream repository's LICENSE is a DUIX.COM Community License Agreement, not an OSI-style MIT/Apache licence. Section 1 requires, when distributing or making available the materials or a product/service that uses them:
- include a copy of the agreement with the materials;
- prominently display “Built with DUIX.COM” in a related website, UI, about page, blog post or product documentation;
- state in the terms of service/EULA that the product incorporates DUIX.COM technology;
- retain the required DUIX.COM attribution notice in a distributed Notice file.

Section 2 says that if the applicable product or service exceeds 1,000 monthly active users under its stated test, a commercial licence must be requested and rights are not authorized unless DUIX.COM expressly grants them. The README's commercial summary describes a different threshold. Treat the actual LICENSE as controlling and obtain written clarification from DUIX.COM before public/commercial rollout or any uncertainty about the threshold. Do not ship this provider as production-enabled until that gate is cleared.

Also audit the licences for each model image, Docker image, voice model, checkpoint, dependency and generated media. Obtain the avatar subject's consent for likeness and voice cloning.

## Acceptance checklist

- [ ] GPU host is provisioned and isolated from public ingress.
- [ ] Duix services pass health checks and version-pinned smoke tests.
- [ ] Uploads are scoped, private, size-limited and virus/content checked as appropriate.
- [ ] User consent and authorization are recorded before cloning.
- [ ] API schemas and status codes are verified against the deployed Duix version.
- [ ] Authenticated server-side job API supports create, status, cancel where supported, list and delete.
- [ ] Rendered audio/video is playable from private object storage.
- [ ] Rate limits, quotas, timeouts, retries and worker cleanup are tested.
- [ ] Attribution, Notice file and terms language are in place.
- [ ] Licence clarification is documented before public/commercial enablement.
- [ ] Browser tests verify a real GPU-generated output; mocks do not count as end-to-end proof.
- [ ] Duix is not represented as real-time streaming unless live bidirectional interaction is independently verified.
