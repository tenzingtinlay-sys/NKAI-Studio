import { defineEventHandler } from 'h3';
import { readdirSync, statSync, existsSync } from 'fs';
import { join, extname, basename } from 'path';

const ROOT = join(process.cwd(), 'vendor', '370-avatars-and-users-library', '370+ avatars and users library – Untitled UI');

function listFiles(dir: string) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isFile())
    .map((d) => d.name);
}

function fileBase(name: string) {
  return basename(name, extname(name)).trim();
}

export default defineEventHandler(async (event) => {
  if (!existsSync(ROOT)) return { avatars: [], error: 'Library not found' };
  const webpDir = join(ROOT, 'WebP');
  const pngDir = join(ROOT, 'PNG (transparent background)');
  const jpegDir = join(ROOT, 'JPEG');
  const audioDir = join(ROOT, 'Audio');

  const webps = listFiles(webpDir);
  const pngs = listFiles(pngDir);
  const jpgs = listFiles(jpegDir);
  const audios = listFiles(audioDir);

  // Build map name -> images
  const imagesByName = new Map<string, { webp?: string; png?: string; jpg?: string }>();
  const addImage = (fname: string, kind: 'webp' | 'png' | 'jpg', dirPath: string) => {
    const name = fileBase(fname);
    const prev = imagesByName.get(name) || {};
    prev[kind] = `370+ avatars and users library – Untitled UI/${dirPath}/${encodeURIComponent(fname)}`;
    imagesByName.set(name, prev);
  };
  for (const f of webps) addImage(f, 'webp', 'WebP');
  for (const f of pngs) addImage(f, 'png', 'PNG (transparent background)');
  for (const f of jpgs) addImage(f, 'jpg', 'JPEG');

  // Build audio mapping by matching basename contains name (case-insensitive)
  const audioList = audios.map((a) => ({ file: a, base: fileBase(a).toLowerCase() }));

  const avatars: Array<any> = [];
  for (const [name, imgs] of imagesByName.entries()) {
    const lname = name.toLowerCase();
    const matches = audioList.filter((a) => a.base.includes(lname) || lname.includes(a.base)).map((a) => `370+ avatars and users library – Untitled UI/Audio/${encodeURIComponent(a.file)}`);
    // pick preferred image
    const imagePath = imgs.webp || imgs.png || imgs.jpg || null;
    avatars.push({ name, image: imagePath, audio: matches });
  }

  return { avatars };
});