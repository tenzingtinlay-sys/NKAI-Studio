"""Optional Indic Parler-TTS worker for neural speech across Indian languages.

The model is gated on Hugging Face: the operator must accept its model conditions
and provide HF_TOKEN as a server-side secret. No user voice cloning is performed.
"""
import base64
import hmac
import io
import os
from threading import Lock

import soundfile as sf
import torch
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

MODEL_ID = os.getenv("INDIC_TTS_MODEL_ID", "ai4bharat/indic-parler-tts")
HF_TOKEN = os.getenv("HF_TOKEN", "").strip()
WORKER_API_TOKEN = os.getenv("WORKER_API_TOKEN", "").strip()
ALLOW_UNAUTHENTICATED_LOCAL = os.getenv("ALLOW_UNAUTHENTICATED_LOCAL", "false").lower() == "true"
DEVICE = "cuda:0" if torch.cuda.is_available() else "cpu"
MAX_TEXT_CHARS = int(os.getenv("MAX_TEXT_CHARS", "700"))

LANGUAGES = {
    "as": ("Assamese", "Amit"),
    "bn": ("Bengali", "Aditi"),
    "brx": ("Bodo", "Maya"),
    "doi": ("Dogri", "Karan"),
    "en": ("English", "Thoma"),
    "en-in": ("English", "Thoma"),
    "gu": ("Gujarati", "Neha"),
    "hi": ("Hindi", "Rohit"),
    "hi-in": ("Hindi", "Rohit"),
    "kn": ("Kannada", "Suresh"),
    "kn-in": ("Kannada", "Suresh"),
    "kok": ("Konkani", "A female speaker"),
    "mai": ("Maithili", "A female speaker"),
    "ml": ("Malayalam", "Anjali"),
    "ml-in": ("Malayalam", "Anjali"),
    "mni": ("Manipuri", "Laishram"),
    "mr": ("Marathi", "Sunita"),
    "mr-in": ("Marathi", "Sunita"),
    "ne": ("Nepali", "Amrita"),
    "or": ("Odia", "Manas"),
    "pa": ("Punjabi", "Divjot"),
    "pa-in": ("Punjabi", "Divjot"),
    "sa": ("Sanskrit", "Aryan"),
    "sat": ("Santali", "A female speaker"),
    "sd": ("Sindhi", "A female speaker"),
    "ta": ("Tamil", "Jaya"),
    "ta-in": ("Tamil", "Jaya"),
    "te": ("Telugu", "Prakash"),
    "te-in": ("Telugu", "Prakash"),
    "ur": ("Urdu", "A female speaker"),
}
LANGUAGE_LABELS = sorted({value[0] for value in LANGUAGES.values()})

app = FastAPI(title="NKAI Indic Parler-TTS Worker", version="1.0.0")
origins = [item.strip() for item in os.getenv("CORS_ORIGINS", "*").split(",") if item.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)
model = None
tokenizer = None
description_tokenizer = None
startup_error = None
generation_lock = Lock()


class TTSRequest(BaseModel):
    text: str = Field(min_length=1, max_length=5000)
    language: str = "hi-IN"
    voice: str | None = None


def check_auth(authorization: str | None):
    if not WORKER_API_TOKEN and not ALLOW_UNAUTHENTICATED_LOCAL:
        raise HTTPException(status_code=503, detail="Set WORKER_API_TOKEN before exposing this worker.")
    if WORKER_API_TOKEN:
        supplied = authorization.removeprefix("Bearer ").strip() if authorization else ""
        if not hmac.compare_digest(supplied, WORKER_API_TOKEN):
            raise HTTPException(status_code=401, detail="Invalid or missing worker token")


