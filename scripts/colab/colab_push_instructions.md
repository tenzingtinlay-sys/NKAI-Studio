Colab: Batch Wav2Lip + Forced Alignment + Push results to GitHub

Overview
This guide contains ready-to-run shell and Python commands for Google Colab. It will:
- Clone the repo (or accept uploaded vendor files)
- Install Wav2Lip and Montreal Forced Aligner (MFA) tooling
- Batch-run Wav2Lip to generate MP4s for avatars
- Run forced-alignment (MFA) to produce phoneme timings
- Map phonemes -> visemes and write .viseme.json alongside MP4s
- Push results (MP4 + .viseme.json) back to your GitHub repo on a branch and open a PR

Security note: You will paste a personal GitHub token into a Colab cell at runtime to allow pushing. Do NOT share it here; Colab runs in your account.

Suggested Colab cells

1) Setup and clone
```bash
# runtime: GPU
sudo apt-get update && sudo apt-get install -y ffmpeg git python3-dev python3-pip
pip install git+https://github.com/Rudrabha/Wav2Lip.git pydub praat-parselmouth textgrid PyGithub
# clone your repo
git clone https://github.com/tenzingtinlay-sys/NKAI-Studio.git
cd NKAI-Studio
```

If your repo is private, skip clone and instead upload vendor zip to Colab or mount Google Drive and copy the vendor folder.

2) Prepare working folders
```bash
mkdir -p /content/wav2lip_out
# inputs: vendor/<LIB_FOLDER>/<LIB_NAME>/Audio and Images
```

3) Run Wav2Lip in batch mode (example for one avatar). Extend with a loop over many avatars.
```bash
# Example for a single avatar: supply face image (or a short silent video) and audio
python /usr/local/lib/python3.10/dist-packages/wav2lip/inference.py --checkpoint_path wav2lip_gan.pth --face /content/NKAI-Studio/vendor/370-avatars-and-users-library/370+\ avatars\ and\ users\ library\ –\ Untitled\ UI/WebP/Alice.webp --audio /content/NKAI-Studio/vendor/370-avatars-and-users-library/370+\ avatars\ and\ users\ library\ –\ Untitled\ UI/Audio/Alice.wav --outfile /content/wav2lip_out/Alice.mp4
```

Looping (pseudo):
```bash
# find all audio files and corresponding best image; this loop is an example, adjust paths
for a in /content/NKAI-Studio/vendor/**/Audio/*.wav; do
  base=$(basename "$a" .wav)
  # pick an image with matching base name
  face=$(ls /content/NKAI-Studio/vendor/**/WebP/${base}*.webp 2>/dev/null | head -n1)
  if [ -z "$face" ]; then face=$(ls /content/NKAI-Studio/vendor/**/PNG/*${base}*.png 2>/dev/null | head -n1); fi
  if [ -z "$face" ]; then face=$(ls /content/NKAI-Studio/vendor/**/JPEG/*${base}*.jpg 2>/dev/null | head -n1); fi
  if [ -z "$face" ]; then echo "no face for $base"; continue; fi
  python /usr/local/lib/python3.10/dist-packages/wav2lip/inference.py --checkpoint_path wav2lip_gan.pth --face "$face" --audio "$a" --outfile "/content/wav2lip_out/${base}.mp4"
done
```

4) Forced alignment (MFA)
- Install MFA as per its docs or use a lightweight aligner. Example (MFA CLI installs in Colab may require additional steps). As an alternative, you can use a Python wrapper or Web service to obtain phoneme timings.

5) Map phonemes -> visemes
- Use the helper script `phoneme_to_viseme.py` (included in this repo under scripts/colab). It expects a CSV of phoneme,start,end rows or a simple JSON from your aligner. It will write `<basename>.mp4.viseme.json` in the same folder.

6) Push results to GitHub (you will paste token)
```bash
# Configure git with your name/email
git config user.email "you@example.com"
git config user.name "Your Name"
# create branch
BRANCH=add/wav2lip-results
git checkout -b "$BRANCH"
# copy outputs into the repo tree
mkdir -p public/vendor/370-avatars-and-users-library/370+\ avatars\ and\ users\ library\ –\ Untitled\ UI/Videos
cp /content/wav2lip_out/*.mp4 public/vendor/370-avatars-and-users-library/370+\ avatars\ and\ users\ library\ –\ Untitled\ UI/Videos/
cp /content/wav2lip_out/*.viseme.json public/vendor/370-avatars-and-users-library/370+\ avatars\ and\ users\ library\ –\ Untitled\ UI/Videos/
# add, commit
git add public/vendor/370-avatars-and-users-library/**
git commit -m "Add Wav2Lip-generated videos + viseme manifests"
# now push using a token (run interactively, DO NOT paste token here)
read -s -p "Paste GITHUB_TOKEN: " GHTOKEN
export GHTOKEN="$GHTOKEN"
# set remote with token (temporary)
git remote set-url origin "https://oauth2:${GHTOKEN}@github.com/tenzingtinlay-sys/NKAI-Studio.git"
git push -u origin "$BRANCH"
# create PR using GitHub CLI or the REST API. Example using curl:
PR_BODY='Automated: add Wav2Lip videos and viseme manifests'
curl -X POST -H "Authorization: token ${GHTOKEN}" -H "Accept: application/vnd.github+json" https://api.github.com/repos/tenzingtinlay-sys/NKAI-Studio/pulls -d "{\"title\":\"Add Wav2Lip-generated videos\", \"head\": \"${BRANCH}\", \"base\": \"main\", \"body\": \"${PR_BODY}\"}"
```

7) After push
- Inspect the PR. When merged, files will be available under public/vendor/... and the app will serve them.

If you want, I can also add a Colab-ready Jupyter notebook (.ipynb) that contains these exact cells for one-click run. I cannot run it in your account; you must run it and paste the token when prompted.
