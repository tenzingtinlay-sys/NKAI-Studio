"""Optional Indic-Speak voice service, isolated from the Transformers v4 chat worker.

Requires authorized Hugging Face access to bodhan-ai/indic-speak. Model weights
are downloaded by Hugging Face on first startup and are never committed here.
"""
import base64
import hmac
import io
import os
from threading import Lock

import numpy as np
import soundfile as sf
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

MODEL_ID = os.getenv("INDIC_SPEAK_MODEL_ID", "bodhan-ai/indic-speak")
DEFAULT_SPEAKER = os.getenv("INDIC_SPEAK_SPEAKER", "Amit")
SAMPLE_RATE = 24000
app = FastAPI(title="NKAI Indic-Speak Voice Worker", version="0.1.0")
origins = [v.strip() for v in os.getenv("CORS_ORIGINS", "*").split(",") if v.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

tts_engine = None
tts_lock = Lock()
generation_lock = Lock()


class TTSRequest(BaseModel):
    text: str = Field(min_length=1, max_length=4000)
    language: str = Field(default="auto", max_length=32)
    speaker: str | None = Field(default=None, max_length=80)


def check_token(authorization: str | None) -> None:
    expected = os.getenv("WORKER_API_TOKEN", "").strip()
    if not expected:
        return
    supplied = authorization.removeprefix("Bearer ").strip() if authorization else ""
    if not hmac.compare_digest(supplied, expected):
        raise HTTPException(status_code=401, detail="Invalid or missing worker token")


def load_tts():
    global tts_engine
    if tts_engine is None:
        with tts_lock:
            if tts_engine is None:
                # Import from the model's downloaded repository snapshot.
                from huggingface_hub import snapshot_download
                model_path = snapshot_download(repo_id=MODEL_ID)
                import sys
                if model_path not in sys.path:
                    sys.path.insert(0, model_path)
                from inference import TTS
                tts_engine = TTS(model_path)


@app.on_event("startup")
def startup():
    # Fail visibly on missing gated access/dependencies instead of claiming ready.
    load_tts()


@app.get("/health")
def health():
    return {
        "status": "ready" if tts_engine is not None else "loading",
        "provider": "indic-speak",
        "model": MODEL_ID,
        "sampleRate": SAMPLE_RATE,
    }


@app.get("/capabilities")
def capabilities():
    return {
        "tts": {
            "provider": "indic-speak",
            "model": MODEL_ID,
            "ready": tts_engine is not None,
            "languages": [
                "en", "hi", "bn", "mr", "te", "ta", "gu", "kn", "ml", "or",
                "pa", "as", "ur", "brx", "doi", "kok", "ks", "mai", "ne",
                "mni", "sa", "sat", "sd"
            ],
            "sampleRate": SAMPLE_RATE,
            "voiceCloning": False,
            "note": "Language is inferred from the supplied text by the model; validate each desired language and review the model's current access and licence terms.",
        }
    }


@app.post("/tts")
def synthesize(request: TTSRequest, authorization: str | None = Header(default=None)):
    check_token(authorization)
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text is required")
    if tts_engine is None:
        raise HTTPException(status_code=503, detail="Voice model is not ready")
    speaker = request.speaker or DEFAULT_SPEAKER
    try:
        with generation_lock:
            waveform = tts_engine(request.text.strip(), speaker=speaker)
        audio = np.asarray(waveform, dtype=np.float32).squeeze()
        if audio.size == 0 or audio.ndim != 1:
            raise ValueError("Model returned an empty or unsupported audio shape")
        output = io.BytesIO()
        sf.write(output, audio, SAMPLE_RATE, format="WAV", subtype="PCM_16")
        return {
            "audio_base64": base64.b64encode(output.getvalue()).decode("ascii"),
            "mime_type": "audio/wav",
            "sample_rate": SAMPLE_RATE,
            "language_requested": request.language,
            "speaker": speaker,
            "provider": "indic-speak",
        }
    except HTTPException:
        raise
    except Exception as exc:
        # Avoid returning internal tracebacks or secrets to the caller.
        raise HTTPException(status_code=500, detail=f"Speech generation failed: {type(exc).__name__}") from exc
