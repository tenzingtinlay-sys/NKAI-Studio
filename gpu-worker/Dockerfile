FROM pytorch/pytorch:2.5.1-cuda12.4-cudnn9-runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=7860

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app.py .

EXPOSE 7860
# Public/container deployments must not start without a server-side token.
CMD ["sh", "-c", ": \"${WORKER_API_TOKEN:?WORKER_API_TOKEN must be configured as a deployment secret}\"; exec uvicorn app:app --host 0.0.0.0 --port \"${PORT}\""]
