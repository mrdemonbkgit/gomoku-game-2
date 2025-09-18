import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

async function ensureDirectoryExists(directoryPath) {
  try {
    await fs.mkdir(directoryPath, { recursive: true });
  } catch (error) {
    // If directory exists or was created in parallel, ignore
  }
}

async function generateFavicon() {
  const svgPath = path.resolve(projectRoot, 'assets', 'favicon.svg');
  const pngOutDir = path.resolve(projectRoot, 'assets', 'favicon_png');
  const icoOutPath = path.resolve(projectRoot, 'favicon.ico');

  const sizes = [16, 32, 48, 64];

  const svgBuffer = await fs.readFile(svgPath);
  await ensureDirectoryExists(pngOutDir);

  const pngBuffers = [];

  for (const size of sizes) {
    const pngBuffer = await sharp(svgBuffer, { density: 384 })
      .resize(size, size, { fit: 'cover' })
      .png({ compressionLevel: 9, palette: true })
      .toBuffer();

    pngBuffers.push(pngBuffer);
    const outPngPath = path.resolve(pngOutDir, `favicon-${size}.png`);
    await fs.writeFile(outPngPath, pngBuffer);
  }

  const icoBuffer = await pngToIco(pngBuffers);
  await fs.writeFile(icoOutPath, icoBuffer);

  // eslint-disable-next-line no-console
  console.log('favicon.ico generated at', path.relative(projectRoot, icoOutPath));
}

generateFavicon().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Failed to generate favicon:', error);
  process.exitCode = 1;
});


