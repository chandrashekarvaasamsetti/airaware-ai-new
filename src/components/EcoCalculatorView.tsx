import { Check, Info, PlusCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { EcoTripLog, TransportMode } from '../types/airaware';
import { calculateEcoImpact, TRANSPORT_SPECS } from '../utils/ecoCalculator';

interface EcoCalculatorViewProps {
  onLogTrip: (log: EcoTripLog) => void;
}

export function EcoCalculatorView({ onLogTrip }: EcoCalculatorViewProps) {
  const [chosenMode, setChosenMode] = useState<TransportMode>('public_bus');
  const [baselineMode, setBaselineMode] = useState<TransportMode>('personal_car');
  const [distanceKm, setDistanceKm] = useState<number>(12);
  const [trips, setTrips] = useState<number>(10);
  const [fuelPrice, setFuelPrice] = useState<number>(1.2);
  const [loggedFeedback, setLoggedFeedback] = useState(false);

  const result = useMemo(
    () =>
      calculateEcoImpact({
        chosenMode,
        baselineMode,
        distanceKmPerTrip: distanceKm,
        tripsCount: trips,
        fuelPricePerLiter: fuelPrice,
      }),
    [chosenMode, baselineMode, distanceKm, trips, fuelPrice]
  );

  const canLog = result.totalDistanceKm > 0 && trips >= 1;

  const handleLog = () => {
    if (!canLog) return;
    onLogTrip({
      id: `trip-${Date.now()}`,
      date: new Date().toISOString(),
      chosenMode,
      baselineMode,
      distanceKm: result.totalDistanceKm,
      trips: Math.max(1, Math.floor(trips)),
      co2EmittedKg: result.chosenCo2Kg,
      co2AvoidedKg: result.co2AvoidedKg,
      fuelSavedLiters: result.fuelSavedLiters,
    });
    setLoggedFeedback(true);
    setTimeout(() => setLoggedFeedback(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Inputs */}
        <section className="xl:col-span-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <div>
            <p className="text-xs font-semibold text-[#16A34A] dark:text-emerald-400">
              My Green Impact
            </p>
            <h2 className="font-display text-lg font-bold text-[#0F172A] dark:text-white mt-0.5">
              Compare Commute & Transport Choices
            </h2>
          </div>

          <div className="space-y-3.5 text-sm">
            <div>
              <label htmlFor="eco-chosen-mode" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Chosen Transportation Mode
              </label>
              <select
                id="eco-chosen-mode"
                value={chosenMode}
                onChange={(e) => setChosenMode(e.target.value as TransportMode)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-[#0F172A] dark:text-white"
              >
                {(Object.keys(TRANSPORT_SPECS) as TransportMode[]).map((mode) => (
                  <option key={mode} value={mode}>
                    {TRANSPORT_SPECS[mode].label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="eco-baseline-mode" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Compare Against Baseline
              </label>
              <select
                id="eco-baseline-mode"
                value={baselineMode}
                onChange={(e) => setBaselineMode(e.target.value as TransportMode)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-[#0F172A] dark:text-white"
              >
                <option value="personal_car">Personal Car (Petrol/Gasoline)</option>
                <option value="motorcycle">Motorcycle / Scooter</option>
                <option value="public_bus">Public Bus</option>
                <option value="electric_vehicle">Electric Vehicle</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="eco-distance" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Distance per Trip (km)
                </label>
                <input
                  id="eco-distance"
                  type="number"
                  min={0.5}
                  max={1000}
                  step={0.5}
                  value={distanceKm}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setDistanceKm(Number.isFinite(v) ? Math.max(0, Math.min(1000, v)) : 0);
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono text-[#0F172A] dark:text-white"
                />
              </div>

              <div>
                <label htmlFor="eco-trips" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Number of Trips
                </label>
                <input
                  id="eco-trips"
                  type="number"
                  min={1}
                  max={500}
                  step={1}
                  value={trips}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setTrips(Number.isFinite(v) ? Math.max(0, Math.min(500, Math.floor(v))) : 0);
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono text-[#0F172A] dark:text-white"
                />
              </div>
            </div>

            <div>
              <label htmlFor="eco-fuel-price" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Reference Fuel Cost ($ / Liter)
              </label>
              <input
                id="eco-fuel-price"
                type="number"
                min={0.2}
                max={10}
                step={0.05}
                value={fuelPrice}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setFuelPrice(Number.isFinite(v) ? Math.max(0, Math.min(10, v)) : 0);
                }}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono text-[#0F172A] dark:text-white"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleLog}
            disabled={!canLog}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#16A34A] hover:bg-[#14532D] disabled:opacity-50 text-white text-sm font-semibold transition-colors"
          >
            {loggedFeedback ? <Check className="h-4 w-4" /> : <PlusCircle className="h-4 w-4" />}
            <span>{loggedFeedback ? 'Logged to My Progress!' : 'Log This Commute to My Progress'}</span>
          </button>
          {!canLog && (
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Enter a distance above 0 km and at least 1 trip to log this commute.
            </p>
          )}
        </section>

        {/* Results & Chart */}
        <section className="xl:col-span-7 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-[#F8FAFC] dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <div className="text-xs text-slate-500 dark:text-slate-400">CO2 Emitted</div>
              <div
                data-testid="eco-co2-emitted"
                className="mt-1 font-mono text-2xl font-bold text-[#0F172A] dark:text-white tabular-nums"
              >
                {result.chosenCo2Kg} <span className="text-xs font-normal">kg</span>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
              <div className="text-xs text-emerald-700 dark:text-emerald-400">CO2 Avoided</div>
              <div
                data-testid="eco-co2-avoided"
                className="mt-1 font-mono text-2xl font-bold text-[#16A34A] dark:text-emerald-400 tabular-nums"
              >
                {result.co2AvoidedKg} <span className="text-xs font-normal">kg</span>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-[#F8FAFC] dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <div className="text-xs text-slate-500 dark:text-slate-400">Est. Fuel Saved</div>
              <div className="mt-1 font-mono text-2xl font-bold text-[#0F172A] dark:text-white tabular-nums">
                {result.fuelSavedLiters} <span className="text-xs font-normal">L (${result.estimatedFuelCostSaved})</span>
              </div>
            </div>
          </div>

          <p className="text-sm font-medium text-[#0F172A] dark:text-slate-200">
            {result.summaryText}
          </p>

          <div>
            <h3 className="font-display text-sm font-bold text-[#0F172A] dark:text-white mb-3">
              CO2 Emissions Comparison Across All Modes ({result.totalDistanceKm} km total)
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={result.allModesComparison.map((item) => ({
                    ...item,
                    shortLabel:
                      item.mode === 'personal_car'
                        ? 'Car'
                        : item.mode === 'motorcycle'
                        ? 'Motorcycle'
                        : item.mode === 'public_bus'
                        ? 'Public Bus'
                        : item.mode === 'electric_vehicle'
                        ? 'EV'
                        : item.label,
                  }))}
                  margin={{ top: 10, right: 16, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" className="dark:opacity-20" />
                  <XAxis dataKey="shortLabel" interval={0} tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} unit=" kg" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#F8FAFC',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="co2Kg" name="Estimated CO2 (kg)" radius={[6, 6, 0, 0]} isAnimationActive={false}>
                    {result.allModesComparison.map((entry) => (
                      <Cell
                        key={entry.mode}
                        fill={entry.mode === chosenMode ? '#16A34A' : '#94A3B8'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      </div>

      {/* Documented Emission Factors & Scientific Accuracy Note */}
      <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-[#16A34A] shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            <h3 className="font-display text-sm font-bold text-[#0F172A] dark:text-white">
              Emission Factor Assumptions & Important Distinction
            </h3>
            <p>
              <strong>CO2 vs. Local PM2.5:</strong> Lowering CO2 emissions helps slow long-term
              climate change, while local particulate pollution (PM2.5) comes from a mix of
              tailpipe soot, road dust, cooking, heating, and regional weather inversions. Choosing
              cleaner transport does not automatically cause an immediate drop in city-wide PM2.5,
              though reducing tailpipe exhaust directly improves street-level air quality over time.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
          {(Object.keys(TRANSPORT_SPECS) as TransportMode[]).map((mode) => {
            const spec = TRANSPORT_SPECS[mode];
            return (
              <div
                key={mode}
                className="p-3 rounded-lg bg-[#F8FAFC] dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs"
              >
                <div className="font-semibold text-[#0F172A] dark:text-white">{spec.label}</div>
                <div className="font-mono text-[#16A34A] mt-0.5">
                  {spec.co2KgPerKm} kg CO2/km · {spec.fuelLitersPerKm} L/km
                </div>
                <div className="text-slate-500 dark:text-slate-400 mt-1">{spec.sourceNote}</div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
