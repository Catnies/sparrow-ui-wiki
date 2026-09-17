// scripts/subset-font.mjs
// Subsets src/fonts/seguiemj.woff2 down to the emoji actually used in the
// docs + UI source. The full Segoe UI Emoji font is ~6.5 MB; the subset is
// typically <100 KB. Runs automatically before `start`/`build` (prestart /
// prebuild hooks) so newly added emoji are picked up without manual steps.

import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import subsetFont from 'subset-font';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FONT_IN = path.join(root, 'src/fonts/seguiemj.full.woff2');
const FONT_OUT = path.join(root, 'src/fonts/seguiemj.woff2');
const SCAN_DIRS = ['docs', 'i18n', 'src', 'sidebars'];
const SCAN_EXT = /\.(md|mdx|js|jsx|ts|tsx|json|yml|yaml|css)$/i;
const SKIP_DIRS = new Set(['node_modules', 'build', '.git', '.docusaurus']);

// A file that doesn't exist yet means we need a build regardless of content.
if (!fs.existsSync(FONT_IN)) {
  if (fs.existsSync(FONT_OUT)) {
    // First run: keep the original as the subsetting source.
    fs.renameSync(FONT_OUT, FONT_IN);
  } else {
    console.error('[subset-font] no source font found at', FONT_IN);
    process.exit(1);
  }
}

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(p);
    else if (SCAN_EXT.test(entry.name)) yield p;
  }
}

// Collect every non-BMP char plus emoji-adjacent BMP blocks (dingbats,
// arrows, misc symbols, variation selectors) that emoji fonts render.
function collectGlyphs() {
  const glyphs = new Set();
  for (const dir of SCAN_DIRS) {
    const abs = path.join(root, dir);
    if (!fs.existsSync(abs)) continue;
    for (const file of walk(abs)) {
      const text = fs.readFileSync(file, 'utf8');
      for (const ch of text) {
        const cp = ch.codePointAt(0);
        if (
          cp > 0xffff ||
          (cp >= 0x2190 && cp <= 0x21ff) || // arrows
          (cp >= 0x2300 && cp <= 0x23ff) || // misc technical (⌛ etc.)
          (cp >= 0x2600 && cp <= 0x27bf) || // misc symbols + dingbats
          (cp >= 0x2b00 && cp <= 0x2bff) || // arrows/stars
          (cp >= 0xfe00 && cp <= 0xfe0f) || // variation selectors
          cp === 0x200d // zero-width joiner (emoji sequences)
        ) {
          glyphs.add(ch);
        }
      }
    }
  }
  return glyphs;
}

const glyphs = collectGlyphs();
const text = [...glyphs].join('');
console.log(`[subset-font] ${glyphs.size} glyphs used across docs`);

// Skip the rebuild if the existing subset already covers every glyph.
// (Cheap check: keep a manifest of what went in.)
const manifestPath = FONT_OUT + '.manifest';
if (fs.existsSync(FONT_OUT) && fs.existsSync(manifestPath)) {
  const prev = fs.readFileSync(manifestPath, 'utf8');
  if (prev === text) {
    console.log('[subset-font] unchanged, skipping');
    process.exit(0);
  }
}

const full = fs.readFileSync(FONT_IN);
const subset = await subsetFont(full, text, {targetFormat: 'woff2'});
fs.writeFileSync(FONT_OUT, subset);
fs.writeFileSync(manifestPath, text);
console.log(
  `[subset-font] ${(full.length / 1e6).toFixed(2)} MB -> ${(subset.length / 1e3).toFixed(1)} KB`
);
