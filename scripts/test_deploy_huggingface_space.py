import io
import json
import unittest
from contextlib import redirect_stdout
from unittest.mock import patch
from urllib.parse import urlparse

from deploy_huggingface_space import (
    build_space_secrets,
    check_chat_worker,
    check_tts_worker,
    derive_space_url,
)


def valid_env():
    return {
        "NKAI_BETTER_AUTH_SECRET": "a" * 40,
        "NKAI_GOOGLE_CLIENT_ID": "nkai-test-client.apps.googleusercontent.com",
        "NKAI_GOOGLE_CLIENT_SECRET": "google-client-secret-long-enough",
        "NKAI_DATABASE_URL": "postgresql://user:password@db.example.com/nkai",
        "NKAI_AI_WORKER_INTERNAL_URL": "https://worker.example.com",
        "NKAI_AI_WORKER_API_TOKEN": "w" * 40,
    }


class FakeResponse:
    def __init__(self, payload):
        self.status = 200
        self.payload = payload

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        return False

    def read(self, limit):
        return json.dumps(self.payload).encode("utf-8")


class DeployHuggingFaceSpaceTests(unittest.TestCase):
    def test_derives_space_url(self):
        self.assertEqual(
            derive_space_url("NeerajKapil/NKAI-Studio"),
            "https://neerajkapil-nkai-studio.hf.space",
        )

    def test_rejects_malformed_space_id(self):
        for value in ("", "owner", "/space", "owner/", "owner/two/parts", "owner/name with space"):
            with self.subTest(value=value), self.assertRaises(ValueError):
                derive_space_url(value)

    def test_maps_required_secrets_without_exposing_values(self):
        env = valid_env()
        mapped = build_space_secrets(env, "owner/nkai-studio")
        self.assertEqual(mapped["BETTER_AUTH_URL"], "https://owner-nkai-studio.hf.space")
        self.assertEqual(mapped["DATABASE_URL"], env["NKAI_DATABASE_URL"])
        self.assertEqual(mapped["AI_WORKER_INTERNAL_URL"], env["NKAI_AI_WORKER_INTERNAL_URL"])
        self.assertEqual(mapped["AI_WORKER_API_TOKEN"], env["NKAI_AI_WORKER_API_TOKEN"])
        self.assertNotIn("AI_TTS_INTERNAL_URL", mapped)

    def test_allows_browser_only_deployment_without_worker_secrets(self):
        env = valid_env()
        del env["NKAI_AI_WORKER_INTERNAL_URL"]
        del env["NKAI_AI_WORKER_API_TOKEN"]
        env["NKAI_BROWSER_ONLY_DEPLOYMENT"] = "true"
        mapped = build_space_secrets(env, "owner/nkai-studio")
        self.assertNotIn("AI_WORKER_INTERNAL_URL", mapped)
        self.assertNotIn("AI_WORKER_API_TOKEN", mapped)
        self.assertEqual(mapped["BETTER_AUTH_URL"], "https://owner-nkai-studio.hf.space")

    def test_rejects_partial_worker_configuration(self):
        env = valid_env()
        del env["NKAI_AI_WORKER_API_TOKEN"]
        with self.assertRaisesRegex(ValueError, "Configure both NKAI_AI_WORKER_INTERNAL_URL"):
            build_space_secrets(env, "owner/nkai-studio")

    def test_can_require_worker_instead_of_browser_only(self):
        env = valid_env()
        del env["NKAI_AI_WORKER_INTERNAL_URL"]
        del env["NKAI_AI_WORKER_API_TOKEN"]
        env["NKAI_BROWSER_ONLY_DEPLOYMENT"] = "false"
        with self.assertRaisesRegex(ValueError, "No AI worker is configured"):
            build_space_secrets(env, "owner/nkai-studio")

    def test_rejects_short_auth_and_worker_secrets(self):
        env = valid_env()
        env["NKAI_BETTER_AUTH_SECRET"] = "short"
        with self.assertRaisesRegex(ValueError, "BETTER_AUTH_SECRET"):
            build_space_secrets(env, "owner/nkai-studio")
        env = valid_env()
        env["NKAI_AI_WORKER_API_TOKEN"] = "short"
        with self.assertRaisesRegex(ValueError, "AI_WORKER_API_TOKEN"):
            build_space_secrets(env, "owner/nkai-studio")

    def test_requires_https_for_remote_endpoints(self):
        env = valid_env()
        env["NKAI_AI_WORKER_INTERNAL_URL"] = "http://worker.example.com"
        with self.assertRaisesRegex(ValueError, "HTTPS"):
            build_space_secrets(env, "owner/nkai-studio")

    def test_requires_tts_url_and_token_together(self):
        env = valid_env()
        env["NKAI_TTS_INTERNAL_URL"] = "https://tts.example.com"
        with self.assertRaisesRegex(ValueError, "both NKAI_TTS_INTERNAL_URL"):
            build_space_secrets(env, "owner/nkai-studio")

    def test_maps_optional_cloudflare_avatar_gateway_secrets(self):
        env = valid_env()
        env["NKAI_AI_GATEWAY_URL"] = "https://nkai-avatar-gateway.example.workers.dev"
        env["NKAI_AI_CLIENT_SECRET"] = "c" * 40
        mapped = build_space_secrets(env, "owner/nkai-studio")
        self.assertEqual(mapped["NKAI_AI_GATEWAY_URL"], env["NKAI_AI_GATEWAY_URL"])
        self.assertEqual(mapped["NKAI_AI_CLIENT_SECRET"], env["NKAI_AI_CLIENT_SECRET"])

    def test_gateway_url_requires_client_secret(self):
        env = valid_env()
        env["NKAI_AI_GATEWAY_URL"] = "https://nkai-avatar-gateway.example.workers.dev"
        with self.assertRaisesRegex(ValueError, "NKAI_AI_CLIENT_SECRET"):
            build_space_secrets(env, "owner/nkai-studio")

    def test_rejects_short_gateway_client_secret(self):
        env = valid_env()
        env["NKAI_AI_CLIENT_SECRET"] = "short"
        with self.assertRaisesRegex(ValueError, "at least 32 characters"):
            build_space_secrets(env, "owner/nkai-studio")

    def test_chat_worker_preflight_requires_ready_health_and_capabilities(self):
        def fake_urlopen(request, timeout):
            path = urlparse(request.full_url).path
            payload = {"status": "ready"} if path.endswith("/health") else {"chat": {"ready": True}}
            return FakeResponse(payload)

        with patch("deploy_huggingface_space.urllib.request.urlopen", side_effect=fake_urlopen):
            # Keep mocked readiness from looking like a live endpoint test in CI logs.
            with redirect_stdout(io.StringIO()):
                check_chat_worker("https://worker.example.com/", "w" * 40)

    def test_chat_worker_preflight_rejects_loading_model(self):
        def fake_urlopen(request, timeout):
            return FakeResponse({"status": "loading"})

        with patch("deploy_huggingface_space.urllib.request.urlopen", side_effect=fake_urlopen):
            with self.assertRaisesRegex(RuntimeError, "not ready"):
                check_chat_worker("https://worker.example.com", "w" * 40)

    def test_tts_worker_preflight_requires_voice_readiness(self):
        def fake_urlopen(request, timeout):
            path = urlparse(request.full_url).path
            payload = {"status": "ready"} if path.endswith("/health") else {"tts": {"ready": False}}
            return FakeResponse(payload)

        with patch("deploy_huggingface_space.urllib.request.urlopen", side_effect=fake_urlopen):
            with self.assertRaisesRegex(RuntimeError, "does not report ready speech"):
                check_tts_worker("https://tts.example.com", "t" * 40)

    def test_maps_optional_tts_and_livetalking(self):
        env = valid_env()
        env["NKAI_TTS_INTERNAL_URL"] = "https://tts.example.com"
        env["NKAI_TTS_API_TOKEN"] = "t" * 40
        env["NKAI_LIVETALKING_INTERNAL_URL"] = "https://livetalking.example.com"
        mapped = build_space_secrets(env, "owner/nkai-studio")
        self.assertEqual(mapped["AI_TTS_INTERNAL_URL"], env["NKAI_TTS_INTERNAL_URL"])
        self.assertEqual(mapped["AI_TTS_API_TOKEN"], env["NKAI_TTS_API_TOKEN"])
        self.assertEqual(mapped["LIVETALKING_INTERNAL_URL"], env["NKAI_LIVETALKING_INTERNAL_URL"])


if __name__ == "__main__":
    unittest.main()
