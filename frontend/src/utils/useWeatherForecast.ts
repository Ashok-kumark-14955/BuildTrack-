import { useEffect, useState } from 'react';
import { fetchForecast, type DailyForecast } from './weather';

/** Forecast for a single site (lat/lng), refetched whenever the coordinates change. */
export function useWeatherForecast(lat: number | null | undefined, lng: number | null | undefined) {
  const [forecast, setForecast] = useState<DailyForecast[] | null>(null);

  useEffect(() => {
    if (lat == null || lng == null) { setForecast(null); return; }
    let cancelled = false;
    fetchForecast(lat, lng)
      .then((data) => { if (!cancelled) setForecast(data); })
      .catch(() => { if (!cancelled) setForecast(null); });
    return () => { cancelled = true; };
  }, [lat, lng]);

  return forecast;
}

/** Forecasts for many drawings at once, keyed by drawingId. Skips drawings without a saved location. */
export function useForecastsByDrawing(
  drawings: { id: string; lat: number | null; lng: number | null }[]
): Record<string, DailyForecast[]> {
  const located = drawings.filter((d) => d.lat != null && d.lng != null);
  const key = located.map((d) => `${d.id}:${d.lat},${d.lng}`).join('|');
  const [map, setMap] = useState<Record<string, DailyForecast[]>>({});

  useEffect(() => {
    if (located.length === 0) { setMap({}); return; }
    let cancelled = false;
    Promise.all(
      located.map(async (d) => {
        try {
          const data = await fetchForecast(d.lat as number, d.lng as number);
          return [d.id, data] as const;
        } catch {
          return [d.id, null] as const;
        }
      })
    ).then((results) => {
      if (cancelled) return;
      const next: Record<string, DailyForecast[]> = {};
      for (const [id, data] of results) if (data) next[id] = data;
      setMap(next);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return map;
}
