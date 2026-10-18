const fs = require('fs');
const path = require('path');

const LIB_FOLDER = '370-avatars-and-users-library';
const LIB_NAME = '370+ avatars and users library – Untitled UI';
const VENDOR_ROOT = path.join(process.cwd(), 'vendor', LIB_FOLDER, LIB_NAME);
const OUT_ROOT = path.join(process.cwd(), 'public', 'vendor', LIB_FOLDER, LIB_NAME);

function ensureDir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }

const videosDir = path.join(VENDOR_ROOT, 'Videos');
if (!fs.existsSync(videosDir)) { console.error('No vendor Videos directory at', videosDir); process.exit(1); }

const files = fs.readdirSync(videosDir).filter(f => f.toLowerCase().endsWith('.mp4'));
if (!files.length) { console.error('No MP4 files found in', videosDir); process.exit(1); }

ensureDir(path.join(OUT_ROOT, 'Videos'));

for (const f of files) {
  const src = path.join(videosDir, f);
  const dest = path.join(OUT_ROOT, 'Videos', f);
  try {
    fs.copyFileSync(src, dest);
    console.log('Copied', f);
  } catch (e) { console.warn('Failed to copy', f, e); }
}

console.log('Done.');
