import { defineEventHandler } from 'h3';
import { readdirSync, statSync, existsSync } from 'fs';
import { join, extname, basename } from 'path';

const LIB_FOLDER = '370-avatars-and-users-library';
const LIB_NAME = '370+ avatars and users library – Untitled UI';
const ROOT = join(process.cwd(), 'vendor', LIB_FOLDER, LIB_NAME);
const PUBLIC_ROOT = join(process.cwd(), 'public', 'vendor', LIB_FOLDER, LIB_NAME);

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

  // load optional manual CSV mapping (avatar_name,audio_filename)
  const csvPath = join(ROOT, 'avatar-audio-mapping.csv');
  const mapping = new Map<string,string>();
  if (existsSync(csvPath)) {
    try {
      const txt = require('fs').readFileSync(csvPath, 'utf8');
      const lines = txt.split(/\r?\n/).map((s: string) => s.trim()).filter(Boolean);
      for (const line of lines) {
        const parts = line.split(',').map((p: string) => p.trim());
        if (parts.length >= 2) mapping.set(parts[0].toLowerCase(), parts[1]);
      }
    } catch (e) {
      // ignore CSV parse issues
    }
  }

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
    let matches: string[] = [];
    // if there's a manual mapping, honor it first
    if (mapping.has(lname)) {
      const mapped = mapping.get(lname)!;
      if (audios.includes(mapped)) {
        matches = [`${LIB_NAME}/Audio/${encodeURIComponent(mapped)}`];
      }
    }
    if (!matches.length) {
      matches = audioList.filter((a) => a.base.includes(lname) || lname.includes(a.base)).map((a) => `${LIB_NAME}/Audio/${encodeURIComponent(a.file)}`);
    }

    // prefer public copies when present
    const resolvePath = (relativePath: string) => {
      // relativePath like `${LIB_NAME}/Audio/NAME.wav` or `${LIB_NAME}/WebP/IMG.webp`
      const parts = relativePath.split('/');
      const subpath = parts.slice(1).join('/');
      const publicCandidate = join(PUBLIC_ROOT, subpath);
      if (existsSync(publicCandidate)) {
        // public assets are reachable at /vendor/<LIB_FOLDER>/<LIB_NAME>/<subpath>
        return `/vendor/${LIB_FOLDER}/${LIB_NAME}/${subpath}`;
      }
      // fallback to vendor streaming path (the client uses /api/vendor-file?path=...)
      return `${LIB_NAME}/${subpath}`;
    };

    const imagePath = imgs.webp ? resolvePath(`${LIB_NAME}/WebP/${encodeURIComponent(imgs.webp.split('/').pop() || imgs.webp)}`) : imgs.png ? resolvePath(`${LIB_NAME}/PNG (transparent background)/${encodeURIComponent(imgs.png.split('/').pop() || imgs.png)}`) : imgs.jpg ? resolvePath(`${LIB_NAME}/JPEG/${encodeURIComponent(imgs.jpg.split('/').pop() || imgs.jpg)}`) : null;

    const audioPaths = matches.map((m) => resolvePath(m));

    // search for a generated video in public or vendor Videos/
    let videoPath: string | null = null;
    try {
      const publicVideosDir = join(PUBLIC_ROOT, 'Videos');
      const vendorVideosDir = join(ROOT, 'Videos');
      const candidates: string[] = [];
      if (existsSync(publicVideosDir)) candidates.push(...readdirSync(publicVideosDir).filter((x) => x.toLowerCase().endsWith('.mp4')));
      if (!candidates.length && existsSync(vendorVideosDir)) candidates.push(...readdirSync(vendorVideosDir).filter((x) => x.toLowerCase().endsWith('.mp4')));
      const foundVideo = candidates.find((vf) => {
        const vbase = fileBase(vf).toLowerCase();
        return vbase.includes(lname) || lname.includes(vbase);
      });
      if (foundVideo) {
        // prefer public if present
        const publicCandidate = join(PUBLIC_ROOT, 'Videos', foundVideo);
        if (existsSync(publicCandidate)) videoPath = `/vendor/${LIB_FOLDER}/${LIB_NAME}/Videos/${encodeURIComponent(foundVideo)}`;
        else videoPath = `${LIB_NAME}/Videos/${encodeURIComponent(foundVideo)}`;
      }
    } catch (e) { /* ignore */ }

    avatars.push({ name, image: imagePath, audio: audioPaths, video: videoPath });
  }

  return { avatars };
});