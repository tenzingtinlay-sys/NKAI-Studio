import { copyFile, mkdir, readdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = process.cwd();
const ssrAssets = resolve(root, "node_modules/.nitro/vite/services/ssr/assets");
const publicAssets = resolve(root, ".output/public/assets");

let sourceFiles;
try {
  sourceFiles = await readdir(ssrAssets);
} catch (error) {
  throw new Error(`Expected Vite SSR asset directory was not generated: ${ssrAssets}`, { cause: error });
}

const cssFiles = sourceFiles.filter((file) => file.endsWith(".css"));
if (cssFiles.length === 0) {
  throw new Error(`No SSR CSS assets found in ${ssrAssets}`);
}

await mkdir(publicAssets, { recursive: true });

for (const file of cssFiles) {
  const source = join(ssrAssets, file);
  if (!(await stat(source)).isFile()) continue;
  const destination = join(publicAssets, file);
  await copyFile(source, destination);
  console.log(`Synchronized SSR stylesheet: /assets/${file}`);
}
