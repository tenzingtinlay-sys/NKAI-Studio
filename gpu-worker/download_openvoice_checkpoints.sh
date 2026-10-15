#!/usr/bin/env bash
set -euo pipefail

# Downloads only the official OpenVoice V2 checkpoint archive referenced by
# the upstream usage guide. The archive is large; run this on the target GPU host.
# Do not commit the downloaded model files or voice reference audio to Git.
ROOT="${OPENVOICE_ROOT:-$PWD/OpenVoice}"
CHECKPOINT_ROOT="${OPENVOICE_CHECKPOINT_ROOT:-$ROOT/checkpoints_v2}"
URL="https://myshell-public-repo-hosting.s3.amazonaws.com/openvoice/checkpoints_v2_0417.zip"
ARCHIVE="${TMPDIR:-/tmp}/nkai-openvoice-checkpoints_v2_0417.zip"

command -v curl >/dev/null || { echo "curl is required" >&2; exit 1; }
command -v unzip >/dev/null || { echo "unzip is required" >&2; exit 1; }
mkdir -p "$ROOT" "$CHECKPOINT_ROOT"

if [[ -f "$CHECKPOINT_ROOT/converter/config.json" && -f "$CHECKPOINT_ROOT/converter/checkpoint.pth" ]]; then
  echo "OpenVoice converter checkpoints already exist at $CHECKPOINT_ROOT"
  exit 0
fi

echo "Downloading official OpenVoice V2 checkpoint archive (large file)..."
curl --fail --location --retry 3 --output "$ARCHIVE" "$URL"
echo "Checking archive listing..."
unzip -t "$ARCHIVE"
STAGING="$(mktemp -d)"
trap 'rm -rf "$STAGING"; rm -f "$ARCHIVE"' EXIT
unzip -q "$ARCHIVE" -d "$STAGING"

# The upstream archive may contain a top-level directory; locate the converter
# config and copy the complete extracted checkpoint tree into the configured path.
CONFIG="$(find "$STAGING" -type f -path '*/converter/config.json' -print -quit)"
if [[ -z "$CONFIG" ]]; then
  echo "Could not find converter/config.json in the archive. Nothing installed." >&2
  exit 1
fi
SOURCE_ROOT="${CONFIG%/converter/config.json}"
if [[ ! -f "$SOURCE_ROOT/converter/checkpoint.pth" ]]; then
  echo "Converter checkpoint is missing from archive. Nothing installed." >&2
  exit 1
fi
mkdir -p "$(dirname "$CHECKPOINT_ROOT")"
cp -a "$SOURCE_ROOT/." "$CHECKPOINT_ROOT/"
if [[ ! -f "$CHECKPOINT_ROOT/converter/config.json" || ! -f "$CHECKPOINT_ROOT/converter/checkpoint.pth" ]]; then
  echo "Post-install validation failed." >&2
  exit 1
fi
echo "OpenVoice V2 checkpoints installed at $CHECKPOINT_ROOT"
echo "Next: install MeloTTS, set OPENVOICE_REFERENCE_AUDIO to an authorized recording,"
echo "and launch uvicorn openvoice_app:app. See OPENVOICE_SETUP.md."
