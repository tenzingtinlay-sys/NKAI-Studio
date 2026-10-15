# Avatar product parity matrix

This matrix compares the types of features visible in public product descriptions and open-source project documentation. It is a planning tool for an original implementation, not a claim that NKAI has copied or completed proprietary internals.

| Capability | Open-source reference | Commercial benchmark | NKAI current state | Work required |
|---|---|---|---|---|
| Interactive 3D avatar viewer | TalkingHead | HeyGen/Synthesia presenter UI | Basic GLB viewer + optional TalkingHead | Asset catalogue, rig validation, offline cache |
| Avatar library | TalkingHead sample assets; Microsoft Rocketbox | HeyGen stock avatars | A few sample options + catalogue | Bundle verified assets, Rocketbox FBX-to-GLB conversion, licensing UI |
| Text-to-speech | MMS-TTS, Piper, OpenVoice, Indic Parler-TTS, XTTS | HeyGen/D-ID voice libraries | MMS worker + browser speech + optional OpenVoice and Indic Parler workers | Deploy gated Indic worker if desired; test audio in each language and expose voice selection |
| Voice cloning | OpenVoice, XTTS | Paid voice-cloning tools | Optional OpenVoice V2 route requiring reference audio and consent | Install checkpoints, test authorized reference, add consent records/retention |
| Accurate lip-sync | TalkingHead; LiveTalking/Wav2Lip/MuseTalk | Premium talking avatars | TalkingHead + approximate text viseme helper | Use actual phoneme/viseme timings; verify model has blendshapes |
| Multilingual chat | Qwen and other local LLMs | Commercial AI agent/video products | Self-hosted Qwen worker with selected-language prompt | Test language-specific response quality and context |
| Speech-to-text | Whisper/faster-whisper | Commercial voice agents | Not installed in current worker | Add local STT worker and microphone transcription tests |
| Real-time streaming | LiveTalking, WebRTC | D-ID/HeyGen interactive agents | Not deployed | Separate streaming worker, WebRTC signaling, session lifecycle |
| Script-to-video renderer | LiveTalking and other open pipelines | HeyGen/Synthesia | Not implemented as a full render queue | Scene editor, renderer, background/audio mixing, exports |
| User accounts / projects | NKAI app platform | Commercial workspaces | Existing app auth/workspace capabilities depend on current platform config | Audit current auth, permissions, storage and billing boundaries |
| Queue / usage / analytics | Custom backend needed | Commercial usage/credit systems | Not implemented for avatar render jobs | Job queue, cancellation, limits, usage ledger and monitoring |
| Platform failover | Self-hosted workers | Commercial infrastructure | Browser-side ordered endpoint failover and schedule | Configure real endpoints; verify host policy, uptime and secrets |
| Licence management | Each model's upstream licence | Commercial licences | JSON asset/model registry and docs | Verify exact model hashes, notices and deployment terms |

## Release gates

1. **Demo release:** 3D model renders, one local or remote voice works, browser fallback is explicit, all selected assets have attribution/licence notes.
2. **Multilingual release:** live worker capabilities are detected; every advertised language has a recorded successful TTS sample; unsupported languages fail clearly.
3. **Voice cloning release:** reference audio rights are confirmed, consent is recorded, retention/deletion is implemented, and cloning endpoints are protected.
4. **Real-time video release:** LiveTalking worker is deployed, browser receives WebRTC stream, interrupt/cancel and reconnection work, and model licences are audited.
5. **Production release:** end-to-end tests, security review, monitoring, rate limiting, model pinning and reliable hosting are in place.

## GitHub development workflow

- Keep frontend, worker, registry and documentation in this repository.
- Commit source and small metadata files; fetch large models/avatars with explicit version/hash records instead of putting multi-gigabyte weights in Git history.
- Use GitHub Actions to validate TypeScript, run tests, compile Python, download approved starter assets and build the app.
- Deploy the frontend and each worker as separate services. Put secrets in the hosting platform's secret manager; only HTTPS worker URLs should be configured in the Studio.
- After deployment, run a smoke test for /health, /capabilities, /chat and /tts, then verify actual audio playback and lip-sync in a browser.
