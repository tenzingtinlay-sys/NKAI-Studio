# NKAI LiveTalking runtime adapter.
# Upstream engine: https://github.com/lipku/LiveTalking (Apache-2.0).
# Model checkpoints and avatar data are intentionally mounted at runtime;
# do not bake gated or separately licensed weights into this image.
FROM pytorch/pytorch:2.9.1-cuda12.8-cudnn9-runtime

ARG LIVETALKING_REF=main
ENV PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
WORKDIR /opt
RUN apt-get update && apt-get install -y --no-install-recommends \
    git ffmpeg libgl1 libglib2.0-0 libsm6 libxext6 libxrender1 curl \
 && rm -rf /var/lib/apt/lists/*
RUN git clone https://github.com/lipku/LiveTalking.git /opt/LiveTalking \
 && git -C /opt/LiveTalking checkout "${LIVETALKING_REF}" \
 && python -m pip install --upgrade pip \
 && python -m pip install -r /opt/LiveTalking/requirements.txt
WORKDIR /opt/LiveTalking
# Supply approved model checkpoints and avatar assets through mounted volumes.
VOLUME ["/opt/LiveTalking/models", "/opt/LiveTalking/data/avatars"]
EXPOSE 8010
CMD ["python", "app.py", "--transport", "webrtc", "--model", "wav2lip", "--avatar_id", "wav2lip256_avatar1"]
