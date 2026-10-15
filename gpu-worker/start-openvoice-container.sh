#!/usr/bin/env bash
set -euo pipefail

export OPENVOICE_ROOT="${OPENVOICE_ROOT:-/opt/OpenVoice}"
export OPENVOICE_CHECKPOINT_ROOT="${OPENVOICE_CHECKPOINT_ROOT:-$OPENVOICE_ROOT/checkpoints_v2}"
export OPENVOICE_REFERENCE_AUDIO="${OPENVOICE_REFERENCE_AUDIO:-/run/secrets/voice-reference.wav}"

if [[ "${DOWNLOAD_OPENVOICE_CHECKPOINTS:-true}" == "true" ]]; then
  if [[ ! -f "$OPENVOICE_CHECKPOINT_ROOT/converter/config.json" || ! -f "$OPENVOICE_CHECKPOINT_ROOT/converter/checkpoint.pth" ]]; then
    /app/gpu-worker/download_openvoice_checkpoints.sh
  fi
fi

if [[ -z "${WORKER_API_TOKEN:-}" && "${ALLOW_UNAUTHENTICATED_LOCAL:-false}" != "true" ]]; then
  echo "WORKER_API_TOKEN is required for OpenVoice worker access. Set it as a host secret." >&2
  exit 1
fi
if [[ ! -f "$OPENVOICE_REFERENCE_AUDIO" ]]; then
  echo "Reference recording not found at $OPENVOICE_REFERENCE_AUDIO. Mount an authorized recording or set OPENVOICE_REFERENCE_AUDIO." >&2
  exit 1
fi

exec uvicorn openvoice_app:app --host 0.0.0.0 --port "${PORT:-7861}"
