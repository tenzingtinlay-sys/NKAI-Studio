#!/usr/bin/env python3
"""Deploy NKAI Studio to a Hugging Face Docker Space and verify startup.

Secrets are read from environment variables and never printed. This script
fails closed if production authentication, persistent storage, or the protected
chat worker has not been configured.
"""
from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
from typing import Mapping
from urllib.parse import urlparse


REQUIRED_SECRETS = {
    "NKAI_BETTER_AUTH_SECRET": "BETTER_AUTH_SECRET",
    "NKAI_GOOGLE_CLIENT_ID": "GOOGLE_CLIENT_ID",
    "NKAI_GOOGLE_CLIENT_SECRET": "GOOGLE_CLIENT_SECRET",
    "NKAI_DATABASE_URL": "DATABASE_URL",
    "NKAI_AI_WORKER_INTERNAL_URL": "AI_WORKER_INTERNAL_URL",
    "NKAI_AI_WORKER_API_TOKEN": "AI_WORKER_API_TOKEN",
}
OPTIONAL_SECRETS = {
    "NKAI_TTS_INTERNAL_URL": "AI_TTS_INTERNAL_URL",
    "NKAI_TTS_API_TOKEN": "AI_TTS_API_TOKEN",
    "NKAI_LIVETALKING_INTERNAL_URL": "LIVETALKING_INTERNAL_URL",
}


def derive_space_url(repo_id: str) -> str:
    """Return the public HTTPS URL for a Hugging Face owner/space-name ID."""
    parts = repo_id.strip().split("/")
    if len(parts) != 2 or not all(parts) or any(" " in part for part in parts):
        raise ValueError("HF_SPACE_ID must be owner/space-name.")
    return "https://" + "-".join(parts).lower() + ".hf.space"


def require_https_url(value: str, source_name: str) -> None:
    parsed = urlparse(value)
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
        raise ValueError(f"{source_name} must be an HTTPS URL without embedded credentials.")
    if parsed.query or parsed.fragment:
        raise ValueError(f"{source_name} must not include a query string or fragment.")


