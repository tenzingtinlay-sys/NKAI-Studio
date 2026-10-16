# NKAI LiveTalking runtime built from the source archive committed under vendor/.
# Model checkpoints and avatar data are intentionally mounted at runtime.
FROM pytorch/pytorch:2.9.1-cuda12.8-cudnn9-runtime

ENV PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
WORKDIR /opt
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg libgl1 libglib2.0-0 libsm6 libxext6 libxrender1 curl \
 && rm -rf /var/lib/apt/lists/*

COPY vendor/livetalking/source/LiveTalking-main/ /opt/LiveTalking/
WORKDIR /opt/LiveTalking
RUN python -m pip install --upgrade pip \
 && python -m pip install -r requirements.txt

# Supply approved model checkpoints and avatar assets through mounted volumes.
VOLUME ["/opt/LiveTalking/models", "/opt/LiveTalking/data/avatars"]
EXPOSE 8010
CMD ["python", "app.py", "--transport", "webrtc", "--model", "wav2lip", "--avatar_id", "wav2lip256_avatar1"]
