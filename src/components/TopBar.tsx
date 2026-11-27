import { MapPin, Menu, Moon, RefreshCw, Sun } from 'lucide-react';
import type { AqiStandard, LocationInfo, NavSection } from '../types/airaware';

const SECTION_TITLES: Record<NavSection, string> = {
  dashboard: 'Dashboard',
  'live-aqi': 'Live AQI & Stations',
  'ai-assistant': 'AirAware Assistant',
  'daily-routine': 'Daily Routine Planner',
  'clean-home': 'Clean Air at Home',
  'eco-calculator': 'Eco Impact Calculator',
  alerts: 'Pollution Alerts',
  'family-protection': 'Protect My Family',
  'go-green': 'Go Green',
  education: 'Education Center',
  community: 'Community',
  progress: 'My Progress',
  settings: 'Settings',
};

interface TopBarProps {
  activeSection: NavSection;
  location: LocationInfo;
  aqiStandard: AqiStandard;
  isDemo: boolean;
  isLoading: boolean;
  theme: 'light' | 'dark';
  onOpenMobileNav: () => void;
  onRefresh: () => void;
  onToggleTheme: () => void;
  onNavigate: (section: NavSection) => void;
}

export function TopBar({
  activeSection,
  location,
  aqiStandard,
  isDemo,
  isLoading,
  theme,
  onOpenMobileNav,
  onRefresh,
  onToggleTheme,
  onNavigate,
}: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800">
      <div className="flex items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 h-16">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onOpenMobileNav}
            aria-label="Open navigation menu"
            className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h1 className="font-display text-lg font-bold text-[#0F172A] dark:text-white truncate">
              {SECTION_TITLES[activeSection]}
            </h1>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 truncate">
              <button
                type="button"
                onClick={() => onNavigate('live-aqi')}
                className="inline-flex items-center gap-1 hover:text-[#16A34A] transition-colors truncate"
              >
                <MapPin className="h-3.5 w-3.5 shrink-0 text-[#16A34A]" />
                <span className="truncate">
                  {location.name}, {location.country}
                </span>
              </button>
              <span aria-hidden="true">·</span>
              <span className="whitespace-nowrap">
                {aqiStandard === 'CPCB_INDIA' ? 'CPCB India AQI' : 'US EPA AQI'}
              </span>
              {isDemo && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-semibold text-[#F59E0B] whitespace-nowrap">DEMO DATA</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#16A34A] hover:bg-[#14532D] disabled:opacity-60 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Updating...' : 'Refresh AQI'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
