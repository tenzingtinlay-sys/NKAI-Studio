import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const target = resolve(root, "downloads/third-party/Microsoft-Rocketbox");
const repoUrl = "https://github.com/microsoft/Microsoft-Rocketbox.git";
await mkdir(dirname(target), { recursive: true });

try {
  await readFile(resolve(target, "LICENSE.md"), "utf8");
  console.log("Microsoft Rocketbox library already downloaded:", target);
} catch {
  await execFileAsync("git", ["clone", "--depth", "1", repoUrl, target], { cwd: root, maxBuffer: 10 * 1024 * 1024 });
  console.log("Downloaded Microsoft Rocketbox source to:", target);
}
const license = await readFile(resolve(target, "LICENSE.md"), "utf8");
if (!license.toLowerCase().includes("mit license")) {
  throw new Error("Expected MIT license notice was not found. Review the upstream licence manually before using assets.");
}
const record = {
  name: "Microsoft Rocketbox Avatar Library",
  source: repoUrl,
  licenseFile: "LICENSE.md",
  license: "MIT (verify the checked-out LICENSE.md)",
  note: "The library contains FBX assets, not browser-ready GLB. Convert only selected characters and test facial blendshapes before enabling lip-sync.",
  downloadedAt: new Date().toISOString(),
};
await writeFile(resolve(target, "NKAI-ASSET-PROVENANCE.json"), JSON.stringify(record, null, 2) + "\n");
console.log("Licence notice found. Review the source licence and convert selected FBX models with Blender before adding them to the app.");
