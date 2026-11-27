import { AlertCircle, BookmarkCheck, RefreshCw, Sparkles } from 'lucide-react';
import { useState } from 'react';
import type {
  AirQualityReport,
  LifestyleType,
  RoutineBlock,
  SavedDailyPlan,
  TransportMode,
  UserPreferences,
} from '../types/airaware';
import { calculateAqi } from '../utils/aqi';

interface DailyRoutineViewProps {
  report: AirQualityReport | null;
  preferences: UserPreferences;
  onUpdatePreferences: (updater: (prev: UserPreferences) => UserPreferences) => void;
  savedPlan: SavedDailyPlan | null;
  onSavePlan: (plan: SavedDailyPlan) => void;
}

export function DailyRoutineView({
  report,
  preferences,
  onUpdatePreferences,
  savedPlan,
  onSavePlan,
}: DailyRoutineViewProps) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftPlan, setDraftPlan] = useState<SavedDailyPlan | null>(savedPlan);
  const [savedConfirmed, setSavedConfirmed] = useState(false);

  const aqiResult = report ? calculateAqi(report.pollutants, preferences.aqiStandard) : null;

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    setSavedConfirmed(false);

    try {
      const res = await fetch('/api/ai/routine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: report?.location ?? null,
          aqiStandard: preferences.aqiStandard,
          profile: {
            location: report?.location.name ?? 'Your City',
            lifestyle: preferences.lifestyle,
            wakeUpTime: preferences.wakeUpTime,
            outdoorPreference: preferences.outdoorPreference,
            primaryTransport: preferences.primaryTransport,
            householdPreference: preferences.householdPreference,
            sensitiveConsiderations: preferences.sensitiveConsiderations,
          },
          airQuality:
            report && aqiResult
              ? {
                  standard: aqiResult.standardLabel,
                  aqi: aqiResult.aqi,
                  category: aqiResult.category.label,
                  dominantPollutant: aqiResult.dominantPollutant,
                  pm25: report.pollutants.pm25,
                  pm10: report.pollutants.pm10,
                  weather: report.weather,
                  isDemo: report.isDemo,
                }
              : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not generate daily routine.');
      }

      const plan: SavedDailyPlan = {
        id: `plan-${Date.now()}`,
        generatedAt: new Date().toISOString(),
        locationName: report?.location.name ?? 'Selected Location',
        aqiValue: aqiResult?.aqi ?? null,
        aqiStandard: preferences.aqiStandard,
        summary: data.summary || 'Personalized clean-air schedule adapted to current conditions.',
        blocks: Array.isArray(data.blocks) ? (data.blocks as RoutineBlock[]) : [],
        isDemo: report?.isDemo,
      };
      setDraftPlan(plan);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error generating routine.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = () => {
    if (!draftPlan) return;
    onSavePlan(draftPlan);
    setSavedConfirmed(true);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
      {/* Routine Input Profile */}
      <section className="xl:col-span-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
        <div>
          <h2 className="font-display text-lg font-bold text-[#0F172A] dark:text-white">
            Routine Preferences
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Adapts dynamically to {report?.location.name ?? 'your city'} (
            {aqiResult ? `${aqiResult.standardLabel}: ${aqiResult.aqi ?? 'N/A'}` : 'Loading'}).
          </p>
        </div>

        <div className="space-y-3 text-sm">
          <div>
            <label htmlFor="routine-lifestyle" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Lifestyle
            </label>
            <select
              id="routine-lifestyle"
              value={preferences.lifestyle}
              onChange={(e) =>
                onUpdatePreferences((prev) => ({
                  ...prev,
                  lifestyle: e.target.value as LifestyleType,
                }))
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-[#0F172A] dark:text-white"
            >
              <option value="Student">Student</option>
              <option value="Working Professional">Working Professional</option>
              <option value="Homemaker">Homemaker</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label htmlFor="routine-wake" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Typical Wake-Up Time
            </label>
            <input
              id="routine-wake"
              type="time"
              value={preferences.wakeUpTime}
              onChange={(e) =>
                onUpdatePreferences((prev) => ({ ...prev, wakeUpTime: e.target.value }))
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-[#0F172A] dark:text-white font-mono"
            />
          </div>

          <div>
            <label htmlFor="routine-outdoor" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Outdoor Activity Preference
            </label>
            <input
              id="routine-outdoor"
              type="text"
              value={preferences.outdoorPreference}
              onChange={(e) =>
                onUpdatePreferences((prev) => ({ ...prev, outdoorPreference: e.target.value }))
              }
              placeholder="e.g., Morning walk, jogging, cycling, playground"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-[#0F172A] dark:text-white"
            />
          </div>

          <div>
            <label htmlFor="routine-transport" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Primary Transportation
            </label>
            <select
              id="routine-transport"
              value={preferences.primaryTransport}
              onChange={(e) =>
                onUpdatePreferences((prev) => ({
                  ...prev,
                  primaryTransport: e.target.value as TransportMode,
                }))
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-[#0F172A] dark:text-white"
            >
              <option value="public_bus">Public Bus / Metro</option>
              <option value="personal_car">Personal Car</option>
              <option value="motorcycle">Motorcycle / Scooter</option>
              <option value="electric_vehicle">Electric Vehicle</option>
              <option value="bicycle">Bicycle</option>
              <option value="walking">Walking</option>
            </select>
          </div>

          <div>
            <label htmlFor="routine-household" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Household Preferences
            </label>
            <input
              id="routine-household"
              type="text"
              value={preferences.householdPreference}
              onChange={(e) =>
                onUpdatePreferences((prev) => ({ ...prev, householdPreference: e.target.value }))
              }
              placeholder="e.g., Bedroom HEPA purifier, gas stove cooking"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-[#0F172A] dark:text-white"
            />
          </div>

          <fieldset className="pt-2 space-y-2">
            <legend className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Optional Household Sensitivities
            </legend>
            <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.sensitiveConsiderations.children}
                onChange={(e) =>
                  onUpdatePreferences((prev) => ({
                    ...prev,
                    sensitiveConsiderations: {
                      ...prev.sensitiveConsiderations,
                      children: e.target.checked,
                    },
                  }))
                }
                className="rounded accent-[#16A34A]"
              />
              <span>Include precautions for children</span>
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.sensitiveConsiderations.olderAdults}
                onChange={(e) =>
                  onUpdatePreferences((prev) => ({
                    ...prev,
                    sensitiveConsiderations: {
                      ...prev.sensitiveConsiderations,
                      olderAdults: e.target.checked,
                    },
                  }))
                }
                className="rounded accent-[#16A34A]"
              />
              <span>Include precautions for older adults</span>
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.sensitiveConsiderations.respiratorySensitivity}
                onChange={(e) =>
                  onUpdatePreferences((prev) => ({
                    ...prev,
                    sensitiveConsiderations: {
                      ...prev.sensitiveConsiderations,
                      respiratorySensitivity: e.target.checked,
                    },
                  }))
                }
                className="rounded accent-[#16A34A]"
              />
              <span>Include extra sensitive-group air precautions</span>
            </label>
          </fieldset>
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#16A34A] hover:bg-[#14532D] disabled:opacity-60 text-white text-sm font-semibold transition-colors"
        >
          <Sparkles className="h-4 w-4" />
          <span>{generating ? 'Generating Plan...' : draftPlan ? 'Regenerate Daily Plan' : 'Generate Daily Plan'}</span>
        </button>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </section>

      {/* Generated Plan Output */}
      <section className="xl:col-span-8 space-y-4">
        {draftPlan ? (
          <>
            <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  {draftPlan.locationName} · Generated {new Date(draftPlan.generatedAt).toLocaleString()}
                  {draftPlan.aqiValue !== null ? ` · AQI ${draftPlan.aqiValue}` : ''}
                </p>
                <h3 className="font-display text-lg font-bold text-[#0F172A] dark:text-white">
                  Your Personalized Clean-Air Schedule
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">{draftPlan.summary}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={generating}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${generating ? 'animate-spin' : ''}`} />
                  <span>Regenerate</span>
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0F172A] dark:bg-[#16A34A] hover:opacity-90 text-white text-xs font-semibold transition-colors"
                >
                  <BookmarkCheck className="h-3.5 w-3.5" />
                  <span>{savedConfirmed ? 'Saved!' : 'Save Plan'}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {draftPlan.blocks.map((block, idx) => (
                <article
                  key={`${block.period}-${idx}`}
                  className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div>
                      <span className="text-xs font-semibold text-[#16A34A] dark:text-emerald-400">
                        {block.period} · {block.timeRange}
                      </span>
                      <h4 className="font-display text-base font-bold text-[#0F172A] dark:text-white mt-0.5">
                        {block.title}
                      </h4>
                    </div>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {block.environment}
                    </span>
                  </div>
                  <ul className="space-y-3">
                    {block.actions.map((act, aIdx) => (
                      <li key={aIdx} className="text-sm">
                        <p className="font-medium text-[#0F172A] dark:text-slate-100">
                          {act.recommendation}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Why: {act.reason}
                        </p>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </>
        ) : (
          <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-10 text-center space-y-3">
            <Sparkles className="h-10 w-10 text-[#16A34A] mx-auto" />
            <h3 className="font-display text-lg font-bold text-[#0F172A] dark:text-white">
              Generate Your Personalized Daily Clean-Air Routine
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto">
              Review your lifestyle, wake-up time, transport mode, and household sensitivities on
              the left, then click Generate Daily Plan to build a custom Morning, Afternoon,
              Evening, and Night schedule tailored to current AQI readings.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
