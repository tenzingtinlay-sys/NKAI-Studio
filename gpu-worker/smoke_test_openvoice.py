#!/usr/bin/env python3
"""Smoke-test a deployed NKAI OpenVoice worker using only Python's standard library.

Examples:
  python gpu-worker/smoke_test_openvoice.py https://YOUR-WORKER
  WORKER_API_TOKEN=... python gpu-worker/smoke_test_openvoice.py https://YOUR-WORKER
  WORKER_API_TOKEN=... python gpu-worker/smoke_test_openvoice.py https://YOUR-WORKER --test-tts --consent-confirmed --output test.wav
"""
import argparse
import base64
import json
import os
import sys
import urllib.error
import urllib.request
import wave
from pathlib import Path


def request_json(url, token, method="GET", payload=None, timeout=30):
    body = None if payload is None else json.dumps(payload).encode("utf-8")
    headers = {"Accept": "application/json"}
    if body is not None:
        headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = "Bearer " + token
    request = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return response.status, json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {exc.code} from {url}: {detail}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Could not reach {url}: {exc.reason}") from exc


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("base_url", help="Worker base URL, e.g. https://worker.example")
    parser.add_argument("--test-tts", action="store_true", help="Generate a short audio sample")
    parser.add_argument("--consent-confirmed", action="store_true", help="Confirm permission to use the configured reference voice")
    parser.add_argument("--language", default="en-US", help="TTS language tag (default: en-US)")
    parser.add_argument("--voice", default=None, help="Optional voice style/name for compatible TTS workers")
    parser.add_argument("--text", default="Hello! This is a short NKAI Studio voice test.")
    parser.add_argument("--output", default="nkai-voice-smoke-test.wav")
    args = parser.parse_args()
    base = args.base_url.rstrip("/")
    if not base.startswith("https://") and not base.startswith("http://localhost") and not base.startswith("http://127.0.0.1"):
        parser.error("Use HTTPS for remote workers; HTTP is allowed only on localhost.")
    token = os.getenv("WORKER_API_TOKEN", "").strip()

    health_status, health = request_json(base + "/health", token)
    print(f"Health HTTP {health_status}: {json.dumps(health, ensure_ascii=False)}")
    cap_status, caps = request_json(base + "/capabilities", token)
    print(f"Capabilities HTTP {cap_status}: {json.dumps(caps, ensure_ascii=False)}")
    if health.get("status") != "ready":
        print("Worker is reachable but not ready. Fix the detail above before expecting speech.", file=sys.stderr)
        return 2
    if not args.test_tts:
        print("Connectivity smoke test passed. Add --test-tts to synthesize a short WAV sample.")
        return 0
    if not args.consent_confirmed:
        parser.error("--test-tts requires --consent-confirmed because this worker uses a reference voice.")
    _, result = request_json(
        base + "/tts",
        token,
        method="POST",
        payload={
            "text": args.text,
            "language": args.language,
            "consent_confirmed": True,
            **({"voice": args.voice} if args.voice else {}),
        },
        timeout=180,
    )
    audio = result.get("audio_base64")
    if not audio:
        raise RuntimeError("TTS response did not contain audio_base64.")
    audio_bytes = base64.b64decode(audio, validate=True)
    output = Path(args.output)
    output.write_bytes(audio_bytes)
    # WAV header validation without loading all samples into memory.
    with wave.open(str(output), "rb") as wav:
        frames = wav.getnframes()
        rate = wav.getframerate()
        if frames <= 0 or rate <= 0:
            raise RuntimeError("Generated WAV has no audio frames or an invalid sample rate.")
        print(f"TTS smoke test passed: {output.resolve()} · {frames / rate:.2f}s · {rate} Hz · {wav.getnchannels()} channel(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
