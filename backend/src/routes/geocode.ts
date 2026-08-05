import { Router } from 'express';

const router = Router();

// Tiny in-memory cache to avoid hammering Nominatim's free API for the same coordinates.
const cache = new Map<string, { displayName: string; expires: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 1 day

router.get('/reverse', async (req, res) => {
  const lat = parseFloat(String(req.query.lat));
  const lng = parseFloat(String(req.query.lng));
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return res.status(400).json({ error: 'lat and lng query params are required numbers' });
  }

  const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) {
    return res.json({ displayName: cached.displayName });
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
    const resp = await fetch(url, {
      headers: {
        // Nominatim's usage policy requires a descriptive User-Agent identifying the application.
        'User-Agent': 'SiteTrack-ConstructionApp/1.0 (site task management)',
        'Accept-Language': 'en',
      },
    });
    if (!resp.ok) throw new Error(`Nominatim responded ${resp.status}`);
    const data = (await resp.json()) as { display_name?: string };
    const displayName = data.display_name || 'Unknown location';
    cache.set(key, { displayName, expires: Date.now() + CACHE_TTL_MS });
    res.json({ displayName });
  } catch (err) {
    res.status(502).json({ error: 'Reverse geocoding failed' });
  }
});

export default router;