def fetch_worker_json(url: str, token: str, label: str) -> dict:
    """Fetch a worker's JSON diagnostic endpoint without logging credentials."""
    request = urllib.request.Request(
        url,
        headers={"Authorization": "Bearer " + token, "Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            if response.status != 200:
                raise RuntimeError(f"{label} returned HTTP {response.status}.")
            payload = json.loads(response.read(1_000_000).decode("utf-8"))
    except urllib.error.HTTPError as exc:
        raise RuntimeError(f"{label} returned HTTP {exc.code}; check endpoint reachability and token configuration.") from exc
    except Exception as exc:
        if isinstance(exc, RuntimeError):
            raise
        raise RuntimeError(f"{label} could not be reached or did not return valid JSON.") from exc
    if not isinstance(payload, dict):
        raise RuntimeError(f"{label} returned an invalid JSON object.")
    return payload


def check_chat_worker(base_url: str, token: str) -> None:
    base = base_url.rstrip("/")
    health = fetch_worker_json(base + "/health", token, "Chat worker /health")
    status = str(health.get("status", "")).lower()
    if status not in {"ready", "healthy", "ok", "running"}:
        raise RuntimeError("Chat worker is not ready: " + (status or "unknown status"))
    capabilities = fetch_worker_json(base + "/capabilities", token, "Chat worker /capabilities")
    if capabilities.get("chat", {}).get("ready") is False:
        raise RuntimeError("Chat worker capabilities report that chat is not ready.")
    print("PASS: configured chat worker is reachable and reports ready.")


def check_tts_worker(base_url: str, token: str) -> None:
    base = base_url.rstrip("/")
    health = fetch_worker_json(base + "/health", token, "TTS worker /health")
    status = str(health.get("status", "")).lower()
    if status not in {"ready", "healthy", "ok", "running"}:
        raise RuntimeError("Dedicated TTS worker is not ready: " + (status or "unknown status"))
    capabilities = fetch_worker_json(base + "/capabilities", token, "TTS worker /capabilities")
    if capabilities.get("tts", {}).get("ready") is not True:
        raise RuntimeError("Dedicated TTS worker is reachable but does not report ready speech generation.")
    print("PASS: configured dedicated TTS worker is reachable and reports ready.")


def build_space_secrets(env: Mapping[str, str], repo_id: str) -> dict[str, str]:
    """Validate deployment inputs and map GitHub secret names to Space secrets."""
    missing = [key for key in REQUIRED_SECRETS if not env.get(key, "").strip()]
    if missing:
        raise ValueError(
            "Missing required GitHub repository secrets: " + ", ".join(missing)
            + ". Deployment is blocked to avoid shipping dev-user auth or an unprotected worker."
        )

    auth_secret = env["NKAI_BETTER_AUTH_SECRET"].strip()
    worker_token = env["NKAI_AI_WORKER_API_TOKEN"].strip()
    if len(auth_secret) < 32:
        raise ValueError("NKAI_BETTER_AUTH_SECRET must be at least 32 characters.")
    if len(worker_token) < 32:
        raise ValueError("NKAI_AI_WORKER_API_TOKEN must be at least 32 characters.")

    if not env["NKAI_GOOGLE_CLIENT_ID"].strip() or not env["NKAI_GOOGLE_CLIENT_SECRET"].strip():
        raise ValueError("Configure both Google OAuth client credentials.")
    require_https_url(env["NKAI_AI_WORKER_INTERNAL_URL"].strip(), "NKAI_AI_WORKER_INTERNAL_URL")
    db_url = env["NKAI_DATABASE_URL"].strip()
    if not db_url.startswith(("postgres://", "postgresql://")):
        raise ValueError("NKAI_DATABASE_URL must be a PostgreSQL connection string.")

    tts_url = env.get("NKAI_TTS_INTERNAL_URL", "").strip()
    tts_token = env.get("NKAI_TTS_API_TOKEN", "").strip()
    if bool(tts_url) != bool(tts_token):
        raise ValueError("Configure both NKAI_TTS_INTERNAL_URL and NKAI_TTS_API_TOKEN, or neither.")
    if tts_url:
        require_https_url(tts_url, "NKAI_TTS_INTERNAL_URL")
        if len(tts_token) < 32:
            raise ValueError("NKAI_TTS_API_TOKEN must be at least 32 characters.")

    livetalking_url = env.get("NKAI_LIVETALKING_INTERNAL_URL", "").strip()
    if livetalking_url:
        require_https_url(livetalking_url, "NKAI_LIVETALKING_INTERNAL_URL")

    result = {target: env[source].strip() for source, target in REQUIRED_SECRETS.items()}
    result["BETTER_AUTH_URL"] = derive_space_url(repo_id)
    for source, target in OPTIONAL_SECRETS.items():
        value = env.get(source, "").strip()
        if value:
            result[target] = value
    return result


def deploy() -> None:
    token = os.environ.get("HF_TOKEN", "").strip()
    repo_id = os.environ.get("HF_SPACE_ID", "").strip()
    if not token:
        raise ValueError("Configure GitHub repository secret HF_TOKEN.")
    space_url = derive_space_url(repo_id)
    secrets_to_set = build_space_secrets(os.environ, repo_id)

    # Fail before changing the Space if the configured worker cannot actually
    # serve inference. A page deployment must never hide an unavailable worker.
    check_chat_worker(
        os.environ["NKAI_AI_WORKER_INTERNAL_URL"].strip(),
        os.environ["NKAI_AI_WORKER_API_TOKEN"].strip(),
    )
    tts_url = os.environ.get("NKAI_TTS_INTERNAL_URL", "").strip()
    if tts_url:
        check_tts_worker(tts_url, os.environ["NKAI_TTS_API_TOKEN"].strip())

    # Import only in deploy mode so validation helpers remain unit-testable
    # without the Hugging Face SDK installed.
    from huggingface_hub import HfApi

    api = HfApi(token=token)
    try:
        api.repo_info(repo_id=repo_id, repo_type="space")
    except Exception:
        print(f"Space {repo_id} was not found; attempting to create a Docker Space.")
        api.create_repo(
            repo_id=repo_id,
            repo_type="space",
            space_sdk="docker",
            exist_ok=True,
            token=token,
        )

    for key, value in secrets_to_set.items():
        api.add_space_secret(repo_id=repo_id, key=key, value=value)
        print(f"Configured Hugging Face Space secret: {key}")

    api.upload_folder(
        repo_id=repo_id,
        repo_type="space",
        folder_path=".",
        ignore_patterns=[
            ".git/**", ".github/**", "node_modules/**", ".output/**",
            "downloads/**", "openvoice-checkpoints/**", "voice-secrets/**",
            ".env", ".env.*", "!.env.example", "*.log", "coverage/**",
        ],
        commit_message="Deploy NKAI Studio from GitHub Actions",
        token=token,
    )
    print(f"Uploaded source to Hugging Face Space {repo_id}. Waiting for the Docker Space to start.")

    deadline = time.time() + 900
    last_stage = "unknown"
    while time.time() < deadline:
        runtime = api.get_space_runtime(repo_id=repo_id, token=token)
        stage = getattr(runtime, "stage", "unknown") if runtime else "unknown"
        if stage != last_stage:
            print(f"Space runtime stage: {stage}")
            last_stage = stage
        if stage == "RUNNING":
            break
        if stage in {"BUILD_ERROR", "RUNTIME_ERROR", "CONFIG_ERROR", "NO_APP_FILE", "STOPPED", "PAUSED"}:
            raise RuntimeError(f"Hugging Face Space failed with runtime stage: {stage}")
        time.sleep(15)
    else:
        raise TimeoutError(
            f"Timed out waiting for Hugging Face Space to start; last stage was {last_stage}. "
            "Check the Space build/runtime logs."
        )

    request = urllib.request.Request(
        space_url + "/deployment",
        headers={"User-Agent": "NKAI-Studio-deployment-check"},
    )
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            if response.status != 200:
                raise RuntimeError(f"Space started but /deployment returned HTTP {response.status}")
            page = response.read(1_000_000).decode("utf-8", errors="replace")
            if "deployment" not in page.lower():
                raise RuntimeError("Space returned HTTP 200 but the deployment diagnostic marker was not found.")
            print(f"Deployment smoke test passed: {space_url}/deployment (HTTP {response.status}).")
    except urllib.error.HTTPError as exc:
        raise RuntimeError(
            f"Space runtime is RUNNING but /deployment returned HTTP {exc.code}. Check app logs."
        ) from exc
    except Exception as exc:
        raise RuntimeError(
            f"Space runtime is RUNNING but the /deployment smoke test failed: {exc}"
        ) from exc


if __name__ == "__main__":
    try:
        deploy()
    except Exception as exc:
        raise SystemExit(f"NKAI Hugging Face deployment failed: {exc}") from exc
