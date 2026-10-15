# OpenVoice V2 checkpoints

Run this on the Linux/GPU host where the OpenVoice worker will run. It downloads the checkpoint archive linked by the official OpenVoice usage guide and validates the converter files before copying the archive contents into the configured checkpoint directory.

```bash
cd NKAI-Studio
chmod +x gpu-worker/download_openvoice_checkpoints.sh
OPENVOICE_ROOT="$PWD/OpenVoice" \
OPENVOICE_CHECKPOINT_ROOT="$PWD/OpenVoice/checkpoints_v2" \
  gpu-worker/download_openvoice_checkpoints.sh
```

The archive is large and requires internet access and enough disk space. This script does not install Python dependencies, start a GPU session, configure a hosting account, or create a reference voice. Install OpenVoice/MeloTTS as described in [OPENVOICE_SETUP.md](OPENVOICE_SETUP.md), then set `OPENVOICE_REFERENCE_AUDIO` to a recording you own or are authorized to use.

The script removes its temporary archive after installation. It does not commit weights or audio to Git. If the upstream archive layout changes, the script fails with a clear error rather than claiming success.
