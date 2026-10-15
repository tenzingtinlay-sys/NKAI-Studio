import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = resolve(root, "public/assets/avatars");
const outputPath = resolve(outputDir, "mpfb.glb");
const sourceUrl = "https://raw.githubusercontent.com/met4citizen/TalkingHead/main/avatars/mpfb.glb";
const maxBytes = 50 * 1024 * 1024;

const response = await fetch(sourceUrl, { redirect: "follow" });
if (!response.ok) throw new Error(`Avatar download failed: HTTP ${response.status}`);
const bytes = Buffer.from(await response.arrayBuffer());
if (bytes.length < 1024 || bytes.length > maxBytes) throw new Error(`Unexpected avatar file size: ${bytes.length} bytes`);
if (bytes.subarray(0, 4).toString("ascii") !== "glTF") throw new Error("Downloaded file is not a binary glTF (GLB) asset");

await mkdir(outputDir, { recursive: true });
await writeFile(outputPath, bytes);
const sha256 = createHash("sha256").update(bytes).digest("hex");
const provenance = {
  id: "mpfb-sample",
  sourceUrl,
  sourceRepository: "https://github.com/met4citizen/TalkingHead",
  sourcePath: "avatars/mpfb.glb",
  upstreamLicenseNote: "Upstream TalkingHead README describes mpfb.glb as CC0; verify current source metadata before redistribution.",
  sha256,
  sizeBytes: bytes.length,
  downloadedAt: new Date().toISOString(),
};
await writeFile(resolve(outputDir, "mpfb.provenance.json"), JSON.stringify(provenance, null, 2) + "\n");
console.log(`Downloaded approved starter avatar to public/assets/avatars/mpfb.glb (${bytes.length} bytes)`);
console.log(`SHA-256: ${sha256}`);
console.log("Review public/assets/avatars/mpfb.provenance.json and upstream terms before redistributing.");
