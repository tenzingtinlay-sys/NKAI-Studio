#!/usr/bin/env python3
"""Register a running Colab Qwen worker with the NKAI Cloudflare AI gateway.

Run in the Colab notebook after the worker and its cloudflared quick tunnel are
running. Secrets are prompted with getpass and are never printed.
"""
from __future__ import annotations

import getpass
import json
import time
import urllib.error
import urllib.request
from urllib.parse import urlparse

DEFAULT_GATEWAY = "https://nkai-avatar-gateway.tenzingtinlay.workers.dev"
WORKER_ID = "nkai-colab-qwen"
HEARTBEAT_SECONDS = 25


def request_json(url: str, method: str = "GET", token: str | None = None, payload: dict | None = None, timeout: int = 20):
    headers = {"Accept": "application/json"}
    body = None
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if payload is not None:
        body = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            raw = response.read().decode("utf-8", errors="replace")
            try:
                data = json.loads(raw) if raw else {}
            except json.JSONDecodeError:
                data = {"raw": raw[:500]}
            return response.status, data
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        try:
            data = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            data = {"raw": raw[:500]}
        return exc.code, data


def post_or_fail(url: str, token: str, payload: dict):
    status, data = request_json(url, method="POST", token=token, payload=payload)
    if not 200 <= status < 300:
        raise RuntimeError(f"Request to {url} failed with HTTP {status}: {data}")
    return data


def main():
    gateway = input(f"Gateway URL [{DEFAULT_GATEWAY}]: ").strip() or DEFAULT_GATEWAY
    gateway = gateway.rstrip("/")
    worker_url = input("Current public Colab tunnel URL (https://....trycloudflare.com): ").strip().rstrip("/")
    parsed_gateway = urlparse(gateway)
    parsed_worker = urlparse(worker_url)
    if parsed_gateway.scheme != "https" or not parsed_gateway.netloc:
        raise SystemExit("Gateway URL must be a valid HTTPS URL.")
    if parsed_worker.scheme != "https" or not parsed_worker.hostname or not parsed_worker.hostname.endswith(".trycloudflare.com"):
        raise SystemExit("Worker URL must be the current HTTPS trycloudflare.com tunnel URL.")
    register_secret = getpass.getpass("AI_REGISTER_SECRET (GitHub secret NKAI_AI_REGISTER_SECRET): ")
    client_secret = getpass.getpass("AI_CLIENT_SECRET (GitHub secret NKAI_AI_CLIENT_SECRET): ")
    if len(register_secret) < 32 or len(client_secret) < 32:
        raise SystemExit("Gateway AI secrets must each be at least 32 characters.")

    registration = {"id": WORKER_ID, "url": worker_url, "priority": 1}
    print("Registering Colab worker...")
    print(post_or_fail(f"{gateway}/api/ai/register", register_secret, registration))

    status, caps = request_json(f"{gateway}/api/ai/capabilities", token=client_secret)
    if status != 200:
        raise SystemExit(f"Gateway capabilities check failed (HTTP {status}): {caps}")
    print("Gateway capabilities check: HTTP 200")
    print(json.dumps(caps, ensure_ascii=False))

    status, chat = request_json(
        f"{gateway}/api/ai/chat",
        method="POST",
        token=client_secret,
        payload={"message": "Reply with exactly: NKAI Colab Qwen gateway connection verified.", "language": "en-IN", "history": []},
        timeout=90,
    )
    if status != 200:
        raise SystemExit(f"Gateway chat smoke test failed (HTTP {status}): {chat}")
    print("Gateway chat smoke test: HTTP 200")
    print(json.dumps(chat, ensure_ascii=False))

    print(f"Worker registered as {WORKER_ID}. Keep this cell running to renew its 90-second lease.")
    print("Press Stop/Interrupt to end the heartbeat; the registration will expire automatically.")
    while True:
        time.sleep(HEARTBEAT_SECONDS)
        status, data = request_json(
            f"{gateway}/api/ai/heartbeat",
            method="POST",
            token=register_secret,
            payload={"id": WORKER_ID},
        )
        if status == 404:
            data = post_or_fail(f"{gateway}/api/ai/register", register_secret, registration)
            print("Worker registration refreshed after expiry:", data)
        elif status == 200:
            print("Heartbeat OK")
        else:
            print(f"Heartbeat failed (HTTP {status}): {data}; retrying in {HEARTBEAT_SECONDS}s")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nStopped. The gateway will expire this registration after its TTL.")
