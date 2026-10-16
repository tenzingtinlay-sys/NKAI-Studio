#!/usr/bin/env python3
"""Register a local LiveTalking server with NKAI's Cloudflare gateway."""
import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.request
from urllib.parse import urlparse

LIVE_TALKING_HEALTH_PATHS = ("/", "/index.html")


def request_json(url, secret, payload=None, timeout=10):
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Authorization": f"Bearer {secret}",
            "Content-Type": "application/json",
            "User-Agent": "NKAI-LiveAvatarHost/1.0",
        },
        method="GET" if payload is None else "POST",
    )
    with urllib.request.urlopen(req, timeout=timeout) as response:
        body = response.read().decode("utf-8", errors="replace")
        return json.loads(body) if body else {}


def local_livetalking_ready(base_url):
    for path in LIVE_TALKING_HEALTH_PATHS:
        try:
            req = urllib.request.Request(base_url.rstrip("/") + path, headers={"User-Agent": "NKAI-LiveAvatarHost/1.0"})
            with urllib.request.urlopen(req, timeout=4) as response:
                if 200 <= response.status < 400:
                    return True
        except Exception:
            pass
    return False


def start_tunnel(cloudflared, local_url):
    proc = subprocess.Popen(
        [cloudflared, "tunnel", "--no-autoupdate", "--url", local_url],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )
    pattern = re.compile(r"https://[a-z0-9-]+\.trycloudflare\.com", re.I)
    deadline = time.time() + 90
    lines = []
    while time.time() < deadline:
        if proc.poll() is not None:
            raise RuntimeError("cloudflared exited before creating a tunnel. Check the cloudflared installation.")
        line = proc.stdout.readline() if proc.stdout else ""
        if line:
            print("[cloudflared]", line.rstrip(), flush=True)
            lines.append(line)
            match = pattern.search(line)
            if match:
                return proc, match.group(0)
        else:
            time.sleep(0.2)
    proc.terminate()
    raise RuntimeError("Timed out waiting for a trycloudflare.com URL. See cloudflared output above.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--gateway", required=True, help="Gateway base URL, e.g. https://nkai-avatar-gateway.example.workers.dev")
    parser.add_argument("--secret", default=os.getenv("REGISTER_SECRET"), help="Same secret configured in Cloudflare (or REGISTER_SECRET env var)")
    parser.add_argument("--id", required=True, help="Unique host ID, e.g. mypc or lightning")
    parser.add_argument("--priority", type=int, default=100, help="Lower number wins when multiple hosts are online")
    parser.add_argument("--local-url", default="http://127.0.0.1:8010", help="LiveTalking HTTP origin")
    parser.add_argument("--cloudflared", default="cloudflared", help="cloudflared executable path")
    args = parser.parse_args()

    gateway = args.gateway.rstrip("/")
    parsed = urlparse(gateway)
    if parsed.scheme != "https" or not parsed.netloc:
        parser.error("--gateway must be an HTTPS URL")
    if not args.secret or len(args.secret) < 24:
        parser.error("Provide a long --secret or REGISTER_SECRET environment variable (at least 24 characters)")
    if not re.fullmatch(r"[A-Za-z0-9_-]{1,48}", args.id):
        parser.error("--id may contain only letters, numbers, underscore and hyphen (max 48 chars)")
    if shutil.which(args.cloudflared) is None and not os.path.isfile(args.cloudflared):
        parser.error("cloudflared was not found; install it or pass --cloudflared with its full path")

    if not local_livetalking_ready(args.local_url):
        sys.exit(f"LiveTalking did not respond at {args.local_url}. Start app.py first and check its logs.")

    tunnel, public_url = start_tunnel(args.cloudflared, args.local_url)
    print(f"Tunnel ready: {public_url}", flush=True)
    payload = {"id": args.id, "url": public_url, "priority": args.priority}
    heartbeat_interval = 25
    try:
        while True:
            try:
                request_json(gateway + "/register", args.secret, payload, timeout=10)
                print(f"Registered with the gateway: id={args.id}, priority={args.priority}", flush=True)
                break
            except Exception as exc:
                print(f"Initial registration failed; retrying in 5 seconds: {exc}", flush=True)
                time.sleep(5)
        while True:
            time.sleep(heartbeat_interval)
            try:
                request_json(gateway + "/heartbeat", args.secret, {"id": args.id}, timeout=10)
            except urllib.error.HTTPError as exc:
                if exc.code == 404:
                    request_json(gateway + "/register", args.secret, payload, timeout=10)
                    print("Re-registered after gateway TTL expiry.", flush=True)
                else:
                    print(f"Heartbeat failed (HTTP {exc.code}); retrying next interval.", flush=True)
            except Exception as exc:
                print(f"Heartbeat failed; retrying next interval: {exc}", flush=True)
    except KeyboardInterrupt:
        print("Stopping host agent…", flush=True)
    finally:
        try:
            request_json(gateway + "/unregister", args.secret, {"id": args.id}, timeout=5)
        except Exception:
            pass
        tunnel.terminate()
        try:
            tunnel.wait(timeout=5)
        except subprocess.TimeoutExpired:
            tunnel.kill()


if __name__ == "__main__":
    main()
