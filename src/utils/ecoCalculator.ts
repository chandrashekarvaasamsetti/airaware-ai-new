import type { TransportMode } from '../types/airaware';

export interface TransportModeSpec {
  id: TransportMode;
  label: string;
  co2KgPerKm: number;
  fuelLitersPerKm: number;
  sourceNote: string;
}

// Documented emission factors (IPCC / DEFRA / EPA passenger transport averages)
export const TRANSPORT_SPECS: Record<TransportMode, TransportModeSpec> = {
  personal_car: {
    id: 'personal_car',
    label: 'Personal Car (Petrol/Gasoline)',
    co2KgPerKm: 0.192,
    fuelLitersPerKm: 0.075,
    sourceNote: 'Average medium petrol passenger vehicle (~7.5 L/100 km)',
  },
  motorcycle: {
    id: 'motorcycle',
    label: 'Motorcycle / Scooter',
    co2KgPerKm: 0.103,
    fuelLitersPerKm: 0.028,
    sourceNote: 'Average commuter two-wheeler (~2.8 L/100 km)',
  },
  public_bus: {
    id: 'public_bus',
    label: 'Public Bus',
    co2KgPerKm: 0.089,
    fuelLitersPerKm: 0,
    sourceNote: 'Average urban bus per passenger-kilometer',
  },
  electric_vehicle: {
    id: 'electric_vehicle',
    label: 'Electric Vehicle (Grid Avg)',
    co2KgPerKm: 0.053,
    fuelLitersPerKm: 0,
    sourceNote: 'Lifecycle electricity grid average per km; zero tailpipe exhaust',
  },
  bicycle: {
    id: 'bicycle',
    label: 'Bicycle',
    co2KgPerKm: 0,
    fuelLitersPerKm: 0,
    sourceNote: 'Zero operational tailpipe or fuel emissions',
  },
  walking: {
    id: 'walking',
    label: 'Walking',
    co2KgPerKm: 0,
    fuelLitersPerKm: 0,
    sourceNote: 'Zero operational tailpipe or fuel emissions',
  },
};

export interface EcoComparisonInput {
  chosenMode: TransportMode;
  baselineMode: TransportMode;
  distanceKmPerTrip: number;
  tripsCount: number;
  fuelPricePerLiter?: number;
}

export interface EcoComparisonResult {
  totalDistanceKm: number;
  chosenCo2Kg: number;
  baselineCo2Kg: number;
  co2AvoidedKg: number;
  fuelSavedLiters: number;
  estimatedFuelCostSaved: number;
  allModesComparison: Array<{
    mode: TransportMode;
    label: string;
    co2Kg: number;
    avoidedVsCarKg: number;
  }>;
  summaryText: string;
}

export function calculateEcoImpact(input: EcoComparisonInput): EcoComparisonResult {
  const distance = Math.max(0, Number.isFinite(input.distanceKmPerTrip) ? input.distanceKmPerTrip : 0);
  const trips = Math.max(0, Number.isFinite(input.tripsCount) ? Math.floor(input.tripsCount) : 0);
  const fuelPrice = Math.max(
    0,
    typeof input.fuelPricePerLiter === 'number' && Number.isFinite(input.fuelPricePerLiter)
      ? input.fuelPricePerLiter
      : 1.15
  ); // neutral USD/liter default reference

  const totalDistanceKm = Number((distance * trips).toFixed(2));
  const chosenSpec = TRANSPORT_SPECS[input.chosenMode];
  const baselineSpec = TRANSPORT_SPECS[input.baselineMode];

  const chosenCo2Kg = Number((totalDistanceKm * chosenSpec.co2KgPerKm).toFixed(2));
  const baselineCo2Kg = Number((totalDistanceKm * baselineSpec.co2KgPerKm).toFixed(2));
  const co2AvoidedKg = Number(Math.max(0, baselineCo2Kg - chosenCo2Kg).toFixed(2));

  const chosenFuel = totalDistanceKm * chosenSpec.fuelLitersPerKm;
  const baselineFuel = totalDistanceKm * baselineSpec.fuelLitersPerKm;
  const fuelSavedLiters = Number(Math.max(0, baselineFuel - chosenFuel).toFixed(2));
  const estimatedFuelCostSaved = Number((fuelSavedLiters * fuelPrice).toFixed(2));

  const carBaseline = totalDistanceKm * TRANSPORT_SPECS.personal_car.co2KgPerKm;
  const allModesComparison = (Object.keys(TRANSPORT_SPECS) as TransportMode[]).map((mode) => {
    const spec = TRANSPORT_SPECS[mode];
    const co2Kg = Number((totalDistanceKm * spec.co2KgPerKm).toFixed(2));
    return {
      mode,
      label: spec.label.split(' (')[0],
      co2Kg,
      avoidedVsCarKg: Number(Math.max(0, carBaseline - co2Kg).toFixed(2)),
    };
  });

  const summaryText =
    co2AvoidedKg > 0
      ? `By choosing ${chosenSpec.label} instead of ${baselineSpec.label} for ${totalDistanceKm} km, you may avoid an estimated ${co2AvoidedKg} kg of CO2 emissions.`
      : `${chosenSpec.label} produces an estimated ${chosenCo2Kg} kg of CO2 over ${totalDistanceKm} km.`;

  return {
    totalDistanceKm,
    chosenCo2Kg,
    baselineCo2Kg,
    co2AvoidedKg,
    fuelSavedLiters,
    estimatedFuelCostSaved,
    allModesComparison,
    summaryText,
  };
}
