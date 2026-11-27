import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CloudSun,
  Droplets,
  MapPin,
  MessageSquareText,
  Thermometer,
  Wind,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { AirQualityReport, NavSection, UserPreferences } from '../types/airaware';
import { calculateAqi } from '../utils/aqi';

interface DashboardViewProps {
  report: AirQualityReport | null;
  isLoading: boolean;
  error: string | null;
  preferences: UserPreferences;
  onNavigate: (section: NavSection) => void;
}

const US_SCALE_SEGMENTS = [
  { label: 'Good', range: '0-50', color: '#16A34A' },
  { label: 'Moderate', range: '51-100', color: '#CA8A04' },
  { label: 'Sensitive', range: '101-150', color: '#F59E0B' },
  { label: 'Unhealthy', range: '151-200', color: '#DC2626' },
  { label: 'Very Unhealthy', range: '201-300', color: '#7E22CE' },
  { label: 'Hazardous', range: '301-500', color: '#881337' },
];

const CPCB_SCALE_SEGMENTS = [
  { label: 'Good', range: '0-50', color: '#16A34A' },
  { label: 'Satisfactory', range: '51-100', color: '#CA8A04' },
  { label: 'Moderate', range: '101-200', color: '#F59E0B' },
  { label: 'Poor', range: '201-300', color: '#DC2626' },
  { label: 'Very Poor', range: '301-400', color: '#7E22CE' },
  { label: 'Severe', range: '401-500', color: '#881337' },
];

