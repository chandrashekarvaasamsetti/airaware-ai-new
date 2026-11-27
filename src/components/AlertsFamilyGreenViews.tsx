import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Circle,
  Info,
  Leaf,
  ShieldCheck,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { GO_GREEN_CHALLENGES } from '../data/knowledgeBase';
import type { AirQualityReport, UserPreferences } from '../types/airaware';
import { calculateAqi, evaluatePollutionAlerts } from '../utils/aqi';

/* ---------------- 1. POLLUTION ALERTS VIEW ---------------- */

interface PollutionAlertsViewProps {
  report: AirQualityReport | null;
  preferences: UserPreferences;
  onUpdatePreferences: (updater: (prev: UserPreferences) => UserPreferences) => void;
}

export function PollutionAlertsView({
  report,
  preferences,
  onUpdatePreferences,
}: PollutionAlertsViewProps) {
  const [notificationNote, setNotificationNote] = useState<string | null>(null);

  const aqiResult = report ? calculateAqi(report.pollutants, preferences.aqiStandard) : null;

  const alerts = useMemo(() => {
    if (!report || !aqiResult) return [];
    const prevPoints = report.hourlyHistory
      .map((h) =>
        calculateAqi(
          { pm25: h.pm25, pm10: h.pm10, no2: h.no2, so2: null, co: null, o3: h.o3 },
          preferences.aqiStandard
        ).aqi
      )
      .filter((v): v is number => v !== null);

    return evaluatePollutionAlerts({
      currentAqi: aqiResult.aqi,
      dominantPollutant: aqiResult.dominantPollutant,
      standard: preferences.aqiStandard,
      locationName: report.location.name,
      timestamp: report.lastUpdated,
      alertThreshold: preferences.alertThreshold,
      previousAqiPoints: prevPoints,
    });
  }, [report, aqiResult, preferences.aqiStandard, preferences.alertThreshold]);

  const handleBrowserAlertsToggle = async () => {
    if (preferences.browserAlertsEnabled) {
      onUpdatePreferences((prev) => ({ ...prev, browserAlertsEnabled: false }));
      setNotificationNote('In-app alerts remain active; browser desktop notifications paused.');
      return;
    }

    if (typeof Notification === 'undefined' || typeof Notification.requestPermission !== 'function') {
      setNotificationNote(
        'Push notifications are not available in this browser. Using reliable in-app alerts instead.'
      );
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        onUpdatePreferences((prev) => ({ ...prev, browserAlertsEnabled: true }));
        setNotificationNote('Browser notifications enabled alongside in-app alerts.');
      } else {
        setNotificationNote(
          'Browser push permission was not granted. AirAware AI will continue showing alerts in-app.'
        );
      }
    } catch {
      setNotificationNote('Using in-app alert center (push service not configured).');
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-bold text-[#0F172A] dark:text-white">
              Smart Pollution Alert Center
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Monitors Unhealthy, Very Unhealthy, Hazardous levels, rapid hourly spikes, and your
              custom threshold.
            </p>
          </div>
          <button
            type="button"
            onClick={handleBrowserAlertsToggle}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-[#0F172A] dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors self-start"
          >
            <Bell className="h-3.5 w-3.5 text-[#16A34A]" />
            <span>
              {preferences.browserAlertsEnabled
                ? 'Desktop Alerts Enabled'
                : 'Enable Desktop Notifications'}
            </span>
          </button>
        </div>

        <div className="p-4 rounded-lg bg-[#F8FAFC] dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <label htmlFor="alert-threshold-range" className="text-sm font-semibold text-[#0F172A] dark:text-white">
              Custom AQI Alert Threshold ({aqiResult?.standardLabel ?? 'US EPA AQI'}):{' '}
              <span className="font-mono text-[#16A34A]">{preferences.alertThreshold}</span>
            </label>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Trigger an alert whenever AQI in {report?.location.name ?? 'your city'} reaches or
              exceeds this level.
            </p>
          </div>
          <input
            id="alert-threshold-range"
            type="range"
            min={50}
            max={300}
            step={10}
            value={preferences.alertThreshold}
            onChange={(e) =>
              onUpdatePreferences((prev) => ({
                ...prev,
                alertThreshold: Number(e.target.value),
              }))
            }
            className="w-full sm:w-56 accent-[#16A34A]"
          />
        </div>

        <div className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Info className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
          <span>
            {notificationNote ??
              'In-app alerts are active whenever you open AirAware AI. Background Web Push notifications require server push subscription setup, so in-app alerts serve as the primary alert feed.'}
          </span>
        </div>
      </section>

      {alerts.length > 0 ? (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <article
              key={alert.id}
              className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="h-5 w-5 shrink-0" style={{ color: alert.colorHex }} />
                  <h3 className="font-display text-base font-bold text-[#0F172A] dark:text-white">
                    {alert.title}
                  </h3>
                </div>
                <span
                  className="font-mono text-sm font-bold tabular-nums"
                  style={{ color: alert.colorHex }}
                >
                  AQI {alert.aqiValue} · {alert.levelLabel}
                </span>
              </div>

              <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                Location: {alert.locationName} · Main Pollutant: {alert.mainPollutant} · Time:{' '}
                {new Date(alert.timestamp).toLocaleString()}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800 text-sm">
                <div>
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Recommended Precaution
                  </div>
                  <p className="text-slate-700 dark:text-slate-300">{alert.precaution}</p>
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Suggested Alternative Activity
                  </div>
                  <p className="text-slate-700 dark:text-slate-300">{alert.alternativeActivity}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 text-center space-y-2">
          <CheckCircle2 className="h-10 w-10 text-[#16A34A] mx-auto" />
          <h3 className="font-display text-base font-bold text-[#0F172A] dark:text-white">
            No Active Pollution Alerts Above Threshold ({preferences.alertThreshold})
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            Current AQI in {report?.location.name ?? 'your city'} is{' '}
            {aqiResult?.aqi ?? 'unavailable'}. Lower the threshold above if you want earlier
            precautionary notices for sensitive household members.
          </p>
        </section>
      )}
    </div>
  );
}

/* ---------------- 2. FAMILY PROTECTION VIEW ---------------- */

interface FamilyProtectionViewProps {
  report: AirQualityReport | null;
  preferences: UserPreferences;
}

type FamilyGroup = 'children' | 'adults' | 'older_adults' | 'sensitive';

const FAMILY_GUIDANCE: Record<
  FamilyGroup,
  {
    title: string;
    subtitle: string;
    generalPrecautions: string[];
    highAqiActions: string[];
    maskAndIndoorNote: string;
  }
> = {
  children: {
    title: 'Children & School-Age Youth',
    subtitle: 'Developing lungs breathe faster per kilogram of body weight.',
    generalPrecautions: [
      'Prefer tree-lined parks or quiet residential lanes over traffic-heavy roadside play.',
      'Coordinate with schools to shift morning outdoor P.E. toward midday when winter inversions lift.',
      'Encourage children to wash hands and face after outdoor play during dusty days.',
    ],
    highAqiActions: [
      'Move active running and sports indoors when AQI enters Sensitive or Unhealthy tiers.',
      'Keep bedroom doors closed with a properly sized HEPA purifier running overnight.',
      'Watch for coughing or unusual fatigue and consult a pediatrician if symptoms arise.',
    ],
    maskAndIndoorNote:
      'Use child-sized respirators (N95/KF94/FFP2) only when older children can wear them comfortably without restricting breathing.',
  },
  adults: {
    title: 'Working Adults & Commuters',
    subtitle: 'Balancing daily work commutes, exercise, and errands safely.',
    generalPrecautions: [
      'Check Live AQI before morning runs; during winter haze, midday or indoor workouts reduce inhaled particulate dose.',
      'Set car air-conditioning to recirculation mode when driving in dense traffic or tunnels.',
      'Choose quieter parallel streets when walking or cycling to cut roadside exhaust exposure.',
    ],
    highAqiActions: [
      'Swap high-intensity outdoor cardio for indoor strength, yoga, or stationary workouts.',
      'Wear a snug-fitting N95/FFP2 mask on crowded outdoor commutes or dusty construction corridors.',
      'Stay well hydrated and close office/home windows facing major roads during rush hour.',
    ],
    maskAndIndoorNote:
      'Standard cloth or loose surgical masks provide very limited protection against fine PM2.5 compared to certified N95/FFP2 masks.',
  },
  older_adults: {
    title: 'Older Adults (60+)',
    subtitle: 'Extra care for cardiovascular and respiratory resilience.',
    generalPrecautions: [
      'Schedule social walks and errands during mid-morning or afternoon when sunlight improves air mixing.',
      'Avoid early-morning outdoor walks on cold, hazy winter days.',
      'Keep indoor rooms free of incense, smoke, and high-heat frying fumes.',
    ],
    highAqiActions: [
      'Stay indoors in a clean-air room with HEPA filtration during Unhealthy or Poor AQI alerts.',
      'Arrange grocery or pharmacy deliveries instead of midday traffic errands.',
      'Follow your healthcare provider’s existing care plan and contact a clinician promptly if experiencing shortness of breath or chest discomfort.',
    ],
    maskAndIndoorNote:
      'If an older adult experiences discomfort wearing a tight respirator mask, prioritize staying indoors in filtered air rather than prolonged outdoor trips.',
  },
  sensitive: {
    title: 'People More Sensitive to Air Pollution',
    subtitle: 'Individuals with asthma, allergies, heart conditions, or pregnancy.',
    generalPrecautions: [
      'Monitor hourly AQI forecasts and set a lower custom alert threshold (e.g., 80–100) in Pollution Alerts.',
      'Maintain clean indoor bedroom air by running HEPA filtration and sealing window drafts.',
      'Follow official public health advisories from WHO, CPCB, or US EPA AirNow.',
    ],
    highAqiActions: [
      'Strictly avoid strenuous outdoor exertion and smoky environments.',
      'Keep any prescribed rescue inhalers or care plans accessible as directed by your doctor—never alter medications without medical advice.',
      'Seek prompt medical attention if breathing symptoms worsen.',
    ],
    maskAndIndoorNote:
      'AirAware AI provides general exposure-reduction guidance only and never diagnoses conditions or recommends medication changes.',
  },
};

export function FamilyProtectionView({ report, preferences }: FamilyProtectionViewProps) {
  const [activeGroup, setActiveGroup] = useState<FamilyGroup>('children');
  const aqiResult = report ? calculateAqi(report.pollutants, preferences.aqiStandard) : null;
  const isElevated = (aqiResult?.aqi ?? 0) > 100;
  const guide = FAMILY_GUIDANCE[activeGroup];

  return (
    <div className="space-y-6">
      <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-[#16A34A] dark:text-emerald-400">
              Protect My Family
            </p>
            <h2 className="font-display text-lg font-bold text-[#0F172A] dark:text-white mt-0.5">
              Household Precautionary Guidance by Age & Sensitivity
            </h2>
          </div>
          {aqiResult && (
            <div className="text-xs font-mono text-slate-600 dark:text-slate-300">
              {report?.location.name}:{' '}
              <span className="font-bold" style={{ color: aqiResult.category.colorHex }}>
                {aqiResult.aqi ?? 'N/A'} ({aqiResult.category.label})
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
          {(
            [
              ['children', 'Children'],
              ['adults', 'Adults'],
              ['older_adults', 'Older Adults'],
              ['sensitive', 'Sensitive Groups'],
            ] as Array<[FamilyGroup, string]>
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveGroup(id)}
              className={`px-4 py-2 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                activeGroup === id
                  ? 'bg-white dark:bg-slate-900 text-[#0F172A] dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="h-6 w-6 text-[#16A34A] shrink-0 mt-0.5" />
          <div>
            <h3 className="font-display text-lg font-bold text-[#0F172A] dark:text-white">
              {guide.title}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">{guide.subtitle}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="p-4 rounded-lg bg-[#F8FAFC] dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2.5">
            <h4 className="font-display text-sm font-bold text-[#0F172A] dark:text-white">
              Everyday Exposure Reduction
            </h4>
            <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300 list-disc pl-4">
              {guide.generalPrecautions.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>

          <div
            className={`p-4 rounded-lg border space-y-2.5 ${
              isElevated
                ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800'
                : 'bg-[#F8FAFC] dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
            }`}
          >
            <h4 className="font-display text-sm font-bold text-[#0F172A] dark:text-white">
              {isElevated ? 'Active Today: High-AQI Precautions' : 'When AQI Rises Above 100'}
            </h4>
            <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300 list-disc pl-4">
              {guide.highAqiActions.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          <strong>Public Health & Mask Note:</strong> {guide.maskAndIndoorNote}
        </div>
      </section>
    </div>
  );
}

/* ---------------- 3. GO GREEN VIEW ---------------- */

interface GoGreenViewProps {
  completedChallengeIds: string[];
  onToggleChallenge: (id: string) => void;
}

export function GoGreenView({ completedChallengeIds, onToggleChallenge }: GoGreenViewProps) {
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const categories = ['All', 'Transport', 'Energy', 'Waste', 'Community'];

  const filtered =
    categoryFilter === 'All'
      ? GO_GREEN_CHALLENGES
      : GO_GREEN_CHALLENGES.filter((c) => c.category === categoryFilter);

  const pct = Math.round((completedChallengeIds.length / GO_GREEN_CHALLENGES.length) * 100);

  return (
    <div className="space-y-6">
      <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <Leaf className="h-6 w-6 text-[#16A34A] shrink-0 mt-0.5" />
            <div>
              <h2 className="font-display text-lg font-bold text-[#0F172A] dark:text-white">
                Go Green — Daily Sustainable Challenges
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono tabular-nums">
                {completedChallengeIds.length} of {GO_GREEN_CHALLENGES.length} completed today ({pct}%)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  categoryFilter === cat
                    ? 'bg-white dark:bg-slate-900 text-[#0F172A] dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-[#16A34A] transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {filtered.map((ch) => {
            const done = completedChallengeIds.includes(ch.id);
            return (
              <button
                key={ch.id}
                type="button"
                onClick={() => onToggleChallenge(ch.id)}
                aria-pressed={done}
                className={`text-left p-5 rounded-xl border transition-colors flex items-start gap-3.5 ${
                  done
                    ? 'border-[#16A34A] bg-emerald-50/50 dark:bg-emerald-950/30'
                    : 'border-slate-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                {done ? (
                  <CheckCircle2 className="h-5 w-5 text-[#16A34A] shrink-0 mt-0.5" />
                ) : (
                  <Circle className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1.5">
                  <div className="text-xs font-medium text-[#16A34A] dark:text-emerald-400">
                    {ch.category} · {done ? 'Completed' : 'Tap to complete'}
                  </div>
                  <h3 className="text-sm font-semibold text-[#0F172A] dark:text-white">
                    {ch.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300">{ch.impactNote}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Benefit: {ch.benefitSummary}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
