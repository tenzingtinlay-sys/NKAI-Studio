import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = resolve(root, "public/assets/avatars");
const maxBytes = 50 * 1024 * 1024;

const assets = [
  {
    id: "mpfb-sample",
    file: "mpfb.glb",
    sourceUrl: "https://raw.githubusercontent.com/met4citizen/TalkingHead/main/avatars/mpfb.glb",
    sourceRepository: "https://github.com/met4citizen/TalkingHead",
    sourcePath: "avatars/mpfb.glb",
    creator: "MPFB / Blender human character ecosystem",
    license: "CC0 1.0 (as documented by the upstream TalkingHead README; re-check upstream terms before redistribution)",
    maxBytes,
  },
  {
    id: "ready-player-me-brunette-sample",
    file: "brunette.glb",
    sourceUrl: "https://raw.githubusercontent.com/met4citizen/TalkingHead/main/avatars/brunette.glb",
    sourceRepository: "https://github.com/met4citizen/TalkingHead",
    sourcePath: "avatars/brunette.glb",
    creator: "Ready Player Me",
    license: "CC BY-NC 4.0 (non-commercial only; attribution required)",
    maxBytes: 20 * 1024 * 1024,
  },
];

await mkdir(outputDir, { recursive: true });
for (const asset of assets) {
  const response = await fetch(asset.sourceUrl, { redirect: "follow" });
  if (!response.ok) throw new Error(`Avatar download failed for ${asset.file}: HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 1024 || bytes.length > asset.maxBytes) {
    throw new Error(`Unexpected ${asset.file} size: ${bytes.length} bytes`);
  }
  if (bytes.subarray(0, 4).toString("ascii") !== "glTF") {
    throw new Error(`Downloaded ${asset.file} is not a binary glTF (GLB) asset`);
  }

  await writeFile(resolve(outputDir, asset.file), bytes);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const provenance = {
    id: asset.id,
    filename: asset.file,
    sourceUrl: asset.sourceUrl,
    sourceRepository: asset.sourceRepository,
    sourcePath: asset.sourcePath,
    creator: asset.creator,
    license: asset.license,
    sha256,
    sizeBytes: bytes.length,
    downloadedAt: new Date().toISOString(),
  };
  await writeFile(
    resolve(outputDir, asset.file.replace(/\.glb$/i, ".provenance.json")),
    JSON.stringify(provenance, null, 2) + "\n",
  );
  console.log(`Downloaded ${asset.file} (${bytes.length} bytes); SHA-256: ${sha256}`);
  console.log(`Licence: ${asset.license}`);
}

console.log("Avatar assets downloaded. The Ready Player Me brunette sample must not be used commercially unless separate rights are obtained.");
