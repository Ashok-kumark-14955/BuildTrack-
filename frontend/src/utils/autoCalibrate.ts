/**
 * autoCalibrate.ts
 *
 * Detects column positions on a structural/foundation plan drawing by:
 * 1. Converting the image to grayscale + invert (white lines on black bg)
 * 2. Running horizontal and vertical projection profiles to find grid lines
 * 3. Finding the intersections of those lines → these are the column positions
 * 4. Clustering nearby peaks so noisy duplicates are removed
 *
 * Returns fractional positions (0–1) so they can be multiplied by image W/H.
 */

export interface AutoCalibrateResult {
  /** Fractional X positions of detected column strips (0–1, relative to image width) */
  colXs: number[];
  /** Fractional Y positions of detected row strips (0–1, relative to image height) */
  rowYs: number[];
}

/** Minimum distance between two peaks (fraction of image dimension) to count as separate */
const MIN_GAP_FRAC = 0.03;

/**
 * Find peaks in a 1-D projection array.
 * A peak is a local maximum that is at least `threshold` above the median.
 */
function findPeaks(profile: number[], minGapPx: number): number[] {
  const median = [...profile].sort((a, b) => a - b)[Math.floor(profile.length / 2)];
  const threshold = median * 0.25 + Math.max(...profile) * 0.18;
  const peaks: number[] = [];
  for (let i = 1; i < profile.length - 1; i++) {
    if (profile[i] > threshold && profile[i] >= profile[i - 1] && profile[i] >= profile[i + 1]) {
      // Check it's far enough from the last accepted peak
      if (peaks.length === 0 || i - peaks[peaks.length - 1] >= minGapPx) {
        peaks.push(i);
      } else if (profile[i] > profile[peaks[peaks.length - 1]]) {
        // Higher local max — replace
        peaks[peaks.length - 1] = i;
      }
    }
  }
  return peaks;
}

/**
 * Given a <canvas> element with the drawing rendered on it,
 * return detected column grid line positions as fractions [0..1].
 */
function detectFromCanvas(
  canvas: HTMLCanvasElement,
  targetCols: number,
  targetRows: number,
): AutoCalibrateResult {
  const ctx = canvas.getContext('2d')!;
  const { width, height } = canvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // Build grayscale array and invert (dark lines → bright in our matrix)
  const gray = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    // 0 = white (background), 255 = black (ink) after inversion
    gray[i] = 255 - (0.299 * r + 0.587 * g + 0.114 * b);
  }

  // Horizontal projection: sum each row → strong row = horizontal beam/line
  const rowProfile = new Float32Array(height);
  for (let y = 0; y < height; y++) {
    let sum = 0;
    for (let x = 0; x < width; x++) sum += gray[y * width + x];
    rowProfile[y] = sum / width;
  }

  // Vertical projection: sum each column → strong col = vertical beam/line
  const colProfile = new Float32Array(width);
  for (let x = 0; x < width; x++) {
    let sum = 0;
    for (let y = 0; y < height; y++) sum += gray[y * width + x];
    colProfile[x] = sum / height;
  }

  // Find peaks with a minimum gap (use target count to tune gap)
  const colGapPx = Math.floor((width * MIN_GAP_FRAC * 5) / Math.max(2, targetCols));
  const rowGapPx = Math.floor((height * MIN_GAP_FRAC * 5) / Math.max(2, targetRows));

  let colPeaks = findPeaks(Array.from(colProfile), Math.max(6, colGapPx));
  let rowPeaks = findPeaks(Array.from(rowProfile), Math.max(6, rowGapPx));

  // If too few peaks found, fall back to evenly-spaced positions
  if (colPeaks.length < 2) {
    colPeaks = Array.from({ length: targetCols }, (_, i) =>
      Math.round((i / (targetCols - 1)) * (width - 1))
    );
  }
  if (rowPeaks.length < 2) {
    rowPeaks = Array.from({ length: targetRows }, (_, i) =>
      Math.round((i / (targetRows - 1)) * (height - 1))
    );
  }

  // Trim / expand to targetCols / targetRows by keeping the most evenly-distributed peaks
  colPeaks = pickBest(colPeaks, targetCols);
  rowPeaks = pickBest(rowPeaks, targetRows);

  return {
    colXs: colPeaks.map((p) => p / (width - 1)),
    rowYs: rowPeaks.map((p) => p / (height - 1)),
  };
}

/**
 * From an array of peak positions, pick `target` that are most evenly spaced.
 * If we have more than target: greedily discard the ones that create the
 *   smallest gaps between neighbours.
 * If fewer: pad with linearly interpolated extras.
 */
function pickBest(peaks: number[], target: number): number[] {
  if (peaks.length === target) return peaks;

  // Too many: iteratively remove the peak that minimises the smallest gap
  while (peaks.length > target) {
    let minGap = Infinity;
    let removeIdx = 1;
    for (let i = 1; i < peaks.length; i++) {
      const gap = peaks[i] - peaks[i - 1];
      if (gap < minGap) { minGap = gap; removeIdx = i; }
    }
    peaks.splice(removeIdx, 1);
  }

  // Too few: fill in gaps with even spacing between existing outer bounds
  if (peaks.length < 2) {
    peaks = [0, 1];
  }
  while (peaks.length < target) {
    let maxGap = 0;
    let splitAfter = 0;
    for (let i = 0; i < peaks.length - 1; i++) {
      const gap = peaks[i + 1] - peaks[i];
      if (gap > maxGap) { maxGap = gap; splitAfter = i; }
    }
    const mid = Math.round((peaks[splitAfter] + peaks[splitAfter + 1]) / 2);
    peaks.splice(splitAfter + 1, 0, mid);
  }

  return peaks;
}

/**
 * Main entry: draw the image into an off-screen canvas and run detection.
 * @param imageElement  The loaded HTMLImageElement (already decoded).
 * @param targetCols    Expected number of column lines (== gridCols).
 * @param targetRows    Expected number of row lines (== gridRows).
 * @param scaleTo       Optional: downscale long edge to this px for speed (default 1200).
 */
export async function detectColumnPositions(
  imageElement: HTMLImageElement,
  targetCols: number,
  targetRows: number,
  scaleTo = 1200,
): Promise<AutoCalibrateResult> {
  const scale = Math.min(1, scaleTo / Math.max(imageElement.naturalWidth, imageElement.naturalHeight));
  const w = Math.round(imageElement.naturalWidth * scale);
  const h = Math.round(imageElement.naturalHeight * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(imageElement, 0, 0, w, h);

  return detectFromCanvas(canvas, targetCols, targetRows);
}
