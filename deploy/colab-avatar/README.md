# NKAI Colab Avatar + Voice (no Docker)

This notebook adds a Python-native speech + talking-face pipeline alongside the existing NKAI Qwen worker. It does **not** replace or restart the Qwen service.

## What it provides

- **Voice generation:** Kokoro-82M (Apache-2.0 weights) using the Colab GPU when available.
- **Talking-face video:** MuseTalk 1.5, driven by an image or short source video and the generated WAV.
- **No Docker required:** the Colab Docker daemon is blocked by read-only cgroups, so this pipeline runs directly in Python.

## Important limitations

- MuseTalk animates a **face/head region**, not a full-body 3D character. Use a portrait or a source video you own or have permission to use.
- This is a first-stage speech-to-avatar render pipeline, not yet a real-time bidirectional avatar stream or a production public API. It does not automatically connect itself to NKAI Studio's frontend or Cloudflare gateway.
- MuseTalk's upstream instructions recommend Python 3.10 and an older PyTorch/CUDA stack. The notebook creates a separate Python 3.10 environment so it does not overwrite the current Colab kernel or your working Qwen dependencies. Compatibility still needs to be confirmed in the actual Colab runtime.
- Downloading model weights may take several GB and time. Run the model-download cell only after checking available disk space.
- Keep the required upstream licenses/notices: [MuseTalk](https://github.com/TMElyralab/MuseTalk), [Kokoro](https://huggingface.co/hexgrad/Kokoro-82M).

## Use

1. Open `notebooks/nkai_colab_avatar_voice.ipynb` in GitHub and choose **Open in Colab** (or upload the notebook into Colab).
2. Select a GPU runtime and run the cells in order.
3. Upload a portrait/source video you have rights to use, and enter the text you want spoken.
4. Generate WAV with Kokoro, then run MuseTalk inference to create a lip-synced video.
5. Download the result from Colab.

## GPU verification

The notebook checks `torch.cuda.is_available()`, prints the GPU name and VRAM, and later runs a GPU inference smoke test. If the runtime disconnects, model files in `/content` may be lost; save output assets to Google Drive if needed.

## License note

Kokoro's published model card identifies the weights as Apache-2.0. MuseTalk source is MIT-licensed, but its dependencies and every downloaded model asset retain their own terms. Review the upstream license and third-party notices before redistribution or deployment.