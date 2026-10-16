#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: Docker CLI is not installed." >&2; exit 1
fi
if ! docker compose version >/dev/null 2>&1; then
  echo "ERROR: Docker Compose v2 is required (docker compose)." >&2; exit 1
fi
if ! docker info >/dev/null 2>&1; then
  echo "ERROR: Docker daemon is not reachable. Start Docker Desktop or the Linux Docker service." >&2; exit 1
fi
if ! command -v nvidia-smi >/dev/null 2>&1 || ! nvidia-smi >/dev/null 2>&1; then
  echo "ERROR: NVIDIA GPU/driver not detected on the host. Duix's official Docker services require an NVIDIA GPU." >&2
  echo "This script will not download the large model images until GPU preflight passes." >&2
  exit 1
fi
if ! docker run --rm --gpus all nvidia/cuda:12.4.1-base-ubuntu22.04 nvidia-smi >/dev/null 2>&1; then
  echo "ERROR: Docker cannot access the NVIDIA GPU. Install/configure NVIDIA Container Toolkit, then retry." >&2
  exit 1
fi

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Created deploy/duix-avatar/.env from .env.example. Review DUIX_DATA_DIR before proceeding."
fi
# shellcheck disable=SC1091
set -a
source .env
set +a
DATA_DIR="${DUIX_DATA_DIR:-./data}"
if [[ "$DATA_DIR" != /* ]]; then DATA_DIR="$ROOT/$DATA_DIR"; fi
mkdir -p "$DATA_DIR/voice/data" "$DATA_DIR/face2face"
export DUIX_DATA_DIR="$DATA_DIR"

echo "Starting Duix ASR, TTS, and video-generation containers. Image/model downloads may be tens of GB."
docker compose --env-file .env config >/dev/null
docker compose --env-file .env pull
docker compose --env-file .env up -d
docker compose --env-file .env ps
echo
echo "Local-only endpoints:"
echo "  TTS:   http://127.0.0.1:${DUIX_TTS_PORT:-18180}"
echo "  ASR:   http://127.0.0.1:${DUIX_ASR_PORT:-10095}"
echo "  Video: http://127.0.0.1:${DUIX_VIDEO_PORT:-8383}"
echo "Check logs with: docker compose --env-file .env logs -f"
echo "These containers are not yet wired into the NKAI web app; do not expose their ports publicly."
