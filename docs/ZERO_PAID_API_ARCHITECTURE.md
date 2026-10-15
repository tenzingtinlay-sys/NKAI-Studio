# NKAI Studio: zero-paid-API architecture and honest availability contract

## Product goal

NKAI Studio is intended to be one app for personal and professional guidance, general-topic conversations, voice chat, multilingual speech, and an animated talking avatar. Users should not be sent to third-party avatar websites to use the core experience.

The target is **no paid AI inference API keys** and **no per-message/per-minute AI API billing**. Use open-weight models and open-source runtimes that the project can lawfully run itself. This is different from promising that the whole service has zero operating cost.

## What “free” can and cannot mean

- **No paid inference API:** achievable when inference runs in the user's browser/device or on a self-hosted machine.
- **No per-user API credit limit:** achievable for inference on a user's own device, subject to that device's memory, speed, power, and bandwidth. A self-hosted service has capacity limits even without vendor credits.
- **Unlimited 24/7 public video/voice for every user at zero cost:** cannot be guaranteed honestly. Model inference consumes CPU/GPU, RAM, storage, electricity, bandwidth, and hosting capacity. Free cloud notebook/GPU offers have quotas, sleep/restart policies, concurrency limits, and terms of service. A rotating list of free platforms does not remove these limits and must not be used to evade them.
- **No outside links in the product workflow:** achievable for the user-facing experience. Open-source dependencies and model weights still need to be downloaded during build/deployment or first-run unless vendored into the application. Their licences and attribution requirements still apply.
- **“Any world topic”:** the assistant can attempt broad general-purpose guidance, but no model is knowledgeable or reliable on every topic. It must communicate uncertainty, avoid inventing facts, and direct users to qualified help for emergencies or high-stakes medical, legal, financial, or safety decisions.

## Recommended architecture

1. **Frontend:** NKAI Studio UI, local avatar renderer, microphone/text controls, conversation history, language selector, captions, accessibility controls, and clear status labels.
2. **Local inference mode:** an open-weight, quantized language model running on the user's device (WebGPU/WASM where supported). Download model files with progress and cache them locally. This has no inference API bill, but needs compatible hardware and initial bandwidth/storage.
3. **Local voice mode:** browser speech recognition/speech synthesis as a compatibility fallback. Label it as device-provided speech, not as a bundled neural voice. A bundled open neural TTS model can improve voice quality, but it increases downloads and device requirements; language coverage depends on the actual checkpoint.
4. **Self-hosted mode:** an internal server route calls an operator-managed open model and TTS worker. Keep worker addresses and secrets server-side. No vendor inference API is required, but the operator pays or supplies compute and must capacity-plan it.
5. **Talking avatar:** render the licensed avatar in the same app and drive mouth movement from actual audio/visemes. A 3D viewer alone is not a complete talking avatar; video generation/streaming needs a working inference pipeline and media transport.
6. **Reliability:** provide local fallback when offline, queue only safe/non-sensitive work, show when the model is loading or unavailable, and never present a scripted fallback as an AI-generated answer.
7. **Privacy:** explain whether conversations stay on-device or are sent to the operator's own server. Do not send private conversations to third-party services without explicit disclosure and consent.

## Minimum acceptance criteria before calling it production-ready

- [ ] Fresh install/build succeeds from the committed lockfile.
- [ ] Core text conversation works with all paid AI API keys absent.
- [ ] A genuine model-generated answer is distinguishable from scripted fallback.
- [ ] Speech is generated and heard in each language claimed as supported; test each voice, not just the language selector.
- [ ] Lip movement is synchronized with generated audio on a real rigged avatar.
- [ ] Long-session and concurrency tests are run on the actual deployment hardware.
- [ ] A 24-hour uptime test is completed on the actual host; restarting/sleeping free notebook sessions do not count as 24/7 availability.
- [ ] Model, avatar, and voice licences are checked for redistribution and commercial use.
- [ ] The app documents hardware, download size, storage, privacy, and known limitations.
- [ ] No dead buttons, fake availability indicators, or outbound provider-launch links remain in the user-facing workflow.

## Current implementation status

This repository already has browser-local model loading code, a browser speech fallback, optional open-source GPU worker code, and a same-origin LiveTalking HTTP proxy. Those pieces do **not** by themselves establish that the app is fully offline, fully self-contained, multilingual neural voice-ready, or available 24/7. Current code still loads some runtime modules from external CDNs, and a working GPU/streaming deployment and real end-to-end voice/lip-sync tests are still required.

Do not advertise “unlimited 24/7 at zero cost” until the actual deployment has passed the uptime and load tests above. The accurate goal is: **no paid AI inference APIs; local-first where possible; self-hosted open models where needed; transparent hardware and availability limits.**
