import os
from threading import Lock
import hmac

import torch
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from transformers import AutoModelForCausalLM, AutoTokenizer

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


class ChatRequest(BaseModel):
    message: str
    history: list[dict[str, str]] = Field(default_factory=list)


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


@app.post("/chat")
def chat(request: ChatRequest, authorization: str | None = Header(default=None)):
    expected_token = os.getenv("WORKER_API_TOKEN", "").strip()
    if expected_token:
        supplied_token = authorization.removeprefix("Bearer ").strip() if authorization else ""
        if not hmac.compare_digest(supplied_token, expected_token):
            raise HTTPException(status_code=401, detail="Invalid or missing worker token")
    if not request.message.strip():
        return {"reply": "Please enter a message so I can help."}

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
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
