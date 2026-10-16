#!/usr/bin/env bash
set -euo pipefail

fail() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }
warn() { printf 'WARNING: %s\n' "$*" >&2; }
pass() { printf 'PASS: %s\n' "$*"; }

if [[ -z "${WORKER_API_TOKEN:-}" ]]; then
  fail "WORKER_API_TOKEN is missing. Add it as a secret in the GPU host settings."
fi
if [[ ${#WORKER_API_TOKEN} -lt 32 ]]; then
  fail "WORKER_API_TOKEN must be at least 32 characters. Generate a long random secret."
fi
pass "Worker API token is configured (value not displayed)."

if ! command -v python >/dev/null 2>&1; then
  fail "python is not installed."
fi
python - <<'PY'
import importlib.util
import sys
required = ("fastapi", "uvicorn", "torch", "transformers", "soundfile")
missing = [name for name in required if importlib.util.find_spec(name) is None]
if missing:
    print("ERROR: missing Python dependencies: " + ", ".join(missing), file=sys.stderr)
    raise SystemExit(1)
print("PASS: required Python modules are importable.")
try:
    import torch
    print("CUDA available:", torch.cuda.is_available())
    if not torch.cuda.is_available():
        print("WARNING: CUDA is unavailable; inference will run on CPU and may be slow.")
except Exception as exc:
    print("ERROR: PyTorch check failed:", exc, file=sys.stderr)
    raise SystemExit(1)
PY

if [[ -z "${CORS_ORIGINS:-}" || "${CORS_ORIGINS}" == "*" ]]; then
  warn "CORS_ORIGINS is wildcard/empty. Prefer the exact NKAI Studio origin when direct browser access is needed."
else
  pass "CORS_ORIGINS is explicitly configured."
fi

printf '\nPreflight complete. Start the worker with the host's supported process manager.\n'
printf 'Then verify GET /health and GET /capabilities, followed by authenticated chat and TTS smoke tests.\n'
