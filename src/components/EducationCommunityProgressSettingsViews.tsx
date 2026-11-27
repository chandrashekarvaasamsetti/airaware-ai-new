import {
  Award,
  BookOpen,
  ExternalLink,
  Heart,
  Info,
  Search,
  Send,
  Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { POPULAR_CITIES } from '../data/demoData';
import {
  EDUCATION_TOPICS,
  GO_GREEN_CHALLENGES,
  HOME_CHECKLIST_ITEMS,
  VERIFIED_GOVERNMENT_RESOURCES,
} from '../data/knowledgeBase';
import type {
  AirQualityReport,
  AqiStandard,
  CommunityTip,
  EcoTripLog,
  LifestyleType,
  LocationInfo,
  TransportMode,
  UserPreferences,
} from '../types/airaware';
import { calculateAqi } from '../utils/aqi';
import { TRANSPORT_SPECS } from '../utils/ecoCalculator';
import { calculateSustainabilityScore } from '../utils/progressScore';

/* ---------------- 1. EDUCATION CENTER VIEW ---------------- */

export function EducationCenterView() {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return EDUCATION_TOPICS;
    return EDUCATION_TOPICS.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.shortAnswer.toLowerCase().includes(q) ||
        t.details.some((d) => d.toLowerCase().includes(q))
    );
  }, [search]);

  return (
    <div className="space-y-6">
      <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-bold text-[#0F172A] dark:text-white">
            Air Quality Education Center
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Plain-language science on AQI scales, PM2.5 vs. PM10, winter temperature inversions, and
            climate vs. air quality.
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <label htmlFor="edu-search" className="sr-only">
            Filter educational topics
          </label>
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="edu-search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter topics (e.g., PM2.5, smog)..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-[#0F172A] dark:text-white"
          />
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filtered.map((topic) => (
          <article
            key={topic.id}
            className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col"
          >
            {topic.imageUrl && (
              <div className="h-52 w-full bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800">
                <img
                  src={topic.imageUrl}
                  alt={topic.imageAlt || topic.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="p-6 space-y-3 flex-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#16A34A] dark:text-emerald-400">
                <BookOpen className="h-3.5 w-3.5" />
                <span>Air Science Guide</span>
              </div>
              <h3 className="font-display text-base font-bold text-[#0F172A] dark:text-white">
                {topic.title}
              </h3>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                {topic.shortAnswer}
              </p>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed list-disc pl-4">
                {topic.details.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

/* ---------------- 2. COMMUNITY AWARENESS VIEW ---------------- */

interface CommunityViewProps {
  tips: CommunityTip[];
  onAddTip: (tip: Omit<CommunityTip, 'id' | 'likes' | 'createdAt' | 'isUserSubmitted'>) => void;
  onToggleLike: (id: string) => void;
  likedIds: string[];
  joinedCampaignIds: string[];
  onToggleCampaign: (id: string) => void;
  defaultCity: string;
}

export function CommunityView({
  tips,
  onAddTip,
  onToggleLike,
  likedIds,
  joinedCampaignIds,
  onToggleCampaign,
  defaultCity,
}: CommunityViewProps) {
  const [filterCat, setFilterCat] = useState<string>('All');
  const [author, setAuthor] = useState('');
  const [city, setCity] = useState(defaultCity);
  const [category, setCategory] = useState<CommunityTip['category']>('Community Action');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      setFormError('Please provide both a tip headline and a brief description.');
      return;
    }
    setFormError(null);
    onAddTip({
      author: (author.trim() || 'Community Member').slice(0, 60),
      city: (city.trim() || defaultCity).slice(0, 80),
      category,
      title: title.trim().slice(0, 120),
      body: body.trim().slice(0, 600),
    });
    setTitle('');
    setBody('');
  };

  const filteredTips =
    filterCat === 'All' ? tips : tips.filter((t) => t.category === filterCat);

  return (
    <div className="space-y-6">
      <div
        role="status"
        className="rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5"
      >
        <Info className="h-4 w-4 text-[#F59E0B] shrink-0 mt-0.5" />
        <span>
          <strong>DEMO COMMUNITY INTERFACE:</strong> Because a public multi-user community backend is
          not connected, posts you add here are stored locally in your browser as a demonstration
          rather than published globally.
        </span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-7 space-y-5">
          {/* Share a Tip Form */}
          <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h2 className="font-display text-base font-bold text-[#0F172A] dark:text-white">
              Share a Clean-Air Tip (Local Demo)
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  maxLength={60}
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Your name (optional)"
                  aria-label="Your name"
                  className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-[#0F172A] dark:text-white"
                />
                <input
                  type="text"
                  maxLength={80}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                  aria-label="City"
                  className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-[#0F172A] dark:text-white"
                />
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as CommunityTip['category'])}
                  aria-label="Tip category"
                  className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-[#0F172A] dark:text-white"
                >
                  <option value="Community Action">Community Action</option>
                  <option value="Home Air">Home Air</option>
                  <option value="Commute">Commute</option>
                  <option value="School & Family">School & Family</option>
                </select>
              </div>
              <input
                type="text"
                maxLength={120}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Tip headline..."
                aria-label="Tip headline"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-[#0F172A] dark:text-white"
              />
              <textarea
                rows={2}
                maxLength={600}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Share a practical local action, commute idea, or clean-air tip..."
                aria-label="Tip details"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-[#0F172A] dark:text-white"
              />
              {formError && <p className="text-xs text-[#DC2626]">{formError}</p>}
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#16A34A] hover:bg-[#14532D] text-white text-xs font-semibold transition-colors"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Add to Demo Feed</span>
              </button>
            </form>
          </section>

          {/* Community Tips List */}
          <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-display text-base font-bold text-[#0F172A] dark:text-white">
                Community Awareness Feed
              </h3>
              <div className="flex flex-wrap gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
                {['All', 'Community Action', 'Home Air', 'Commute', 'School & Family'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setFilterCat(c)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      filterCat === c
                        ? 'bg-white dark:bg-slate-900 text-[#0F172A] dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {filteredTips.map((tip) => {
                const liked = likedIds.includes(tip.id);
                return (
                  <article
                    key={tip.id}
                    className="p-4 rounded-lg bg-[#F8FAFC] dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span>
                        {tip.author} · {tip.city} · {tip.category}
                        {tip.isUserSubmitted ? ' · Saved Locally' : ''}
                      </span>
                      <span className="font-mono">{tip.createdAt}</span>
                    </div>
                    <h4 className="text-sm font-bold text-[#0F172A] dark:text-white">{tip.title}</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {tip.body}
                    </p>
                    <button
                      type="button"
                      onClick={() => onToggleLike(tip.id)}
                      className={`inline-flex items-center gap-1.5 text-xs font-semibold transition-colors ${
                        liked ? 'text-[#DC2626]' : 'text-slate-500 hover:text-[#0F172A] dark:hover:text-white'
                      }`}
                    >
                      <Heart className={`h-3.5 w-3.5 ${liked ? 'fill-current' : ''}`} />
                      <span className="font-mono">{tip.likes + (liked ? 1 : 0)}</span>
                    </button>
                  </article>
                );
              })}
            </div>
          </section>
        </div>

        {/* Campaigns & Verified Government Resources */}
        <aside className="xl:col-span-5 space-y-6">
          <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h3 className="font-display text-base font-bold text-[#0F172A] dark:text-white">
              Clean-Air Campaigns (Demo)
            </h3>
            <div className="space-y-3">
              {[
                {
                  id: 'camp-no-idle',
                  title: 'School Gate No-Idling Pledge',
                  desc: 'Turn off car engines while waiting outside school pickup zones.',
                },
                {
                  id: 'camp-leaf-compost',
                  title: 'Zero Winter Leaf Burning',
                  desc: 'Compost dry garden leaves instead of burning them in neighborhood piles.',
                },
                {
                  id: 'camp-transit-friday',
                  title: 'Clean Commute Fridays',
                  desc: 'Take public transit, carpool, or walk once a week when outdoor air permits.',
                },
              ].map((camp) => {
                const joined = joinedCampaignIds.includes(camp.id);
                return (
                  <div
                    key={camp.id}
                    className="p-3.5 rounded-lg bg-[#F8FAFC] dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="text-sm font-semibold text-[#0F172A] dark:text-white">
                        {camp.title}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{camp.desc}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onToggleCampaign(camp.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-colors ${
                        joined
                          ? 'bg-[#16A34A] text-white'
                          : 'border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      {joined ? 'Joined' : 'Join'}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-3">
            <h3 className="font-display text-base font-bold text-[#0F172A] dark:text-white">
              Verified Public Health & Environmental Resources
            </h3>
            <div className="space-y-3">
              {VERIFIED_GOVERNMENT_RESOURCES.map((res) => (
                <a
                  key={res.url}
                  href={res.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3.5 rounded-lg bg-[#F8FAFC] dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:border-[#16A34A] transition-colors"
                >
                  <div className="flex items-center justify-between gap-2 text-sm font-semibold text-[#16A34A] dark:text-emerald-400">
                    <span>{res.name}</span>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                    {res.description}
                  </p>
                </a>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

/* ---------------- 3. MY PROGRESS ANALYTICS VIEW ---------------- */

interface MyProgressViewProps {
  tripLogs: EcoTripLog[];
  completedChallengeIds: string[];
  completedHomeChecklistIds: string[];
  report: AirQualityReport | null;
  aqiStandard: AqiStandard;
}

export function MyProgressView({
  tripLogs,
  completedChallengeIds,
  completedHomeChecklistIds,
  report,
  aqiStandard,
}: MyProgressViewProps) {
  const totalCo2Avoided = useMemo(
    () => Number(tripLogs.reduce((sum, t) => sum + t.co2AvoidedKg, 0).toFixed(2)),
    [tripLogs]
  );

  const score = useMemo(
    () =>
      calculateSustainabilityScore({
        ecoTripsLoggedCount: tripLogs.length,
        totalCo2AvoidedKg: totalCo2Avoided,
        completedChallengesCount: completedChallengeIds.length,
        totalChallengesAvailable: GO_GREEN_CHALLENGES.length,
        completedHomeChecklistCount: completedHomeChecklistIds.length,
        totalHomeChecklistCount: HOME_CHECKLIST_ITEMS.length,
      }),
    [tripLogs.length, totalCo2Avoided, completedChallengeIds.length, completedHomeChecklistIds.length]
  );

  const modeBreakdown = useMemo(() => {
    const counts = new Map<TransportMode, number>();
    for (const log of tripLogs) {
      counts.set(log.chosenMode, (counts.get(log.chosenMode) ?? 0) + log.trips);
    }
    return Array.from(counts.entries()).map(([mode, count]) => ({
      name: TRANSPORT_SPECS[mode].label.split(' (')[0],
      trips: count,
    }));
  }, [tripLogs]);

  const weeklyAqiBars = useMemo(() => {
    if (!report) return [];
    return report.dailyHistory.map((d) => {
      const val = calculateAqi(
        { pm25: d.pm25, pm10: d.pm10, no2: d.no2, so2: null, co: null, o3: d.o3 },
        aqiStandard
      );
      return { day: d.label.split(',')[0], aqi: val.aqi ?? 0 };
    });
  }, [report, aqiStandard]);

  const PIE_COLORS = ['#16A34A', '#14532D', '#0F172A', '#F59E0B', '#64748B', '#0EA5E9'];

  return (
    <div className="space-y-6">
      {/* Top KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
          <div className="text-xs text-slate-500 dark:text-slate-400">Personal Sustainability Score</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span data-testid="sustainability-score" className="font-mono text-3xl font-bold text-[#16A34A] tabular-nums">
              {score.totalScore}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">/ 100 · {score.tierLabel}</span>
          </div>
        </div>

        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
          <div className="text-xs text-slate-500 dark:text-slate-400">Estimated CO2 Avoided</div>
          <div className="mt-2 font-mono text-3xl font-bold text-[#0F172A] dark:text-white tabular-nums">
            {totalCo2Avoided} <span className="text-sm font-normal text-slate-500">kg</span>
          </div>
        </div>

        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
          <div className="text-xs text-slate-500 dark:text-slate-400">Go Green Challenges Done</div>
          <div className="mt-2 font-mono text-3xl font-bold text-[#0F172A] dark:text-white tabular-nums">
            {completedChallengeIds.length}{' '}
            <span className="text-sm font-normal text-slate-500">/ {GO_GREEN_CHALLENGES.length}</span>
          </div>
        </div>

        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
          <div className="text-xs text-slate-500 dark:text-slate-400">Home Air Checklist</div>
          <div className="mt-2 font-mono text-3xl font-bold text-[#0F172A] dark:text-white tabular-nums">
            {completedHomeChecklistIds.length}{' '}
            <span className="text-sm font-normal text-slate-500">/ {HOME_CHECKLIST_ITEMS.length}</span>
          </div>
        </div>
      </div>

      {/* Score Breakdown + Transparent Rules */}
      <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-[#16A34A]" />
          <h2 className="font-display text-base font-bold text-[#0F172A] dark:text-white">
            Transparent Sustainability Score Breakdown
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Clean Transport & CO2', pts: score.transportPoints, max: 35 },
            { label: 'Go Green Challenges', pts: score.challengePoints, max: 35 },
            { label: 'Clean Air at Home', pts: score.indoorPoints, max: 30 },
          ].map((item) => (
            <div key={item.label} className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold text-[#0F172A] dark:text-slate-200">
                <span>{item.label}</span>
                <span className="font-mono tabular-nums">
                  {item.pts} / {item.max} pts
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-[#16A34A]"
                  style={{ width: `${Math.round((item.pts / item.max) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <ul className="text-xs text-slate-500 dark:text-slate-400 list-disc pl-4 space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800">
          {score.rulesExplanation.map((rule, i) => (
            <li key={i}>{rule}</li>
          ))}
        </ul>
      </section>

      {/* Charts: Transport Choices + Weekly AQI History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
          <h3 className="font-display text-base font-bold text-[#0F172A] dark:text-white mb-4">
            Logged Transportation Choices
          </h3>
          {modeBreakdown.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={modeBreakdown}
                    dataKey="trips"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={68}
                    isAnimationActive={false}
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {modeBreakdown.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-center text-xs text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-700 rounded-lg p-6">
              No commutes logged yet. Use the Eco Impact Calculator to log a trip and track your
              CO2 savings here.
            </div>
          )}
        </section>

        <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
          <h3 className="font-display text-base font-bold text-[#0F172A] dark:text-white mb-4">
            7-Day Local AQI Context ({report?.location.name ?? 'City'})
          </h3>
          {weeklyAqiBars.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyAqiBars} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" className="dark:opacity-20" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                  <Tooltip />
                  <Bar dataKey="aqi" name="Daily Avg AQI" fill="#16A34A" radius={[6, 6, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-xs text-slate-500 dark:text-slate-400">
              Historical AQI data unavailable.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

/* ---------------- 4. SETTINGS VIEW ---------------- */

interface SettingsViewProps {
  preferences: UserPreferences;
  onUpdatePreferences: (updater: (prev: UserPreferences) => UserPreferences) => void;
  selectedLocation: LocationInfo;
  onSelectLocation: (loc: LocationInfo) => void;
  onClearAllData: () => void;
}

export function SettingsView({
  preferences,
  onUpdatePreferences,
  selectedLocation,
  onSelectLocation,
  onClearAllData,
}: SettingsViewProps) {
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div className="max-w-3xl space-y-6">
      <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-5">
        <div>
          <h2 className="font-display text-lg font-bold text-[#0F172A] dark:text-white">
            Profile & Preferences
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            All preferences are saved automatically in your browser.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <label htmlFor="settings-name" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Display Name
            </label>
            <input
              id="settings-name"
              type="text"
              value={preferences.displayName}
              onChange={(e) =>
                onUpdatePreferences((prev) => ({ ...prev, displayName: e.target.value }))
              }
              placeholder="e.g., Aarav"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[#0F172A] dark:text-white"
            />
          </div>

          <div>
            <label htmlFor="settings-lifestyle" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Lifestyle
            </label>
            <select
              id="settings-lifestyle"
              value={preferences.lifestyle}
              onChange={(e) =>
                onUpdatePreferences((prev) => ({
                  ...prev,
                  lifestyle: e.target.value as LifestyleType,
                }))
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[#0F172A] dark:text-white"
            >
              <option value="Student">Student</option>
              <option value="Working Professional">Working Professional</option>
              <option value="Homemaker">Homemaker</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label htmlFor="settings-location" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Quick Default City
            </label>
            <select
              id="settings-location"
              value={selectedLocation.name}
              onChange={(e) => {
                const found = POPULAR_CITIES.find((c) => c.name === e.target.value);
                if (found) onSelectLocation(found);
              }}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[#0F172A] dark:text-white"
            >
              {!POPULAR_CITIES.some((c) => c.name === selectedLocation.name) && (
                <option value={selectedLocation.name}>
                  {selectedLocation.name}, {selectedLocation.country}
                </option>
              )}
              {POPULAR_CITIES.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}, {c.country}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="settings-standard" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              AQI Standard Scale
            </label>
            <select
              id="settings-standard"
              value={preferences.aqiStandard}
              onChange={(e) =>
                onUpdatePreferences((prev) => ({
                  ...prev,
                  aqiStandard: e.target.value as AqiStandard,
                }))
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[#0F172A] dark:text-white"
            >
              <option value="US_AQI">US EPA AQI (0–500)</option>
              <option value="CPCB_INDIA">CPCB India National AQI (0–500)</option>
            </select>
          </div>

          <div>
            <label htmlFor="settings-threshold" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Alert Threshold (AQI)
            </label>
            <input
              id="settings-threshold"
              type="number"
              min={50}
              max={400}
              step={10}
              value={preferences.alertThreshold}
              onChange={(e) => {
                const raw = Number(e.target.value);
                if (Number.isFinite(raw)) {
                  onUpdatePreferences((prev) => ({
                    ...prev,
                    alertThreshold: Math.max(0, Math.min(400, Math.round(raw))),
                  }));
                }
              }}
              onBlur={() =>
                onUpdatePreferences((prev) => ({
                  ...prev,
                  alertThreshold: Math.max(50, Math.min(400, prev.alertThreshold || 120)),
                }))
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-[#0F172A] dark:text-white"
            />
          </div>

          <div>
            <label htmlFor="settings-theme" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Interface Theme
            </label>
            <select
              id="settings-theme"
              value={preferences.theme}
              onChange={(e) =>
                onUpdatePreferences((prev) => ({
                  ...prev,
                  theme: e.target.value as 'light' | 'dark',
                }))
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[#0F172A] dark:text-white"
            >
              <option value="light">Light Mode</option>
              <option value="dark">Dark Mode</option>
            </select>
          </div>
        </div>
      </section>

      <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-display text-base font-bold text-[#0F172A] dark:text-white">
            Clear Saved User Data
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Resets saved routines, checklists, eco-trip logs, community demo posts, and preferences.
          </p>
        </div>

        {!confirmReset ? (
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-300 dark:border-red-800 text-[#DC2626] text-xs font-semibold hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors shrink-0"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Clear User Data</span>
          </button>
        ) : (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setConfirmReset(false)}
              className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onClearAllData();
                setConfirmReset(false);
              }}
              className="px-3 py-2 rounded-lg bg-[#DC2626] text-white text-xs font-semibold"
            >
              Confirm Reset
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
