// scripts/optimize-images.mjs
// Recompresses the real PNG files in static/img (many files there carry a
// .png extension but are already AVIF — those are skipped by magic bytes).
// Uses libimagequant palette PNG (quality 95) which is visually lossless for
// screenshots and typically 3-5x smaller than the original export.
// Idempotent: files that don't shrink are left untouched.

import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const IMG_DIR = path.join(root, 'static/img');
const MIN_SIZE = 5 * 1024; // don't bother with tiny files

function isRealPng(p) {
  const fd = fs.openSync(p, 'r');
  const b = Buffer.alloc(8);
  fs.readSync(fd, b, 0, 8, 0);
  fs.closeSync(fd);
  return b.toString('ascii', 1, 4) === 'PNG';
}

let saved = 0;
for (const f of fs.readdirSync(IMG_DIR)) {
  if (!f.toLowerCase().endsWith('.png')) continue;
  const p = path.join(IMG_DIR, f);
  if (!fs.statSync(p).isFile() || !isRealPng(p)) continue;
  const orig = fs.statSync(p).size;
  if (orig < MIN_SIZE) continue;

  const out = await sharp(p)
    .png({palette: true, quality: 95, compressionLevel: 9})
    .toBuffer();

  if (out.length < orig * 0.9) {
    fs.writeFileSync(p, out);
    saved += orig - out.length;
    console.log(
      `${f}: ${(orig / 1e3).toFixed(0)}KB -> ${(out.length / 1e3).toFixed(0)}KB`
    );
  } else {
    console.log(`${f}: kept (${(orig / 1e3).toFixed(0)}KB)`);
  }
}
console.log(`total saved: ${(saved / 1e6).toFixed(2)} MB`);
