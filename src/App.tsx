import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AiAssistantView } from './components/AiAssistantView';
import {
  FamilyProtectionView,
  GoGreenView,
  PollutionAlertsView,
} from './components/AlertsFamilyGreenViews';
import { CleanHomeView } from './components/CleanHomeView';
import { DailyRoutineView } from './components/DailyRoutineView';
import { DashboardView } from './components/DashboardView';
import { EcoCalculatorView } from './components/EcoCalculatorView';
import {
  CommunityView,
  EducationCenterView,
  MyProgressView,
  SettingsView,
} from './components/EducationCommunityProgressSettingsViews';
import { LiveAqiView } from './components/LiveAqiView';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { DEFAULT_LOCATION } from './data/demoData';
import { COMMUNITY_DEMO_TIPS } from './data/knowledgeBase';
import { usePersistentState } from './hooks/usePersistentState';
import type {
  AirQualityReport,
  CommunityTip,
  EcoTripLog,
  LocationInfo,
  NavSection,
  SavedDailyPlan,
  UserPreferences,
} from './types/airaware';
import { calculateAqi, evaluatePollutionAlerts } from './utils/aqi';

const DEFAULT_PREFERENCES: UserPreferences = {
  displayName: '',
  lifestyle: 'Working Professional',
  wakeUpTime: '07:00',
  outdoorPreference: 'Morning walk or light jogging',
  primaryTransport: 'public_bus',
  householdPreference: 'Bedroom HEPA purifier and kitchen exhaust fan',
  sensitiveConsiderations: {
    children: false,
    olderAdults: false,
    respiratorySensitivity: false,
  },
  aqiStandard: 'US_AQI',
  alertThreshold: 120,
  browserAlertsEnabled: false,
  theme: 'light',
};

