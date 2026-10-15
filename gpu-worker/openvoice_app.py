"""Optional OpenVoice V2 + MeloTTS service.

Install dependencies and the official OpenVoice V2 checkpoints separately; see
OPENVOICE_SETUP.md. Use only a reference recording you own or have explicit
permission to use for voice conversion.
"""
import base64
import gc
import hmac
import io
import os
import tempfile
from pathlib import Path
from threading import Lock

import soundfile as sf
import torch
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

OPENVOICE_ROOT = Path(os.getenv("OPENVOICE_ROOT", "./OpenVoice")).resolve()
CHECKPOINT_ROOT = Path(os.getenv("OPENVOICE_CHECKPOINT_ROOT", str(OPENVOICE_ROOT / "checkpoints_v2"))).resolve()
REFERENCE_AUDIO = Path(os.getenv("OPENVOICE_REFERENCE_AUDIO", "")).resolve()
DEVICE = "cuda:0" if torch.cuda.is_available() else "cpu"
MAX_TEXT_CHARS = int(os.getenv("MAX_TEXT_CHARS", "500"))
WORKER_API_TOKEN = os.getenv("WORKER_API_TOKEN", "").strip()
ALLOW_UNAUTHENTICATED = os.getenv("ALLOW_UNAUTHENTICATED_LOCAL", "false").strip().lower() == "true"

LANGUAGES = {
    "en": "EN", "en-us": "EN", "en-gb": "EN", "en-in": "EN", "en-au": "EN",
    "es": "ES", "es-es": "ES", "fr": "FR", "fr-fr": "FR",
    "zh": "ZH", "zh-cn": "ZH", "ja": "JP", "ja-jp": "JP",
    "ko": "KR", "ko-kr": "KR",
}
LANGUAGE_NAMES = {
    "EN": "English", "ES": "Spanish", "FR": "French",
    "ZH": "Chinese", "JP": "Japanese", "KR": "Korean",
}

app = FastAPI(title="NKAI OpenVoice V2 Worker", version="1.0.0")
origins = [x.strip() for x in os.getenv("CORS_ORIGINS", "*").split(",") if x.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)
converter = None
target_speaker_embedding = None
startup_error = None
melo_tts_model = None
melo_tts_language = None
source_embedding_cache = {}
converter_lock = Lock()
generation_lock = Lock()


class TTSRequest(BaseModel):
    text: str = Field(min_length=1, max_length=5000)
    language: str = "en-US"
    consent_confirmed: bool = False


def check_auth(authorization: str | None):
    if not WORKER_API_TOKEN and not ALLOW_UNAUTHENTICATED:
        raise HTTPException(status_code=503, detail="Worker access token is not configured. Set WORKER_API_TOKEN before exposing this service.")
    if WORKER_API_TOKEN:
        supplied = authorization.removeprefix("Bearer ").strip() if authorization else ""
        if not hmac.compare_digest(supplied, WORKER_API_TOKEN):
            raise HTTPException(status_code=401, detail="Invalid or missing worker token")


@app.on_event("startup")
def load_converter():
    global converter, target_speaker_embedding, startup_error
    startup_error = None
    if not REFERENCE_AUDIO.is_file():
        # Keep service available for health checks, but explain why TTS is not ready.
        startup_error = "Set OPENVOICE_REFERENCE_AUDIO to a private, authorized voice recording."
        return
    config = CHECKPOINT_ROOT / "converter" / "config.json"
    checkpoint = CHECKPOINT_ROOT / "converter" / "checkpoint.pth"
    if not config.is_file() or not checkpoint.is_file():
        startup_error = "OpenVoice V2 converter checkpoints are missing from OPENVOICE_CHECKPOINT_ROOT."
        return
    try:
        from openvoice import se_extractor
        from openvoice.api import ToneColorConverter
        with converter_lock:
            converter = ToneColorConverter(str(config), device=DEVICE)
            converter.load_ckpt(str(checkpoint))
            target_speaker_embedding, _ = se_extractor.get_se(
                str(REFERENCE_AUDIO), converter, vad=True
            )
    except Exception as exc:
        converter = None
        target_speaker_embedding = None
        startup_error = f"Could not load OpenVoice converter/reference audio: {type(exc).__name__}: {exc}"


