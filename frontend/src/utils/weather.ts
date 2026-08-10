/**
 * weather.ts — Weather-Based Task Agent
 *
 * Fetches short-range forecasts (Open-Meteo — free, no API key) for a site's
 * coordinates and flags weather-sensitive tasks whose active window overlaps
 * risky conditions (rain, wind, temperature extremes).
 */
import type { Task } from '../types';

export interface DailyForecast {
  date: string; // YYYY-MM-DD
  precipitationProbabilityMax: number | null; // %
  precipitationSumMm: number | null;
  windSpeedMaxKmh: number | null;
  tempMaxC: number | null;
  tempMinC: number | null;
}

export type WeatherRiskLevel = 'high' | 'medium';

export interface WeatherRisk {
  level: WeatherRiskLevel;
  reasons: string[];
  suggestion: string;
  forecastDate: string;
}

const FORECAST_TTL_MS = 60 * 60 * 1000; // 1 hour
const forecastCache = new Map<string, { expires: number; data: DailyForecast[] }>();

/** Fetch (and cache) the 16-day daily forecast for a site's coordinates. */
export async function fetchForecast(lat: number, lng: number): Promise<DailyForecast[]> {
  const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  const cached = forecastCache.get(key);
  if (cached && cached.expires > Date.now()) return cached.data;

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
    `&daily=precipitation_probability_max,precipitation_sum,wind_speed_10m_max,temperature_2m_max,temperature_2m_min` +
    `&timezone=auto&forecast_days=16`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather API error (${res.status})`);
  const json = await res.json();
  const daily = json?.daily ?? {};
  const dates: string[] = daily.time ?? [];
  const data: DailyForecast[] = dates.map((date, i) => ({
    date,
    precipitationProbabilityMax: daily.precipitation_probability_max?.[i] ?? null,
    precipitationSumMm: daily.precipitation_sum?.[i] ?? null,
    windSpeedMaxKmh: daily.wind_speed_10m_max?.[i] ?? null,
    tempMaxC: daily.temperature_2m_max?.[i] ?? null,
    tempMinC: daily.temperature_2m_min?.[i] ?? null,
  }));

  forecastCache.set(key, { expires: Date.now() + FORECAST_TTL_MS, data });
  return data;
}

// Task categories that are typically performed outdoors / exposed to weather.
const SENSITIVE_CATEGORIES = new Set([
  'civil', 'structural', 'masonry', 'waterproofing', 'finishing', 'roofing', 'safety',
]);

// Fallback: catch weather-sensitive work even when the category is generic
// (e.g. "Electrical" for an "Outdoor Lighting" task).
const SENSITIVE_KEYWORDS = [
  'concrete', 'pour', 'pcc', 'excavation', 'earthwork', 'roof', 'truss', 'brick', 'masonry',
  'plaster', 'paint', 'waterproof', 'foundation', 'crane', 'erection', 'tile', 'gutter',
  'shuttering', 'formwork', 'curing', 'outdoor', 'scaffold', 'slab',
];

function isWeatherSensitive(task: Task): boolean {
  const category = (task.category || '').toLowerCase();
  if (SENSITIVE_CATEGORIES.has(category)) return true;
  const haystack = `${task.name} ${task.description}`.toLowerCase();
  return SENSITIVE_KEYWORDS.some((kw) => haystack.includes(kw));
}

/** Pick the forecast day most relevant to a task's active window. */
function pickForecastDay(task: Task, forecast: DailyForecast[]): DailyForecast | null {
  if (forecast.length === 0) return null;
  const byDate = new Map(forecast.map((d) => [d.date, d]));
  const today = forecast[0].date;

  if (task.dueDate && byDate.has(task.dueDate)) return byDate.get(task.dueDate)!;
  if (task.startDate && task.dueDate && task.startDate <= today && today <= task.dueDate) {
    return byDate.get(today) ?? null;
  }
  if (task.startDate && byDate.has(task.startDate)) return byDate.get(task.startDate)!;
  return null;
}

function evaluateDay(day: DailyForecast): { level: WeatherRiskLevel; reasons: string[] } | null {
  const reasons: string[] = [];
  let level: WeatherRiskLevel | null = null;

  const bump = (next: WeatherRiskLevel) => {
    if (next === 'high' || level == null) level = next;
  };

  if (day.precipitationProbabilityMax != null) {
    if (day.precipitationProbabilityMax >= 70) {
      bump('high');
      reasons.push(`High chance of rain (${day.precipitationProbabilityMax}%)`);
    } else if (day.precipitationProbabilityMax >= 40) {
      bump('medium');
      reasons.push(`Moderate chance of rain (${day.precipitationProbabilityMax}%)`);
    }
  }
  if (day.precipitationSumMm != null && day.precipitationSumMm >= 10) {
    bump('high');
    reasons.push(`Heavy rainfall expected (${day.precipitationSumMm}mm)`);
  }
  if (day.windSpeedMaxKmh != null) {
    if (day.windSpeedMaxKmh >= 40) {
      bump('high');
      reasons.push(`High winds expected (${Math.round(day.windSpeedMaxKmh)} km/h)`);
    } else if (day.windSpeedMaxKmh >= 25) {
      bump('medium');
      reasons.push(`Breezy conditions (${Math.round(day.windSpeedMaxKmh)} km/h)`);
    }
  }
  if (day.tempMaxC != null && day.tempMaxC >= 40) {
    bump('medium');
    reasons.push(`Extreme heat expected (${Math.round(day.tempMaxC)}°C)`);
  }
  if (day.tempMinC != null && day.tempMinC <= 4) {
    bump('medium');
    reasons.push(`Low temperature expected (${Math.round(day.tempMinC)}°C) — may slow curing`);
  }

  if (!level) return null;
  return { level, reasons };
}

const SUGGESTIONS: Record<WeatherRiskLevel, string> = {
  high: 'Consider postponing or rescheduling',
  medium: 'Monitor conditions closely',
};

/** Evaluate a task against a site's forecast. Returns null if there's no weather risk. */
export function getTaskWeatherRisk(task: Task, forecast: DailyForecast[]): WeatherRisk | null {
  if (task.status === 'Completed' || !isWeatherSensitive(task)) return null;
  const day = pickForecastDay(task, forecast);
  if (!day) return null;
  const evaluated = evaluateDay(day);
  if (!evaluated) return null;
  return { ...evaluated, suggestion: SUGGESTIONS[evaluated.level], forecastDate: day.date };
}
