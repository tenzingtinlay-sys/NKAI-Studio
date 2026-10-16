# Pinokio Factory review for NKAI Studio

## Verdict

**Pinokio Factory is useful for discovering and installing AI projects, but it is not itself a hosted AI-avatar backend.** Pinokio is a local AI browser/launcher. The `pinokiofactory` organization publishes installer scripts for upstream projects. Each launched project still runs in its own local environment and has its own dependencies, model weights, APIs and licence terms.

References:
- Pinokio: https://github.com/pinokiocomputer/pinokio
- Pinokio Factory: https://github.com/pinokiofactory
- Pinokio docs: https://docs.pinokio.computer/
- LivePortrait installer: https://github.com/pinokiofactory/liveportrait
- VibeVoice Realtime installer: https://github.com/pinokiofactory/vibevoice-realtime
- E2/F5 TTS installer: https://github.com/pinokiofactory/e2-f5-tts
- Kokoro TTS installer: https://github.com/pinokiofactory/Kokoro-TTS

## Which projects are relevant to a real talking avatar?

| Project | What it contributes | What it does not provide alone | NKAI recommendation |
|---|---|---|---|
| LivePortrait | Animates a still portrait using a driving video; useful for portrait animation and generated clips | Not a full conversational AI, not a TTS/ASR stack, and not proven as a low-latency interactive avatar by itself | Optional animation engine; combine with speech-driven lip sync and a voice pipeline |
| Microsoft VibeVoice Realtime (Pinokio launcher) | Streaming/realtime text-to-speech demo; launcher documents WebSocket `/stream` and `/config` | Does not render an avatar or perform face animation | Candidate speech engine behind a server-side adapter after model/licence/security review |
| E2/F5 TTS launcher | TTS experimentation | Does not render an avatar | Optional speech engine; review exact upstream model and licence |
| Kokoro TTS launcher | TTS generation | Does not render an avatar | Optional lower-complexity TTS candidate; review voices and model terms |
| Pinokio itself | Local installer and process launcher for AI projects | Not an inference service or production API by default | Use for local GPU setup/testing, not as the public NKAI production backend |

The Pinokio Factory `vibevoice-realtime` README describes a launcher that pins a Microsoft VibeVoice revision, installs dependencies, downloads the model and starts the upstream FastAPI demo. It warns that GPU inference is expected and CPU performance may be poor. Its README also contains a security warning about using only trusted voice presets due to the pinned revision. Pinning is useful for reproducibility but does not replace security review.

## Recommended NKAI architecture

Keep the responsibilities separate:

1. **Conversation brain:** NKAI's existing authenticated assistant/LLM and conversation state.
2. **Speech input:** microphone capture plus speech recognition (existing provider or separately selected ASR).
3. **Speech output:** one configurable TTS adapter, initially the existing working provider; test VibeVoice as an optional candidate.
4. **Avatar renderer:** keep LiveTalking as the real-time WebRTC candidate and Duix as a separate generated-video candidate. Test LivePortrait for portrait-animation clips only.
5. **Transport and storage:** GPU services behind authenticated server-side adapters; private object storage for large media; PostgreSQL for metadata and job state.
6. **User interface:** one avatar workspace that shows whether the engine is ready, generating, streaming, or unavailable. Never label a generated clip as a live stream.

Do not launch local Pinokio scripts from a public web request, expose a workstation's local port to the internet, or put GPU model weights in Cloudflare Workers. A desktop Pinokio installation is a development/deployment aid; NKAI needs a secure service contract before a model can be used by the deployed web app.

## Licence and security gate

The Pinokio Factory repository is an installer collection, not a single code/model licence. Review the launcher script, upstream code, checkpoints, datasets, voice models and dependencies independently. Confirm commercial rights, redistribution, attribution, model-card restrictions and voice/likeness consent before enabling each provider for users. Do not infer a permissive model licence from an installer repository.

## Current implementation status

- [x] Added catalogue metadata for Pinokio Factory, LivePortrait, VibeVoice Realtime, E2/F5 TTS and Kokoro TTS.
- [x] Documented their roles and boundaries so they are not misrepresented as a single working avatar.
- [ ] Pinokio has not been installed or run by this change.
- [ ] No GPU worker has been provisioned or connected.
- [ ] No real voice stream, lip-sync session or generated clip has been tested from the deployed NKAI app.
- [ ] Exact upstream licences, model weights and asset terms remain to be checked before production use.
