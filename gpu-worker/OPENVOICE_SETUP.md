# Optional OpenVoice V2 worker setup

This worker provides an optional multilingual voice-conversion backend separate from the default MMS worker. OpenVoice V2 natively supports English, Spanish, French, Chinese, Japanese and Korean when paired with MeloTTS. It uses a user-provided reference recording to produce a consistent voice tone; it is not bundled with anyone's real-person voice. Only use audio you own or have explicit permission to use.

## Install

Use a Linux GPU runtime with a compatible PyTorch/CUDA stack. OpenVoice's upstream instructions recommend Python 3.9; use a dedicated environment to avoid conflicts with the main worker.

```bash
git clone https://github.com/myshell-ai/OpenVoice.git
cd OpenVoice
pip install -e .
pip install git+https://github.com/myshell-ai/MeloTTS.git
python -m unidic download
```

Download the official OpenVoice V2 checkpoint archive linked from the upstream repository's Usage guide and extract it into OpenVoice/checkpoints_v2. You can automate this step with [download_openvoice_checkpoints.sh](download_openvoice_checkpoints.sh); its [checkpoint guide](OPENVOICE_CHECKPOINTS.md) explains the expected disk paths. Confirm that these files exist:

- checkpoints_v2/converter/config.json
- checkpoints_v2/converter/checkpoint.pth
- checkpoints_v2/base_speakers/ses/ (speaker embeddings)

Use the official usage instructions: https://github.com/myshell-ai/OpenVoice/blob/main/docs/USAGE.md and example: https://github.com/myshell-ai/OpenVoice/blob/main/demo_part3.ipynb. Do not use checkpoints from untrusted mirrors.

## Configure and start

Place an authorized reference recording at a private path, for example /secrets/voice-reference.wav. Do not commit the recording to GitHub.

```bash
export OPENVOICE_ROOT=/app/OpenVoice
export OPENVOICE_CHECKPOINT_ROOT=/app/OpenVoice/checkpoints_v2
export OPENVOICE_REFERENCE_AUDIO=/secrets/voice-reference.wav
export WORKER_API_TOKEN='replace-with-a-long-random-secret'
export CORS_ORIGINS='https://YOUR-STUDIO-HOST'
cd gpu-worker && uvicorn openvoice_app:app --host 0.0.0.0 --port 7861
```

If running from the gpu-worker directory, use the equivalent module path supported by your deployment (for example, uvicorn openvoice_app:app). Keep the reference recording outside the public web root.

## API

- GET /health: reports whether checkpoints and reference audio loaded.
- GET /capabilities: lists supported languages and voice-cloning requirements.
- POST /tts: JSON body: {"text":"Hello there","language":"en-US","consent_confirmed":true}. Response contains audio_base64 and mime_type.

For the Studio router, configure this worker endpoint in the rotation list with a trailing /chat path, for example https://YOUR-OPENVOICE-HOST/chat. The app will try /chat for LLM responses (this worker returns HTTP 501) and then /tts for speech; configure your separate LLM endpoint as another rotation candidate. The request must explicitly confirm that the configured reference voice is authorized. The API token is required if WORKER_API_TOKEN is set.

## Verify the deployed worker

After starting the service and setting the same bearer token used by the Studio, run the standard-library smoke test from the repository root:

\`\`\`bash
WORKER_API_TOKEN='your-secret' python gpu-worker/smoke_test_openvoice.py https://YOUR-OPENVOICE-HOST
WORKER_API_TOKEN='your-secret' python gpu-worker/smoke_test_openvoice.py https://YOUR-OPENVOICE-HOST --test-tts --consent-confirmed --language en-US --output test.wav
\`\`\`

The first command checks health and capabilities. The second synthesizes a short sample and validates the WAV header. The script does not upload a voice recording; it uses the reference audio already configured on your worker.

## Licensing and safety

OpenVoice V1/V2 project code is MIT according to upstream. MeloTTS, checkpoints, dependencies and reference audio have separate terms; audit all of them before production. Do not clone a public figure, colleague, customer or other real person without permission. Add account-level consent records, retention controls and rate limits before exposing voice cloning to end users.