@app.get("/health")
def health():
    ready = converter is not None and target_speaker_embedding is not None
    auth_ready = bool(WORKER_API_TOKEN) or ALLOW_UNAUTHENTICATED
    if not auth_ready:
        status = "auth-not-configured"
    elif ready:
        status = "ready"
    else:
        status = "needs-checkpoints-or-reference-audio"
    return {
        "status": status,
        "provider": "OpenVoice V2 + MeloTTS",
        "device": DEVICE,
        "referenceAudioConfigured": REFERENCE_AUDIO.is_file(),
        "authenticationConfigured": bool(WORKER_API_TOKEN),
        "allowUnauthenticatedLocal": ALLOW_UNAUTHENTICATED,
        "detail": startup_error or (None if auth_ready else "Set WORKER_API_TOKEN. For private localhost-only experiments, explicitly set ALLOW_UNAUTHENTICATED_LOCAL=true."),
    }


@app.get("/capabilities")
def capabilities():
    return {
        "tts": {
            "provider": "OpenVoice V2 + MeloTTS",
            "ready": converter is not None and target_speaker_embedding is not None,
            "languages": [{"code": key, "label": LANGUAGE_NAMES[value]} for key, value in LANGUAGES.items()],
            "voiceCloning": True,
            "requiresConsentedReferenceAudio": True,
            "detail": startup_error,
            "license": "OpenVoice V1/V2 project is MIT; verify MeloTTS, checkpoint and dependency terms for your deployment.",
        },
        "device": DEVICE,
        "authenticationConfigured": bool(WORKER_API_TOKEN),
        "allowUnauthenticatedLocal": ALLOW_UNAUTHENTICATED,
    }

@app.post("/chat")
def chat_not_supported():
    raise HTTPException(status_code=501, detail="This endpoint provides TTS only. Configure the separate NKAI chat worker for /chat.")


@app.post("/tts")
def synthesize(request: TTSRequest, authorization: str | None = Header(default=None)):
    check_auth(authorization)
    if not request.consent_confirmed:
        raise HTTPException(status_code=400, detail="Confirm that you own or have permission to use the reference voice.")
    if converter is None or target_speaker_embedding is None:
        raise HTTPException(status_code=503, detail="OpenVoice is not ready. Check checkpoints and OPENVOICE_REFERENCE_AUDIO.")
    language = LANGUAGES.get(request.language.lower())
    if not language:
        raise HTTPException(status_code=400, detail="Unsupported OpenVoice V2 language. Supported: English, Spanish, French, Chinese, Japanese, Korean.")
    text = request.text.strip()[:MAX_TEXT_CHARS]
    if not text:
        raise HTTPException(status_code=400, detail="Text is required.")
    try:
        from melo.api import TTS
        global melo_tts_model, melo_tts_language
        with generation_lock, tempfile.TemporaryDirectory(prefix="nkai-openvoice-") as temp:
            temp_dir = Path(temp)
            source_path = temp_dir / "source.wav"
            output_path = temp_dir / "output.wav"
            # Keep only the active language's MeloTTS model resident. Reusing it
            # avoids reloading model weights for every message without filling a
            # small free GPU with six language models at once.
            if melo_tts_model is None or melo_tts_language != language:
                if melo_tts_model is not None:
                    del melo_tts_model
                    melo_tts_model = None
                    gc.collect()
                    if torch.cuda.is_available():
                        torch.cuda.empty_cache()
                melo_tts_model = TTS(language=language, device=DEVICE)
                melo_tts_language = language
            tts_model = melo_tts_model
            speaker_ids = tts_model.hps.data.spk2id
            if not speaker_ids:
                raise HTTPException(status_code=500, detail=f"No base speaker found for {language}.")
            speaker_key, speaker_id = next(iter(speaker_ids.items()))
            speaker_key = speaker_key.lower().replace("_", "-")
            source_embedding_path = CHECKPOINT_ROOT / "base_speakers" / "ses" / f"{speaker_key}.pth"
            if not source_embedding_path.is_file():
                raise HTTPException(status_code=503, detail=f"Missing source speaker embedding: {source_embedding_path.name}")
            embedding_key = str(source_embedding_path)
            source_embedding = source_embedding_cache.get(embedding_key)
            if source_embedding is None:
                source_embedding = torch.load(source_embedding_path, map_location=DEVICE, weights_only=False)
                source_embedding_cache[embedding_key] = source_embedding
            tts_model.tts_to_file(text, speaker_id, str(source_path), speed=1.0)
            converter.convert(
                audio_src_path=str(source_path),
                src_se=source_embedding.to(DEVICE),
                tgt_se=target_speaker_embedding,
                output_path=str(output_path),
                message="@NKAI",
            )
            audio_bytes = output_path.read_bytes()
        return {
            "audio_base64": base64.b64encode(audio_bytes).decode("ascii"),
            "mime_type": "audio/wav",
            "language": request.language,
            "provider": "OpenVoice V2 + MeloTTS",
            "voiceCloning": True,
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Speech generation failed: {type(exc).__name__}: {exc}") from exc
