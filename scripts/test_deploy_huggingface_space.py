import unittest

from deploy_huggingface_space import build_space_secrets, derive_space_url


def valid_env():
    return {
        "NKAI_BETTER_AUTH_SECRET": "a" * 40,
        "NKAI_GROK_AUTH_ISSUER": "https://auth.example.com",
        "NKAI_GROK_AUTH_CLIENT_ID": "nkai-client-id",
        "NKAI_GROK_AUTH_CLIENT_SECRET": "client-secret-long-enough",
        "NKAI_DATABASE_URL": "postgresql://user:password@db.example.com/nkai",
        "NKAI_AI_WORKER_INTERNAL_URL": "https://worker.example.com",
        "NKAI_AI_WORKER_API_TOKEN": "w" * 40,
    }


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

    def test_rejects_missing_required_secrets(self):
        env = valid_env()
        del env["NKAI_AI_WORKER_API_TOKEN"]
        with self.assertRaisesRegex(ValueError, "NKAI_AI_WORKER_API_TOKEN"):
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
