import {
  Activity,
  Award,
  Bell,
  BookOpen,
  Calculator,
  CalendarClock,
  Home,
  LayoutDashboard,
  Leaf,
  MapPin,
  MessageSquareText,
  Settings,
  ShieldCheck,
  Users,
  Wind,
  X,
} from 'lucide-react';
import type { NavSection } from '../types/airaware';

export interface NavItemConfig {
  id: NavSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

interface SidebarProps {
  activeSection: NavSection;
  onSelect: (section: NavSection) => void;
  alertCount: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({
  activeSection,
  onSelect,
  alertCount,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const navItems: NavItemConfig[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'live-aqi', label: 'Live AQI', icon: MapPin },
    { id: 'ai-assistant', label: 'AI Assistant', icon: MessageSquareText },
    { id: 'daily-routine', label: 'Daily Routine', icon: CalendarClock },
    { id: 'clean-home', label: 'Clean Air at Home', icon: Home },
    { id: 'eco-calculator', label: 'Eco Impact Calculator', icon: Calculator },
    { id: 'alerts', label: 'Pollution Alerts', icon: Bell, badge: alertCount > 0 ? alertCount : undefined },
    { id: 'family-protection', label: 'Family Protection', icon: ShieldCheck },
    { id: 'go-green', label: 'Go Green', icon: Leaf },
    { id: 'education', label: 'Education Center', icon: BookOpen },
    { id: 'community', label: 'Community', icon: Users },
    { id: 'progress', label: 'My Progress', icon: Award },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleNavClick = (id: NavSection) => {
    onSelect(id);
    onCloseMobile();
  };

  const sidebarContent = (
    <div className="flex h-full flex-col bg-[#0F172A] text-slate-100 border-r border-slate-800">
      <div className="flex items-center justify-between px-5 py-5 border-b border-slate-800">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#16A34A] text-white">
            <Wind className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="font-display text-base font-bold tracking-tight text-white whitespace-nowrap">
              AirAware AI
            </div>
            <p className="text-[11px] text-slate-400 leading-tight truncate">
              Breathe Smarter. Live Healthier.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation menu"
          className="lg:hidden rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav aria-label="Main navigation" className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavClick(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16A34A] ${
                isActive
                  ? 'bg-[#16A34A] text-white'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-3 min-w-0">
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </span>
              {item.badge !== undefined && (
                <span
                  className={`font-mono text-xs px-1.5 py-0.5 rounded ${
                    isActive ? 'bg-[#14532D] text-white' : 'bg-[#DC2626] text-white'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="px-4 py-3.5 border-t border-slate-800 text-xs text-slate-400 flex items-center gap-2">
        <Activity className="h-4 w-4 text-[#16A34A] shrink-0" />
        <span className="truncate">Urban Clean-Air Intelligence</span>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block w-64 shrink-0 h-screen sticky top-0">{sidebarContent}</aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative w-72 max-w-[85vw] h-full z-10">{sidebarContent}</aside>
        </div>
      )}
    </>
  );
}