export function DashboardView({
  report,
  isLoading,
  error,
  preferences,
  onNavigate,
}: DashboardViewProps) {
  const [historyRange, setHistoryRange] = useState<'daily' | 'weekly'>('daily');

  const aqiResult = useMemo(() => {
    if (!report) return null;
    return calculateAqi(report.pollutants, preferences.aqiStandard);
  }, [report, preferences.aqiStandard]);

  const chartData = useMemo(() => {
    if (!report) return [];
    const sourcePoints = historyRange === 'daily' ? report.hourlyHistory : report.dailyHistory;
    return sourcePoints.map((pt) => {
      const pointAqi = calculateAqi(
        {
          pm25: pt.pm25,
          pm10: pt.pm10,
          no2: pt.no2,
          so2: null,
          co: null,
          o3: pt.o3,
        },
        preferences.aqiStandard
      );
      return {
        label: pt.label,
        aqi: pointAqi.aqi,
        pm25: pt.pm25,
        pm10: pt.pm10,
      };
    });
  }, [report, historyRange, preferences.aqiStandard]);

  const scaleSegments =
    preferences.aqiStandard === 'CPCB_INDIA' ? CPCB_SCALE_SEGMENTS : US_SCALE_SEGMENTS;

  if (isLoading && !report) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-28 rounded-xl bg-slate-200 dark:bg-slate-800" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-64 rounded-xl bg-slate-200 dark:bg-slate-800" />
          <div className="lg:col-span-2 h-64 rounded-xl bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>
    );
  }

  if (error && !report) {
    return (
      <div className="rounded-xl border border-red-200 dark:border-red-900 bg-white dark:bg-slate-900 p-8 text-center">
        <AlertTriangle className="h-10 w-10 text-[#DC2626] mx-auto mb-3" />
        <h2 className="font-display text-lg font-bold text-[#0F172A] dark:text-white">
          Unable to Load Air Quality Data
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-md mx-auto">{error}</p>
        <button
          type="button"
          onClick={() => onNavigate('live-aqi')}
          className="mt-4 px-4 py-2 rounded-lg bg-[#16A34A] text-white text-sm font-semibold hover:bg-[#14532D] transition-colors"
        >
          Open Location Search
        </button>
      </div>
    );
  }

  if (!report || !aqiResult) return null;

  const personalizedNote = (() => {
    const base = aqiResult.category.outdoorActivityNote;
    const extras: string[] = [];
    if (preferences.sensitiveConsiderations.children) {
      extras.push('prioritize indoor play if AQI rises above 100');
    }
    if (preferences.sensitiveConsiderations.olderAdults) {
      extras.push('schedule walks during calmer midday hours');
    }
    if (preferences.lifestyle === 'Student') {
      extras.push('check morning commute air before cycling or walking to campus');
    } else if (preferences.lifestyle === 'Working Professional') {
      extras.push('prefer low-traffic routes or enclosed transit during rush hour');
    }
    return extras.length > 0 ? `${base} For your household (${preferences.lifestyle}): ${extras.join('; ')}.` : base;
  })();

  const pollutantCards = [
    { key: 'PM2.5', value: report.pollutants.pm25, unit: 'µg/m³', note: 'Fine particles' },
    { key: 'PM10', value: report.pollutants.pm10, unit: 'µg/m³', note: 'Coarse dust' },
    { key: 'NO2', value: report.pollutants.no2, unit: 'µg/m³', note: 'Traffic gas' },
    { key: 'SO2', value: report.pollutants.so2, unit: 'µg/m³', note: 'Sulfur dioxide' },
    {
      key: 'CO',
      value: report.pollutants.co !== null ? Number((report.pollutants.co / 1000).toFixed(2)) : null,
      unit: 'mg/m³',
      note: 'Carbon monoxide',
    },
    { key: 'O3', value: report.pollutants.o3, unit: 'µg/m³', note: 'Ground ozone' },
  ];

  const aqiPercent = (() => {
    if (aqiResult.aqi === null) return 0;
    const val = aqiResult.aqi;
    const ranges =
      preferences.aqiStandard === 'CPCB_INDIA'
        ? [
            [0, 50],
            [51, 100],
            [101, 200],
            [201, 300],
            [301, 400],
            [401, 500],
          ]
        : [
            [0, 50],
            [51, 100],
            [101, 150],
            [151, 200],
            [201, 300],
            [301, 500],
          ];
    const idx = Math.max(0, Math.min(5, aqiResult.category.tier - 1));
    const [low, high] = ranges[idx];
    const within = Math.max(0, Math.min(1, (val - low) / Math.max(1, high - low)));
    return Math.min(99, Math.max(1, ((idx + within) / 6) * 100));
  })();

  return (
    <div className="space-y-6">
      {report.isDemo && (
        <div
          role="status"
          className="rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 text-sm text-amber-900 dark:text-amber-200 flex items-start gap-3"
        >
          <AlertTriangle className="h-5 w-5 text-[#F59E0B] shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">DEMO MODE ACTIVE: </span>
            <span>{report.notice}</span>
          </div>
        </div>
      )}

      {/* Welcome Banner & Primary Action */}
      <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-medium text-[#16A34A] dark:text-emerald-400">
            Welcome back{preferences.displayName ? `, ${preferences.displayName}` : ''} ·{' '}
            {preferences.lifestyle}
          </p>
          <h2 className="font-display text-2xl font-bold text-[#0F172A] dark:text-white tracking-tight">
            {report.location.name}
            {report.location.region ? `, ${report.location.region}` : ''}
            {report.location.country ? `, ${report.location.country}` : ''}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            Source: {report.dataSource} · Updated{' '}
            {new Date(report.lastUpdated).toLocaleString()} · Standard: {aqiResult.standardLabel}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('live-aqi')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
          >
            <MapPin className="h-4 w-4 text-[#16A34A]" />
            <span>Change Location</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('ai-assistant')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#16A34A] hover:bg-[#14532D] text-white text-sm font-semibold transition-colors whitespace-nowrap"
          >
            <MessageSquareText className="h-4 w-4" />
            <span>Ask AirAware Assistant</span>
          </button>
        </div>
      </section>

      {/* Main AQI Score + Personalized Daily Recommendation + Weather */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <section className="xl:col-span-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between gap-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Current Air Quality ({aqiResult.standardLabel})
              </p>
              <div className="mt-2 flex items-baseline gap-3">
                <span
                  data-testid="dashboard-aqi-value"
                  className="font-mono text-5xl font-bold tracking-tight tabular-nums"
                  style={{ color: aqiResult.category.colorHex }}
                >
                  {aqiResult.aqi ?? '—'}
                </span>
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  {aqiResult.dominantPollutant
                    ? `Main pollutant: ${aqiResult.dominantPollutant}`
                    : 'No pollutant data'}
                </span>
              </div>
              <p
                className="mt-2 text-lg font-display font-bold"
                style={{ color: aqiResult.category.colorHex }}
              >
                {aqiResult.category.label}
              </p>
            </div>
          </div>

          {/* Pollution Level Indicator Scale */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Pollution Level Indicator (0–500)</span>
              <span className="font-mono tabular-nums">{aqiResult.aqi ?? 'N/A'}</span>
            </div>
            <div className="relative h-3 w-full rounded-full overflow-hidden flex bg-slate-100 dark:bg-slate-800">
              {scaleSegments.map((seg) => (
                <div
                  key={seg.label}
                  style={{ backgroundColor: seg.color }}
                  className="flex-1 h-full opacity-90"
                  title={`${seg.label} (${seg.range})`}
                />
              ))}
              {aqiResult.aqi !== null && (
                <div
                  aria-hidden="true"
                  className="absolute top-0 bottom-0 w-1.5 bg-[#0F172A] dark:bg-white ring-2 ring-white dark:ring-slate-900 rounded-full"
                  style={{ left: `calc(${aqiPercent}% - 3px)` }}
                />
              )}
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 text-[11px] leading-tight text-slate-500 dark:text-slate-400 pt-0.5">
              {scaleSegments.map((seg) => (
                <div key={seg.label}>
                  <div className="font-medium text-slate-700 dark:text-slate-300">{seg.label}</div>
                  <div className="font-mono text-[10px]">{seg.range}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Weather Strip */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Thermometer className="h-4 w-4 text-slate-400 shrink-0" />
              <div>
                <div className="text-slate-500 dark:text-slate-400">Temp</div>
                <div className="font-mono font-semibold text-[#0F172A] dark:text-white tabular-nums">
                  {report.weather.temperatureC !== null ? `${report.weather.temperatureC}°C` : 'N/A'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Droplets className="h-4 w-4 text-slate-400 shrink-0" />
              <div>
                <div className="text-slate-500 dark:text-slate-400">Humidity</div>
                <div className="font-mono font-semibold text-[#0F172A] dark:text-white tabular-nums">
                  {report.weather.humidityPercent !== null ? `${report.weather.humidityPercent}%` : 'N/A'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Wind className="h-4 w-4 text-slate-400 shrink-0" />
              <div>
                <div className="text-slate-500 dark:text-slate-400">Wind</div>
                <div className="font-mono font-semibold text-[#0F172A] dark:text-white tabular-nums">
                  {report.weather.windSpeedKmh !== null ? `${report.weather.windSpeedKmh} km/h` : 'N/A'}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <CloudSun className="h-4 w-4 text-[#16A34A]" />
            <span>Weather conditions: {report.weather.condition}</span>
          </div>
        </section>

        {/* Pollutant Grid + Personalized Daily Recommendation */}
        <div className="xl:col-span-7 flex flex-col gap-6">
          <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h3 className="font-display text-base font-bold text-[#0F172A] dark:text-white">
                Measured Pollutant Concentrations
              </h3>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Sub-indices computed under {aqiResult.standardLabel}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {pollutantCards.map((p) => (
                <div
                  key={p.key}
                  className="p-3.5 rounded-lg bg-[#F8FAFC] dark:bg-slate-800/70"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#0F172A] dark:text-white">{p.key}</span>
                    <span className="text-slate-500 dark:text-slate-400">{p.note}</span>
                  </div>
                  <div className="mt-2 font-mono text-2xl font-bold text-[#0F172A] dark:text-white tabular-nums">
                    {p.value !== null ? p.value : 'N/A'}
                    <span className="ml-1 text-xs font-normal text-slate-500 dark:text-slate-400">
                      {p.value !== null ? p.unit : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between gap-4">
            <div>
              <h3 className="font-display text-base font-bold text-[#0F172A] dark:text-white">
                Personalized Daily Safety Recommendation
              </h3>
              <p className="mt-2 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {aqiResult.category.advisory}
              </p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {personalizedNote}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => onNavigate('daily-routine')}
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#16A34A] hover:text-[#14532D] dark:text-emerald-400"
              >
                <CalendarClock className="h-4 w-4" />
                <span>Build AI Daily Routine</span>
                <ArrowRight className="h-4 w-4" />
              </button>
              <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">|</span>
              <button
                type="button"
                onClick={() => onNavigate('family-protection')}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-[#0F172A] dark:hover:text-white"
              >
                <span>View Family Precautions</span>
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* Interactive AQI History Chart */}
      <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div>
            <h3 className="font-display text-base font-bold text-[#0F172A] dark:text-white">
              AQI & PM2.5 Trend ({aqiResult.standardLabel})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {historyRange === 'daily'
                ? 'Last 24 hours hourly trend for selected location'
                : 'Past 7 days daily average trend for selected location'}
            </p>
          </div>

          <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800 self-start">
            <button
              type="button"
              onClick={() => setHistoryRange('daily')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                historyRange === 'daily'
                  ? 'bg-white dark:bg-slate-900 text-[#0F172A] dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white'
              }`}
            >
              24-Hour View
            </button>
            <button
              type="button"
              onClick={() => setHistoryRange('weekly')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                historyRange === 'weekly'
                  ? 'bg-white dark:bg-slate-900 text-[#0F172A] dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white'
              }`}
            >
              7-Day View
            </button>
          </div>
        </div>

        {chartData.length > 0 ? (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 16, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="aqiGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16A34A" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#16A34A" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" className="dark:opacity-20" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  interval={historyRange === 'daily' ? 3 : 0}
                />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#F8FAFC',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="aqi"
                  name={aqiResult.standardLabel}
                  stroke="#16A34A"
                  strokeWidth={2.5}
                  fill="url(#aqiGradient)"
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="pm25"
                  name="PM2.5 (µg/m³)"
                  stroke="#F59E0B"
                  strokeWidth={1.75}
                  fillOpacity={0}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
            Historical trend data is unavailable for this station.
          </div>
        )}
      </section>
    </div>
  );
}
