import os
from threading import Lock
import hmac
import base64
import io

import torch
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from transformers import AutoModelForCausalLM, AutoTokenizer, VitsModel

MODEL_ID = os.getenv("MODEL_ID", "Qwen/Qwen2.5-1.5B-Instruct")
MAX_NEW_TOKENS = int(os.getenv("MAX_NEW_TOKENS", "240"))
SYSTEM_PROMPT = os.getenv(
    "SYSTEM_PROMPT",
    "You are NKAI Studio's helpful, practical AI avatar. Be warm, concise, and action-oriented.",
)

app = FastAPI(title="NKAI Open-Source GPU Worker", version="1.0.0")
origins = [item.strip() for item in os.getenv("CORS_ORIGINS", "*").split(",") if item.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

tokenizer = None
model = None
generation_lock = Lock()
tts_cache = {}
tts_lock = Lock()
TTS_MODELS = {
    "en": "facebook/mms-tts-eng", "en-in": "facebook/mms-tts-eng",
    "hi": "facebook/mms-tts-hin", "hi-in": "facebook/mms-tts-hin",
    "ta": "facebook/mms-tts-tam", "ta-in": "facebook/mms-tts-tam",
    "te": "facebook/mms-tts-tel", "te-in": "facebook/mms-tts-tel",
    "bn": "facebook/mms-tts-ben", "bn-in": "facebook/mms-tts-ben",
    "mr": "facebook/mms-tts-mar", "mr-in": "facebook/mms-tts-mar",
    "pa": "facebook/mms-tts-pan", "pa-in": "facebook/mms-tts-pan",
    "kn": "facebook/mms-tts-kan", "kn-in": "facebook/mms-tts-kan",
    "ml": "facebook/mms-tts-mal", "ml-in": "facebook/mms-tts-mal",
    "fr": "facebook/mms-tts-fra", "fr-fr": "facebook/mms-tts-fra",
    "de": "facebook/mms-tts-deu", "de-de": "facebook/mms-tts-deu",
    "es": "facebook/mms-tts-spa", "es-es": "facebook/mms-tts-spa",
    "zh": "facebook/mms-tts-cmn", "zh-cn": "facebook/mms-tts-cmn",
    "ja": "facebook/mms-tts-jpn", "ja-jp": "facebook/mms-tts-jpn",
    "ko": "facebook/mms-tts-kor", "ko-kr": "facebook/mms-tts-kor",
}


class ChatRequest(BaseModel):
    message: str
    language: str = "en"
    history: list[dict[str, str]] = Field(default_factory=list)


class TTSRequest(BaseModel):
    text: str
    language: str = "en"


def load_model():
    global tokenizer, model
    if model is None:
        tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
        model = AutoModelForCausalLM.from_pretrained(
            MODEL_ID,
            torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
            device_map="auto" if torch.cuda.is_available() else None,
        )
        model.eval()


@app.on_event("startup")
def startup():
    load_model()


@app.get("/health")
def health():
    return {
        "status": "ready" if model is not None else "loading",
        "model": MODEL_ID,
        "cuda": torch.cuda.is_available(),
    }

@app.get("/capabilities")
def capabilities():
    return {
        "chat": {"provider": "self-hosted-transformers", "model": MODEL_ID, "ready": model is not None},
        "tts": {
            "provider": "facebook-mms-tts",
            "readyLanguages": sorted(TTS_MODELS.keys()),
            "models": sorted(set(TTS_MODELS.values())),
            "voiceCloning": False,
            "licenseNotice": "Referenced MMS-TTS checkpoints are generally CC-BY-NC 4.0; verify each checkpoint and do not use commercially without suitable rights.",
        },
        "speechToText": {"available": False, "reason": "No STT model configured in this worker."},
        "gpu": {"cudaAvailable": torch.cuda.is_available()},
    }


@app.post("/chat")
def chat(request: ChatRequest, authorization: str | None = Header(default=None)):
    expected_token = os.getenv("WORKER_API_TOKEN", "").strip()
    if expected_token:
        supplied_token = authorization.removeprefix("Bearer ").strip() if authorization else ""
        if not hmac.compare_digest(supplied_token, expected_token):
            raise HTTPException(status_code=401, detail="Invalid or missing worker token")
    if not request.message.strip():
        return {"reply": "Please enter a message so I can help."}

    language_names = {"en": "English", "en-in": "English", "hi": "Hindi", "hi-in": "Hindi", "ta": "Tamil", "ta-in": "Tamil", "te": "Telugu", "te-in": "Telugu", "bn": "Bengali", "bn-in": "Bengali", "mr": "Marathi", "mr-in": "Marathi", "pa": "Punjabi", "pa-in": "Punjabi", "kn": "Kannada", "kn-in": "Kannada", "ml": "Malayalam", "ml-in": "Malayalam", "fr": "French", "fr-fr": "French", "de": "German", "de-de": "German", "es": "Spanish", "es-es": "Spanish", "zh": "Chinese", "zh-cn": "Chinese", "ja": "Japanese", "ja-jp": "Japanese", "ko": "Korean", "ko-kr": "Korean"}
    language_name = language_names.get(request.language.lower(), "the user's language")
    messages = [{"role": "system", "content": SYSTEM_PROMPT + f" Reply in {language_name} unless the user explicitly asks for another language."}]
    for item in request.history[-10:]:
        role = item.get("role")
        content = item.get("text") or item.get("content") or ""
        if role in ("user", "assistant") and content.strip():
            messages.append({"role": role, "content": content[:2500]})
    messages.append({"role": "user", "content": request.message[:2500]})

    with generation_lock, torch.inference_mode():
        inputs = tokenizer.apply_chat_template(
            messages,
            tokenize=True,
            add_generation_prompt=True,
            return_tensors="pt",
        )
        if hasattr(inputs, "to"):
            inputs = inputs.to(model.device)
        output = model.generate(
            inputs,
            max_new_tokens=MAX_NEW_TOKENS,
            do_sample=True,
            temperature=0.7,
            top_p=0.9,
            pad_token_id=tokenizer.eos_token_id,
        )
        answer = tokenizer.decode(output[0][inputs.shape[-1]:], skip_special_tokens=True).strip()
    return {"reply": answer or "I couldn't form a response. Please try asking another way."}


@app.post("/tts")
def tts(request: TTSRequest, authorization: str | None = Header(default=None)):
    expected_token = os.getenv("WORKER_API_TOKEN", "").strip()
    if expected_token:
        supplied_token = authorization.removeprefix("Bearer ").strip() if authorization else ""
        if not hmac.compare_digest(supplied_token, expected_token):
            raise HTTPException(status_code=401, detail="Invalid or missing worker token")
    text = request.text.strip()[:800]
    if not text:
        raise HTTPException(status_code=400, detail="Text is required")
    language = request.language.lower()
    model_id = TTS_MODELS.get(language) or TTS_MODELS.get(language.split("-")[0])
    if not model_id:
        raise HTTPException(status_code=400, detail=f"No bundled MMS-TTS model for language: {language}")
    with tts_lock:
        if model_id not in tts_cache:
            # Keep one TTS model resident to avoid filling a small free GPU with
            # several language models after users switch languages.
            for old_id in list(tts_cache.keys()):
                old_tokenizer, old_model, old_device = tts_cache.pop(old_id)
                del old_tokenizer, old_model
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            tts_tokenizer = AutoTokenizer.from_pretrained(model_id)
            tts_model = VitsModel.from_pretrained(model_id)
            device = "cuda" if torch.cuda.is_available() else "cpu"
            tts_model = tts_model.to(device).eval()
            tts_cache[model_id] = (tts_tokenizer, tts_model, device)
        tts_tokenizer, tts_model, device = tts_cache[model_id]
        inputs = tts_tokenizer(text, return_tensors="pt")
        inputs = {key: value.to(device) for key, value in inputs.items()}
        with torch.inference_mode():
            waveform = tts_model(**inputs).waveform[0].detach().cpu().float().numpy()
        import soundfile as sf
        output = io.BytesIO()
        sf.write(output, waveform, tts_model.config.sampling_rate, format="WAV")
    return {"audio_base64": base64.b64encode(output.getvalue()).decode("ascii"), "mime_type": "audio/wav", "language": language, "model": model_id}
