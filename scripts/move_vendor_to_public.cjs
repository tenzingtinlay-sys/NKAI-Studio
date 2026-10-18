const fs = require('fs');
const path = require('path');

const LIB_FOLDER = '370-avatars-and-users-library';
const LIB_NAME = '370+ avatars and users library – Untitled UI';
const ROOT = path.join(process.cwd(), 'vendor', LIB_FOLDER, LIB_NAME);
const PUBLIC_ROOT = path.join(process.cwd(), 'public', 'vendor', LIB_FOLDER, LIB_NAME);

function ensureDir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }

if (!fs.existsSync(ROOT)) {
  console.error('Vendor library not found at', ROOT);
  process.exit(1);
}

ensureDir(PUBLIC_ROOT);

const webpDir = path.join(ROOT, 'WebP');
const pngDir = path.join(ROOT, 'PNG (transparent background)');
const jpegDir = path.join(ROOT, 'JPEG');
const audioDir = path.join(ROOT, 'Audio');

function listFiles(dir) { try { return fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => fs.statSync(path.join(dir,f)).isFile()) : []; } catch(e){return [];}}
const webps = listFiles(webpDir);
const pngs = listFiles(pngDir);
const jpgs = listFiles(jpegDir);
const audios = listFiles(audioDir);

function fileBase(name){ return name.replace(/\.[^.]+$/, '').trim(); }

const imagesByName = new Map();
function addImage(fname, kind, dirPath) {
  const name = fileBase(fname);
  const prev = imagesByName.get(name) || {};
  prev[kind] = { fname, dirPath };
  imagesByName.set(name, prev);
}
for (const f of webps) addImage(f, 'webp', 'WebP');
for (const f of pngs) addImage(f, 'png', 'PNG (transparent background)');
for (const f of jpgs) addImage(f, 'jpg', 'JPEG');

const audioList = audios.map(a => ({ file: a, base: fileBase(a).toLowerCase() }));

const moved = [];

for (const [name, imgs] of imagesByName.entries()) {
  const lname = name.toLowerCase();
  // choose preferred image
  const chosenImage = imgs.webp || imgs.png || imgs.jpg;
  let chosenAudio = null;
  // try to find audio by basename matching
  const found = audioList.find(a => a.base.includes(lname) || lname.includes(a.base));
  if (found) chosenAudio = found.file;

  // copy image
  if (chosenImage) {
    const src = path.join(ROOT, chosenImage.dirPath, chosenImage.fname);
    const destDir = path.join(PUBLIC_ROOT, chosenImage.dirPath);
    ensureDir(destDir);
    const dest = path.join(destDir, chosenImage.fname);
    try { fs.copyFileSync(src, dest); } catch(e){ console.warn('copy image failed', src, e); }
  }
  // copy audio
  if (chosenAudio) {
    const src = path.join(audioDir, chosenAudio);
    const destDir = path.join(PUBLIC_ROOT, 'Audio');
    ensureDir(destDir);
    const dest = path.join(destDir, chosenAudio);
    try { fs.copyFileSync(src, dest); } catch(e){ console.warn('copy audio failed', src, e); }
  }
  moved.push({ name, image: chosenImage ? `${chosenImage.dirPath}/${chosenImage.fname}` : null, audio: chosenAudio });
}

// write a small mapping CSV for manual tweaks
const csvLines = moved.map(m => `${m.name},${m.audio || ''}`);
fs.writeFileSync(path.join(ROOT, 'avatar-audio-mapping.csv'), csvLines.join('\n'), 'utf8');
console.log('Moved', moved.length, 'avatars assets to public/vendor');
console.log('Wrote avatar-audio-mapping.csv in vendor root for manual edits.');
