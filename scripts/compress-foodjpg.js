#!/usr/bin/env node
/**
 * Compress foodjpg images to web-friendly sizes (< 500KB).
 * Run: node scripts/compress-foodjpg.js
 * Requires: npm install sharp --save-dev
 */
const fs = require('fs');
const path = require('path');

async function compress() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch (e) {
    console.error('Please install sharp first: npm install sharp --save-dev');
    process.exit(1);
  }

  const dir = path.join(process.cwd(), 'public', 'foodjpg');
  const files = fs.readdirSync(dir).filter((f) =>
    /\.(jpe?g|png|webp)$/i.test(f)
  );

  console.log(`Found ${files.length} images in public/foodjpg\n`);

  for (const file of files) {
    const inputPath = path.join(dir, file);
    const ext = path.extname(file).toLowerCase();
    const baseName = path.basename(file, ext);

    try {
      const stat = fs.statSync(inputPath);
      const sizeMB = (stat.size / 1024 / 1024).toFixed(2);

      if (stat.size < 400 * 1024) {
        console.log(`  ✓ ${file} (${sizeMB}MB) - already small, skipping`);
        continue;
      }

      const pipeline = sharp(inputPath)
        .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80, mozjpeg: true });

      const buf = await pipeline.toBuffer();
      const newSizeKB = (buf.length / 1024).toFixed(1);

      if (buf.length < stat.size) {
        fs.writeFileSync(inputPath, buf);
        console.log(`  ✓ ${file}: ${sizeMB}MB → ${newSizeKB}KB`);
      } else {
        console.log(`  - ${file}: kept original (${sizeMB}MB)`);
      }
    } catch (err) {
      console.error(`  ✗ ${file}: ${err.message}`);
    }
  }

  console.log('\nDone.');
}

compress();
