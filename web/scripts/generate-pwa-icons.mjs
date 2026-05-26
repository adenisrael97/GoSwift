// Generate the PWA icon set from the brand SVGs.
//
// Run with: npm run pwa:icons
//
// sharp is a devDependency — this script is the only thing that uses it, and it
// never runs at request time, so it adds zero runtime surface. Outputs are
// committed static PNGs that the manifest and <head> reference directly.

import sharp from 'sharp';
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WEB_ROOT  = join(__dirname, '..');
const ASSETS    = join(WEB_ROOT, 'assets');
const ICONS_OUT = join(WEB_ROOT, 'public', 'icons');
const APP_DIR   = join(WEB_ROOT, 'app');

// [sourceSvg, outPath, size]
const TARGETS = [
  ['goswift-icon.svg',          join(ICONS_OUT, 'icon-192.png'),            192],
  ['goswift-icon.svg',          join(ICONS_OUT, 'icon-512.png'),            512],
  ['goswift-icon-maskable.svg', join(ICONS_OUT, 'icon-maskable-512.png'),   512],
  ['goswift-icon.svg',          join(ICONS_OUT, 'apple-touch-icon-180.png'),180],
  // Next auto-emits <link rel="apple-touch-icon"> from app/apple-icon.png.
  ['goswift-icon.svg',          join(APP_DIR,   'apple-icon.png'),          180],
];

async function render([srcName, outPath, size]) {
  const svg = await readFile(join(ASSETS, srcName));
  await sharp(svg, { density: 384 })
    .resize(size, size, { fit: 'cover' })
    .png()
    .toFile(outPath);
  console.log(`  ✓ ${outPath.replace(WEB_ROOT + '/', '')}  (${size}x${size})`);
}

async function main() {
  await mkdir(ICONS_OUT, { recursive: true });
  console.log('Generating PWA icons…');
  for (const t of TARGETS) await render(t);
  console.log('Done.');
}

main().catch((err) => {
  console.error('[generate-pwa-icons] failed:', err);
  process.exit(1);
});
