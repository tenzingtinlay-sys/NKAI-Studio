Wav2Lip Colab guide (GPU)

This guide runs Wav2Lip on Google Colab to generate lip-synced MP4 videos from an avatar image (or short silent video) and an audio file.

Steps (in Colab):

1. Runtime: Select GPU (e.g., Tesla T4, A100 if available).
2. Install dependencies:

```bash
# clone repo
git clone https://github.com/Rudrabha/Wav2Lip.git
cd Wav2Lip
pip install -r requirements.txt
pip install youtube-dl
```

3. Download pretrained weights (Wav2Lip model):

```bash
wget "https://storage.googleapis.com/pyannote/weights/wav2lip_gan.pth" -O wav2lip_gan.pth
```

4. Upload your avatar image/video + audio to the Colab session (or mount Google Drive):

```bash
from google.colab import drive
drive.mount('/content/drive')
# copy source files to working dir
```

5. Run inference (image mode):

```bash
python inference.py --checkpoint_path wav2lip_gan.pth --face <avatar_image_or_video> --audio <audio_file> --outfile result.mp4
```

6. Download result.mp4 from Colab (or copy to Drive). Optionally generate a matching .viseme.json (see note below).

Notes
- For higher-quality results, provide a short silent video (a few seconds) of the avatar head in neutral pose instead of a single image.
- Wav2Lip is open-source (MIT-style) — check its license and any model license for weights.
- Output: result.mp4

Importing back into this repo
- After downloading result.mp4, place it into vendor/<library>/<LIB_NAME>/Videos/ with a filename that matches the avatar name (e.g., Alice.mp4).
- Run the import script in this repo to copy MP4s into public/vendor and register them: `node scripts/import_wav2lip_outputs.cjs`.

Generating .viseme.json (optional)
- For precise viseme timing, run a forced-aligner (Montreal Forced Aligner) on the audio to extract phoneme timings and map to visemes. This is a separate, longer pipeline.
