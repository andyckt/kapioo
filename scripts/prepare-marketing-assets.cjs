const sharp = require('sharp');
const fs = require('node:fs/promises');
const path = require('node:path');

// Derivatives of Kapioo's existing photography. Originals remain untouched.
const sources = {
  thai: 'food-gallery/Thai.JPG',
  korean: 'food-gallery/Korean.jpg',
  chinese: 'food-gallery/Chinese style meal.jpg',
  weekly: 'food-gallery/_MG_4897.jpg',
  table: 'images/_MG_E2616.jpg',
};
async function main() {
  const root = path.resolve(__dirname, '../public');
  await fs.mkdir(path.join(root, 'marketing'), { recursive: true });
  for (const [name, source] of Object.entries(sources)) {
    for (const width of [640, 1280, 1920]) {
      await sharp(path.join(root, source)).rotate().resize({ width, withoutEnlargement: true })
        .webp({ quality: 83 }).toFile(path.join(root, 'marketing', `${name}-${width}.webp`));
    }
  }
  console.log('Prepared 15 responsive images from existing Kapioo photography.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
