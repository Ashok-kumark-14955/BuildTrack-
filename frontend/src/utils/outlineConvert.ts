/**
 * Converts a raster drawing (photo/scan) into a clean black-on-white line
 * drawing using Sobel edge detection, so uploaded site photos read like a
 * proper outline/CAD drawing instead of a raw image.
 */
export async function convertToOutline(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file;

  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0);

  const imgData = ctx.getImageData(0, 0, width, height);
  const src = imgData.data;

  const gray = new Float32Array(width * height);
  for (let i = 0, p = 0; i < src.length; i += 4, p++) {
    gray[p] = 0.3 * src[i] + 0.59 * src[i + 1] + 0.11 * src[i + 2];
  }

  const out = new Uint8ClampedArray(src.length);
  const EDGE_THRESHOLD = 60;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let mag = 0;
      if (x > 0 && y > 0 && x < width - 1 && y < height - 1) {
        const tl = gray[(y - 1) * width + (x - 1)];
        const t = gray[(y - 1) * width + x];
        const tr = gray[(y - 1) * width + (x + 1)];
        const l = gray[y * width + (x - 1)];
        const r = gray[y * width + (x + 1)];
        const bl = gray[(y + 1) * width + (x - 1)];
        const b = gray[(y + 1) * width + x];
        const br = gray[(y + 1) * width + (x + 1)];
        const gx = -tl - 2 * l - bl + tr + 2 * r + br;
        const gy = -tl - 2 * t - tr + bl + 2 * b + br;
        mag = Math.sqrt(gx * gx + gy * gy);
      }
      const idx = (y * width + x) * 4;
      const value = mag > EDGE_THRESHOLD ? 25 : 255;
      out[idx] = out[idx + 1] = out[idx + 2] = value;
      out[idx + 3] = 255;
    }
  }

  ctx.putImageData(new ImageData(out, width, height), 0, 0);

  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Outline conversion failed'))), 'image/png')
  );
  const outName = file.name.replace(/\.[^./]+$/, '') + '-outline.png';
  return new File([blob], outName, { type: 'image/png' });
}