@app.on_event("startup")
def load_model():
    global model, tokenizer, description_tokenizer, startup_error
    if not HF_TOKEN:
        startup_error = "Set HF_TOKEN after accepting the gated model conditions on Hugging Face."
        return
    try:
        from parler_tts import ParlerTTSForConditionalGeneration
        model = ParlerTTSForConditionalGeneration.from_pretrained(MODEL_ID, token=HF_TOKEN).to(DEVICE).eval()
        tokenizer = __import__("transformers").AutoTokenizer.from_pretrained(MODEL_ID, token=HF_TOKEN)
        description_tokenizer = __import__("transformers").AutoTokenizer.from_pretrained(
            model.config.text_encoder._name_or_path, token=HF_TOKEN
        )
        startup_error = None
    except Exception as exc:
        model = tokenizer = description_tokenizer = None
        startup_error = f"Model could not load: {type(exc).__name__}: {exc}"


@app.get("/health")
def health():
    auth_ready = bool(WORKER_API_TOKEN) or ALLOW_UNAUTHENTICATED_LOCAL
    ready = model is not None and tokenizer is not None and description_tokenizer is not None and auth_ready
    return {
        "status": "ready" if ready else ("auth-not-configured" if not auth_ready else "needs-hf-access-or-model"),
        "provider": "Indic Parler-TTS",
        "model": MODEL_ID,
        "device": DEVICE,
        "authenticationConfigured": bool(WORKER_API_TOKEN),
        "hfTokenConfigured": bool(HF_TOKEN),
        "detail": startup_error or (None if ready else "Configure a worker token and load the model."),
    }


@app.get("/capabilities")
def capabilities():
    return {
        "tts": {
            "provider": "Indic Parler-TTS",
            "ready": model is not None and tokenizer is not None and description_tokenizer is not None and (bool(WORKER_API_TOKEN) or ALLOW_UNAUTHENTICATED_LOCAL),
            "languages": [{"code": key, "label": value[0], "defaultVoice": value[1]} for key, value in LANGUAGES.items()],
            "voiceCloning": False,
            "license": "Apache-2.0 model card; gated access requires accepting the model conditions. Audit dependencies and model terms.",
        },
        "device": DEVICE,
        "authenticationConfigured": bool(WORKER_API_TOKEN),
        "hfTokenConfigured": bool(HF_TOKEN),
        "detail": startup_error,
    }


@app.post("/chat")
def chat_not_supported():
    raise HTTPException(status_code=501, detail="This service provides TTS only. Configure a separate chat worker.")


@app.post("/tts")
def synthesize(request: TTSRequest, authorization: str | None = Header(default=None)):
    check_auth(authorization)
    if model is None or tokenizer is None or description_tokenizer is None:
        raise HTTPException(status_code=503, detail=startup_error or "Indic Parler-TTS is not ready.")
    language_key = request.language.lower()
    language = LANGUAGES.get(language_key) or LANGUAGES.get(language_key.split("-")[0])
    if not language:
        raise HTTPException(status_code=400, detail="Unsupported language. See GET /capabilities.")
    text = request.text.strip()[:MAX_TEXT_CHARS]
    if not text:
        raise HTTPException(status_code=400, detail="Text is required.")
    voice = (request.voice or language[1]).strip()
    description = (
        f"{voice} speaks in a clear, natural {language[0]} voice at a moderate pace and pitch. "
        "The recording is of very high quality, with very clear audio and minimal background noise."
    )
    try:
        with generation_lock, torch.inference_mode():
            description_inputs = description_tokenizer(description, return_tensors="pt").to(DEVICE)
            prompt_inputs = tokenizer(text, return_tensors="pt").to(DEVICE)
            generated = model.generate(
                input_ids=description_inputs.input_ids,
                attention_mask=description_inputs.attention_mask,
                prompt_input_ids=prompt_inputs.input_ids,
                prompt_attention_mask=prompt_inputs.attention_mask,
            )
            audio_array = generated.detach().cpu().numpy().squeeze()
            output = io.BytesIO()
            sf.write(output, audio_array, model.config.sampling_rate, format="WAV")
        return {
            "audio_base64": base64.b64encode(output.getvalue()).decode("ascii"),
            "mime_type": "audio/wav",
            "language": language[0],
            "provider": "Indic Parler-TTS",
            "voice": voice,
            "voiceCloning": False,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Speech generation failed: {type(exc).__name__}: {exc}") from exc
