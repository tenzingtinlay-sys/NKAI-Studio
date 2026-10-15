#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SOURCE_DIR="${ROCKETBOX_SOURCE_DIR:-$REPO_ROOT/downloads/third-party/Microsoft-Rocketbox}"
OUTPUT_DIR="${ROCKETBOX_OUTPUT_DIR:-$REPO_ROOT/downloads/converted/Rocketbox}"
CONVERTER="$REPO_ROOT/scripts/blender/convert_rocketbox_to_glb.py"
BLENDER_BIN="${BLENDER_BIN:-blender}"
MANIFEST="$OUTPUT_DIR/manifest.tsv"

if [[ ! -d "$SOURCE_DIR" ]]; then
  echo "Rocketbox source directory not found: $SOURCE_DIR" >&2
  echo "Run npm run assets:rocketbox first." >&2
  exit 1
fi
if ! command -v "$BLENDER_BIN" >/dev/null 2>&1; then
  echo "Blender was not found. Install Blender 3.6+ or set BLENDER_BIN." >&2
  exit 1
fi
mkdir -p "$OUTPUT_DIR"
if [[ ! -f "$MANIFEST" ]]; then
  printf 'source_relative_path\toutput_glb\tconversion_report\n' > "$MANIFEST"
fi

count=0
failed=0
while IFS= read -r -d '' source; do
  relative="${source#"$SOURCE_DIR"/}"
  name="${relative%.*}"
  safe_name="${name//\//__}"
  safe_name="${safe_name// /_}"
  target="$OUTPUT_DIR/$safe_name.glb"
  report="$OUTPUT_DIR/$safe_name.conversion-report.json"
  if [[ -f "$target" && "$target" -nt "$source" && -f "$report" ]]; then
    echo "SKIP $relative (already converted)"
    continue
  fi
  echo "CONVERT $relative"
  if "$BLENDER_BIN" --background --python "$CONVERTER" -- "$source" "$target"; then
    printf '%s\t%s\t%s\n' "$relative" "$target" "$report" >> "$MANIFEST"
    count=$((count + 1))
  else
    echo "FAILED $relative" >&2
    failed=$((failed + 1))
  fi
done < <(find "$SOURCE_DIR" -type f -iname '*.fbx' -print0)

echo "Converted this run: $count"
echo "Failures: $failed"
echo "Manifest: $MANIFEST"
echo "Outputs are local cache files and are not committed or bundled into the production site."
if [[ "$failed" -gt 0 ]]; then exit 2; fi
