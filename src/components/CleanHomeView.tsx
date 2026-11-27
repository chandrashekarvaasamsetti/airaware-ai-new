import { CheckCircle2, Circle, Home, Info } from 'lucide-react';
import { useState } from 'react';
import {
  BUDGET_HOME_SOLUTIONS,
  HOME_CHECKLIST_ITEMS,
  ROOM_RECOMMENDATIONS,
} from '../data/knowledgeBase';

interface CleanHomeViewProps {
  completedChecklistIds: string[];
  onToggleChecklistItem: (id: string) => void;
}

export function CleanHomeView({
  completedChecklistIds,
  onToggleChecklistItem,
}: CleanHomeViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [imgError, setImgError] = useState(false);

  const categories = ['All', 'Ventilation', 'Filtration', 'Source Control', 'Maintenance'];
  const filteredItems =
    selectedCategory === 'All'
      ? HOME_CHECKLIST_ITEMS
      : HOME_CHECKLIST_ITEMS.filter((item) => item.category === selectedCategory);

  const completionPct = Math.round(
    (completedChecklistIds.length / HOME_CHECKLIST_ITEMS.length) * 100
  );

  return (
    <div className="space-y-6">
      {/* Editorial Hero Split */}
      <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch">
        <div className="lg:col-span-7 p-6 lg:p-8 flex flex-col justify-center space-y-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-[#16A34A] dark:text-emerald-400">
              Clean Air at Home
            </p>
            <h2 className="font-display text-2xl font-bold text-[#0F172A] dark:text-white tracking-tight">
              Reduce Indoor PM2.5, Cooking Smoke & Winter Smog Infiltration
            </h2>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            During high-pollution winter days, indoor air quality depends on three pillars: keeping
            smog out during peak traffic/inversion hours, eliminating indoor combustion (smoke,
            incense, unvented frying), and filtering bedrooms with properly sized HEPA systems.
          </p>
          <div className="p-3.5 rounded-lg bg-[#F8FAFC] dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300">
            <Info className="h-4 w-4 text-[#16A34A] shrink-0 mt-0.5" />
            <span>
              <strong>Evidence Note:</strong> Ordinary indoor houseplants add calm greenery, but
              controlled chamber studies show they cannot replace mechanical HEPA air purifiers or
              exhaust ventilation for removing airborne particles.
            </span>
          </div>
        </div>

        <div className="lg:col-span-5 min-h-[220px] bg-slate-100 dark:bg-slate-800">
          {!imgError ? (
            <img
              src="/src/assets/images/clean_home_ventilation_1795776465438.jpg"
              alt="Sunlit minimalist living room with a white HEPA air purifier near a tall window"
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-slate-500">
              <Home className="h-10 w-10 text-[#16A34A] mb-2" />
              <span className="text-xs font-medium">Indoor Filtration & Ventilation Guide</span>
            </div>
          )}
        </div>
      </section>

      {/* Interactive Indoor Checklist */}
      <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="font-display text-lg font-bold text-[#0F172A] dark:text-white">
              Indoor Air Quality Action Checklist
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums mt-0.5">
              {completedChecklistIds.length} of {HOME_CHECKLIST_ITEMS.length} safeguards active ({completionPct}%)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-white dark:bg-slate-900 text-[#0F172A] dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-[#16A34A] transition-all duration-300"
            style={{ width: `${completionPct}%` }}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredItems.map((item) => {
            const done = completedChecklistIds.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onToggleChecklistItem(item.id)}
                aria-pressed={done}
                className={`text-left p-4 rounded-xl border transition-colors flex items-start gap-3 ${
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
                <div className="space-y-1">
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {item.category} · Est. Cost: {item.costEstimate}
                  </div>
                  <div className="text-sm font-semibold text-[#0F172A] dark:text-white">
                    {item.title}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {item.detail}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Room-wise Recommendations & Budget-friendly Solutions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-7 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <h3 className="font-display text-base font-bold text-[#0F172A] dark:text-white">
            Room-Wise Indoor Air Guide
          </h3>
          <div className="space-y-4">
            {ROOM_RECOMMENDATIONS.map((room) => (
              <div
                key={room.room}
                className="p-4 rounded-lg bg-[#F8FAFC] dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-display text-sm font-bold text-[#0F172A] dark:text-white">
                    {room.room}
                  </h4>
                  <span className="text-xs font-medium text-[#16A34A] dark:text-emerald-400">
                    {room.priority}
                  </span>
                </div>
                <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 list-disc pl-4">
                  {room.guidance.map((g, idx) => (
                    <li key={idx}>{g}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="lg:col-span-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <h3 className="font-display text-base font-bold text-[#0F172A] dark:text-white">
            Budget-Friendly Solutions & Estimated Costs
          </h3>
          <div className="space-y-3">
            {BUDGET_HOME_SOLUTIONS.map((sol) => (
              <div
                key={sol.title}
                className="p-4 rounded-lg bg-[#F8FAFC] dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold text-[#0F172A] dark:text-white">
                    {sol.title}
                  </h4>
                  <span className="font-mono text-xs font-semibold text-[#16A34A] shrink-0">
                    {sol.cost}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {sol.description}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
