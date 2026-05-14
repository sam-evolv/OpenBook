#!/usr/bin/env node
/**
 * Regenerates the OpenBook web favicon and PWA icon set from the OB
 * monogram source PNG. Run once when the brand asset changes:
 *
 *   node scripts/generate-icons.mjs
 *
 * Source:  public/icons/OB Favicon.png  (1024×1024 RGBA, transparent BG)
 * Outputs: public/icons/{favicon,apple-touch-icon,icon,maskable}-*.png
 *          public/favicon.ico
 */
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import toIco from 'to-ico';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const SRC = path.join(ROOT, 'public', 'icons', 'OB Favicon.png');
const OUT_ICONS = path.join(ROOT, 'public', 'icons');
const OUT_ICO = path.join(ROOT, 'public', 'favicon.ico');

const BG = { r: 8, g: 8, b: 8, alpha: 1 };

const ICONS = [
  ['favicon-16.png', 16, false],
  ['favicon-32.png', 32, false],
  ['favicon-48.png', 48, false],
  ['apple-touch-icon-57.png', 57, false],
  ['apple-touch-icon-60.png', 60, false],
  ['apple-touch-icon-72.png', 72, false],
  ['apple-touch-icon-76.png', 76, false],
  ['apple-touch-icon-114.png', 114, false],
  ['apple-touch-icon-120.png', 120, false],
  ['apple-touch-icon-144.png', 144, false],
  ['apple-touch-icon-152.png', 152, false],
  ['apple-touch-icon-167.png', 167, false],
  ['apple-touch-icon-180.png', 180, false],
  ['icon-192.png', 192, false],
  ['icon-512.png', 512, false],
  ['maskable-192.png', 192, true],
  ['maskable-512.png', 512, true],
];

async function render(size, maskable) {
  // Maskable icons need the glyph inside the 80% safe area so platforms
  // can clip to a circle/squircle without cropping it.
  const innerSize = maskable ? Math.round(size * 0.7) : size;

  const fg = await sharp(SRC)
    .resize(innerSize, innerSize, { fit: 'contain' })
    .toBuffer();

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BG,
    },
  })
    .composite([{ input: fg, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function main() {
  console.log(`Source:  ${path.relative(ROOT, SRC)}`);
  console.log(`Writing: ${path.relative(ROOT, OUT_ICONS)}/`);
  for (const [name, size, maskable] of ICONS) {
    const buf = await render(size, maskable);
    writeFileSync(path.join(OUT_ICONS, name), buf);
    console.log(`  ${name.padEnd(28)} ${size}×${size}${maskable ? '  maskable' : ''}`);
  }

  const icoBuf = await toIco([
    await render(16, false),
    await render(32, false),
    await render(48, false),
  ]);
  writeFileSync(OUT_ICO, icoBuf);
  console.log(`  ${path.relative(ROOT, OUT_ICO).padEnd(28)} 16/32/48 multi-res`);

  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
