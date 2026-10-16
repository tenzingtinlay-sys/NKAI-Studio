# Lightning AI GPU deployment: LiveTalking avatar engine

Status: deployment-ready checklist; no Lightning instance has been created and no GPU endpoint has been verified.

## Why this is separate from the chat worker

The existing `gpu-worker/` runs text generation and optional TTS. It does not render the LiveTalking real-time avatar stream. LiveTalking must run as its own GPU process with compatible CUDA/PyTorch packages and its required model checkpoints.

Upstream source and API documentation:
- https://github.com/lipku/LiveTalking
- https://github.com/lipku/LiveTalking/blob/main/docs/api.md
- https://github.com/lipku/LiveTalking/blob/main/docs/avatar_api.md

## Important network gate before choosing a Lightning deployment

LiveTalking's default WebRTC configuration uses HTTP signalling plus media transport over UDP (and may require a configured ICE/STUN/TURN service). A generic HTTPS deployment URL alone is not enough. Before paying for a deployment, verify that the chosen Lightning AI product and plan can expose the required UDP media ports or that a supported TURN relay can be configured. If only HTTP ingress is available, the UI may negotiate an offer but no live audio/video will flow. Do not describe that as a working avatar.

## Deployment sequence

1. In Lightning AI, create a GPU Studio on a supported Linux/CUDA image. Select a GPU only after reviewing current cost and availability.
2. Clone the upstream LiveTalking repository at a pinned commit. Follow that commit's own install steps and install only the model dependencies required by the selected avatar backend.
3. Download model checkpoints and avatar assets from the upstream instructions. Audit each checkpoint, TTS voice, sample avatar, dataset, and dependency licence; Apache-2.0 code licensing does not automatically license weights or media.
4. Start the service using the upstream documented command for the selected model and avatar, for example:
   `python app.py --transport webrtc --model wav2lip --avatar_id wav2lip256_avatar1`
   Confirm the correct arguments against the pinned version before running.
5. Keep management endpoints private. Put a TLS/authenticated gateway in front of HTTP signalling and use a supported ICE/TURN arrangement for media. Do not expose a broad UDP range to the public internet without a firewall and a deliberate network policy.
6. From a trusted machine, test the service directly: health/readiness if available, documented offer endpoint, a complete WebRTC offer/answer, incoming and outgoing audio/video, text-to-speech command, interruption, and reconnect after a dropped session.
7. Configure the NKAI server-side secret `LIVETALKING_INTERNAL_URL` to the private/reachable LiveTalking base URL. Do not put internal URLs or tokens in `VITE_*` variables, browser code, or Git. Restart the NKAI server after setting it.
8. Open NKAI's native avatar panel and verify a real session on desktop and mobile. Check ICE candidate selection and media packets, not just HTTP 200 responses.

## NKAI routes currently expected by the adapter

- `/api/livetalking/offer` — WebRTC offer/answer signalling
- `/api/livetalking/human` — avatar speech command
- `/api/livetalking/interrupt_talk` — interrupt current speech

The app's same-origin adapter protects the upstream base URL and allowlists the paths. Its HTTP proxy does not relay UDP media; browser-to-ICE/TURN networking still has to work.

## Required acceptance evidence

- [ ] A running Lightning GPU instance and its private endpoint are identified.
- [ ] GPU runtime is confirmed in the service logs.
- [ ] Model and avatar checkpoint load successfully.
- [ ] A real browser WebRTC session receives video and audio.
- [ ] Text-to-avatar speech works and lip movement follows the speech.
- [ ] Interrupt and reconnect work.
- [ ] Missing/invalid credentials are rejected; upstream URL and secrets never reach the browser.
- [ ] Cost, licence, consent, retention, and deletion controls are reviewed.
- [ ] CI/build and browser end-to-end results are recorded separately.

## What is needed to finish the live connection

A person with access to the Lightning AI workspace must create or authorize the GPU service and provide its private/reachable endpoint through the deployment's secret manager. If the endpoint needs a bearer token, add it to the NKAI server secret configuration and the adapter only after confirming the upstream service's supported auth method. Never paste credentials into source files or commit them to this repository.
