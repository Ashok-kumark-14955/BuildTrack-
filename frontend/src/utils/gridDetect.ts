import { createWorker, PSM } from 'tesseract.js';

export interface DetectedGrid {
  cols: number;
  rows: number;
}

/**
 * Upscales + binarizes the image on a canvas to improve OCR accuracy on
 * small, crowded grid labels before handing it to tesseract.
 */
async function preprocessImage(file: File): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.max(1, Math.min(3, 1800 / bitmap.width));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const gray = 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2];
    const v = gray > 150 ? 255 : 0;
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

/**
 * Uses OCR to read column letters (A, B, C, ...) and row numbers (1, 2, 3, ...)
 * from a structural/grid drawing image, then infers the grid size from the
 * distinct labels found. Returns null if detection isn't confident enough.
 */
export async function detectGridFromImage(file: File): Promise<DetectedGrid | null> {
  if (!file.type.startsWith('image/')) return null;

  const canvas = await preprocessImage(file);
  const worker = await createWorker('eng');
  try {
    await worker.setParameters({
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
      tessedit_pageseg_mode: PSM.SPARSE_TEXT,
    });
    const { data } = await worker.recognize(canvas);

    const letters = new Set<string>();
    const numbers = new Set<number>();

    const tokens = data.text.split(/\s+/).filter(Boolean);
    for (const text of tokens) {
      // Only trust combined grid codes like "A1", "C4" — standalone single
      // letters/digits are too often OCR noise from lines/circles.
      const match = text.match(/^([A-Za-z]{1,2})(\d{1,2})$/);
      if (match) {
        letters.add(match[1].toUpperCase());
        const n = Number(match[2]);
        if (n >= 1 && n <= 26) numbers.add(n);
      }
    }

    if (letters.size < 2 || numbers.size < 2) return null;

    return { cols: letters.size, rows: numbers.size };
  } finally {
    await worker.terminate();
  }
}