export default function App() {
  const [activeSection, setActiveSection] = useState<NavSection>('dashboard');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [preferences, setPreferences] = usePersistentState<UserPreferences>(
    'airaware:preferences:v1',
    DEFAULT_PREFERENCES
  );
  const [selectedLocation, setSelectedLocation] = usePersistentState<LocationInfo>(
    'airaware:location:v1',
    DEFAULT_LOCATION
  );
  const [savedPlan, setSavedPlan] = usePersistentState<SavedDailyPlan | null>(
    'airaware:savedPlan:v1',
    null
  );
  const [completedHomeIds, setCompletedHomeIds] = usePersistentState<string[]>(
    'airaware:homeChecklist:v1',
    ['home-no-smoke']
  );
  const [completedChallengeIds, setCompletedChallengeIds] = usePersistentState<string[]>(
    'airaware:goGreenChallenges:v1',
    []
  );
  const [tripLogs, setTripLogs] = usePersistentState<EcoTripLog[]>('airaware:tripLogs:v1', []);
  const [userTips, setUserTips] = usePersistentState<CommunityTip[]>('airaware:communityTips:v1', []);
  const [likedTipIds, setLikedTipIds] = usePersistentState<string[]>('airaware:likedTips:v1', []);
  const [joinedCampaignIds, setJoinedCampaignIds] = usePersistentState<string[]>(
    'airaware:joinedCampaigns:v1',
    ['camp-no-idle']
  );

  const [report, setReport] = useState<AirQualityReport | null>(null);
  const [isLoadingAqi, setIsLoadingAqi] = useState(true);
  const [aqiError, setAqiError] = useState<string | null>(null);

  // Sync light/dark class on <html>
  useEffect(() => {
    document.documentElement.classList.toggle('dark', preferences.theme === 'dark');
  }, [preferences.theme]);

  const fetchAirQuality = useCallback(async (loc: LocationInfo) => {
    setIsLoadingAqi(true);
    setAqiError(null);
    try {
      const params = new URLSearchParams({
        lat: String(loc.latitude),
        lon: String(loc.longitude),
        name: loc.name,
        country: loc.country,
        ...(loc.region ? { region: loc.region } : {}),
        _ts: String(Date.now()),
      });
      const res = await fetch(`/api/air-quality?${params.toString()}`, {
        cache: 'no-store',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch air quality data.');
      }
      setReport(data as AirQualityReport);
    } catch (err) {
      setAqiError(err instanceof Error ? err.message : 'Unable to reach air quality server.');
    } finally {
      setIsLoadingAqi(false);
    }
  }, []);

  useEffect(() => {
    fetchAirQuality(selectedLocation);
  }, [selectedLocation, fetchAirQuality]);

  const activeAlertsCount = useMemo(() => {
    if (!report) return 0;
    const calc = calculateAqi(report.pollutants, preferences.aqiStandard);
    const prevPoints = report.hourlyHistory
      .map((h) =>
        calculateAqi(
          { pm25: h.pm25, pm10: h.pm10, no2: h.no2, so2: null, co: null, o3: h.o3 },
          preferences.aqiStandard
        ).aqi
      )
      .filter((v): v is number => v !== null);

    return evaluatePollutionAlerts({
      currentAqi: calc.aqi,
      dominantPollutant: calc.dominantPollutant,
      standard: preferences.aqiStandard,
      locationName: report.location.name,
      timestamp: report.lastUpdated,
      alertThreshold: preferences.alertThreshold,
      previousAqiPoints: prevPoints,
    }).length;
  }, [report, preferences.aqiStandard, preferences.alertThreshold]);

  const handleToggleHomeItem = (id: string) => {
    setCompletedHomeIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleChallenge = (id: string) => {
    setCompletedChallengeIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleLogTrip = (log: EcoTripLog) => {
    setTripLogs((prev) => [log, ...prev]);
  };

  const handleAddCommunityTip = (
    tip: Omit<CommunityTip, 'id' | 'likes' | 'createdAt' | 'isUserSubmitted'>
  ) => {
    const newTip: CommunityTip = {
      ...tip,
      id: `user-tip-${Date.now()}`,
      likes: 0,
      createdAt: new Date().toISOString().slice(0, 10),
      isUserSubmitted: true,
    };
    setUserTips((prev) => [newTip, ...prev]);
  };

  const handleToggleLikeTip = (id: string) => {
    setLikedTipIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleToggleCampaign = (id: string) => {
    setJoinedCampaignIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleClearAllData = () => {
    setPreferences(DEFAULT_PREFERENCES);
    setSelectedLocation(DEFAULT_LOCATION);
    setSavedPlan(null);
    setCompletedHomeIds([]);
    setCompletedChallengeIds([]);
    setTripLogs([]);
    setUserTips([]);
    setLikedTipIds([]);
    setJoinedCampaignIds(['camp-no-idle']);
  };

  const allCommunityTips = useMemo(
    () => [...userTips, ...COMMUNITY_DEMO_TIPS],
    [userTips]
  );

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] dark:bg-[#0B1120] text-[#0F172A] dark:text-slate-100">
      <Sidebar
        activeSection={activeSection}
        onSelect={setActiveSection}
        alertCount={activeAlertsCount}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar
          activeSection={activeSection}
          location={selectedLocation}
          aqiStandard={preferences.aqiStandard}
          isDemo={Boolean(report?.isDemo)}
          isLoading={isLoadingAqi}
          theme={preferences.theme}
          onOpenMobileNav={() => setMobileNavOpen(true)}
          onRefresh={() => fetchAirQuality(selectedLocation)}
          onToggleTheme={() =>
            setPreferences((prev) => ({
              ...prev,
              theme: prev.theme === 'dark' ? 'light' : 'dark',
            }))
          }
          onNavigate={setActiveSection}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1320px] w-full mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            >
              {activeSection === 'dashboard' && (
                <DashboardView
                  report={report}
                  isLoading={isLoadingAqi}
                  error={aqiError}
                  preferences={preferences}
                  onNavigate={setActiveSection}
                />
              )}

              {activeSection === 'live-aqi' && (
                <LiveAqiView
                  report={report}
                  aqiStandard={preferences.aqiStandard}
                  isLoading={isLoadingAqi}
                  onSelectLocation={setSelectedLocation}
                  onRefresh={() => fetchAirQuality(selectedLocation)}
                />
              )}

              {activeSection === 'ai-assistant' && (
                <AiAssistantView
                  report={report}
                  location={selectedLocation}
                  preferences={preferences}
                  isLoadingAqi={isLoadingAqi}
                  onReportUpdate={setReport}
                  onRefreshAqi={() => fetchAirQuality(selectedLocation)}
                />
              )}

              {activeSection === 'daily-routine' && (
                <DailyRoutineView
                  report={report}
                  preferences={preferences}
                  onUpdatePreferences={setPreferences}
                  savedPlan={savedPlan}
                  onSavePlan={setSavedPlan}
                />
              )}

              {activeSection === 'clean-home' && (
                <CleanHomeView
                  completedChecklistIds={completedHomeIds}
                  onToggleChecklistItem={handleToggleHomeItem}
                />
              )}

              {activeSection === 'eco-calculator' && (
                <EcoCalculatorView onLogTrip={handleLogTrip} />
              )}

              {activeSection === 'alerts' && (
                <PollutionAlertsView
                  report={report}
                  preferences={preferences}
                  onUpdatePreferences={setPreferences}
                />
              )}

              {activeSection === 'family-protection' && (
                <FamilyProtectionView report={report} preferences={preferences} />
              )}

              {activeSection === 'go-green' && (
                <GoGreenView
                  completedChallengeIds={completedChallengeIds}
                  onToggleChallenge={handleToggleChallenge}
                />
              )}

              {activeSection === 'education' && <EducationCenterView />}

              {activeSection === 'community' && (
                <CommunityView
                  tips={allCommunityTips}
                  onAddTip={handleAddCommunityTip}
                  onToggleLike={handleToggleLikeTip}
                  likedIds={likedTipIds}
                  joinedCampaignIds={joinedCampaignIds}
                  onToggleCampaign={handleToggleCampaign}
                  defaultCity={selectedLocation.name}
                />
              )}

              {activeSection === 'progress' && (
                <MyProgressView
                  tripLogs={tripLogs}
                  completedChallengeIds={completedChallengeIds}
                  completedHomeChecklistIds={completedHomeIds}
                  report={report}
                  aqiStandard={preferences.aqiStandard}
                />
              )}

              {activeSection === 'settings' && (
                <SettingsView
                  preferences={preferences}
                  onUpdatePreferences={setPreferences}
                  selectedLocation={selectedLocation}
                  onSelectLocation={setSelectedLocation}
                  onClearAllData={handleClearAllData}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
