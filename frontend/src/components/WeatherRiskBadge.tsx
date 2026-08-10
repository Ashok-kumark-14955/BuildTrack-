import { CloudRain } from 'lucide-react';
import type { WeatherRisk } from '../utils/weather';

const STYLES: Record<WeatherRisk['level'], { bg: string; border: string; text: string }> = {
  high: { bg: 'rgba(220,38,38,0.15)', border: 'rgba(248,113,113,0.4)', text: '#f87171' },
  medium: { bg: 'rgba(217,119,6,0.15)', border: 'rgba(251,191,36,0.4)', text: '#fbbf24' },
};

/** Small pill flagging a task whose active window overlaps risky forecast conditions. */
export default function WeatherRiskBadge({ risk }: { risk: WeatherRisk }) {
  const style = STYLES[risk.level];
  const title = [...risk.reasons, `Suggestion: ${risk.suggestion}`, `Forecast date: ${risk.forecastDate}`].join('\n');

  return (
    <span
      title={title}
      className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 cursor-help"
      style={{ backgroundColor: style.bg, border: `1px solid ${style.border}`, color: style.text }}
    >
      <CloudRain size={10} />
      {risk.level === 'high' ? 'Weather Risk' : 'Weather Watch'}
    </span>
  );
}
