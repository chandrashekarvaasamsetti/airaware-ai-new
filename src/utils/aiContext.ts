import type {
  AiDataStatusCategory,
  AiGroundedMeta,
  AirQualityReport,
  AqiStandard,
  PollutantReadings,
  UserPreferences,
} from '../types/airaware.ts';
import { calculateAqi } from './aqi.ts';
import { formatMeasurementAge, hasAnyPollutantReading } from './openaqMapper.ts';

export interface GroundedAiContextResult {
  meta: AiGroundedMeta;
  promptContext: Record<string, unknown>;
}

const POLLUTANT_KEYS: Array<{ key: keyof PollutantReadings; label: string }> = [
  { key: 'pm25', label: 'PM2.5' },
  { key: 'pm10', label: 'PM10' },
  { key: 'no2', label: 'NO2' },
  { key: 'so2', label: 'SO2' },
  { key: 'co', label: 'CO' },
  { key: 'o3', label: 'O3' },
];

export function buildGroundedAiContext(params: {
  report: AirQualityReport | null;
  standard: AqiStandard;
  preferences?: Partial<UserPreferences>;
  nowMs?: number;
}): GroundedAiContextResult {
  const { report, standard, preferences, nowMs = Date.now() } = params;
  const standardLabel = standard === 'CPCB_INDIA' ? 'CPCB India AQI' : 'US EPA AQI';

  if (!report) {
    const meta: AiGroundedMeta = {
      locationLabel: 'No location selected',
      aqi: null,
      standardLabel,
      categoryLabel: 'Data Unavailable',
      dominantPollutant: null,
      dataSource: 'Unavailable',
      lastUpdated: null,
      fetchedAt: null,
      statusCategory: 'unavailable',
      statusLabel: 'Unavailable (No backend report loaded)',
      verifiedPollutants: [],
      estimatedPollutants: [],
      unavailablePollutants: POLLUTANT_KEYS.map((p) => p.label),
    };
    return {
      meta,
      promptContext: {
        location: null,
        airQuality: null,
        provenance: meta,
        lifestyleProfile: buildLifestyleContext(preferences),
      },
    };
  }

  const aqiResult = calculateAqi(report.pollutants, standard);
  const locationParts = [report.location.name, report.location.region, report.location.country].filter(
    Boolean
  );
  const locationLabel = locationParts.join(', ');

  const liveGroundStations = report.stations.filter(
    (s) => s.stationType === 'ground-station' && s.dataAvailability === 'live'
  );
  const primaryGround =
    liveGroundStations.find((s) => s.pollutants.pm25 !== null || s.pollutants.pm10 !== null) ??
    liveGroundStations[0] ??
    null;

  const verifiedPollutants: string[] = [];
  const estimatedPollutants: string[] = [];
  const unavailablePollutants: string[] = [];

  for (const { key, label } of POLLUTANT_KEYS) {
    const val = report.pollutants[key];
    if (val === null) {
      unavailablePollutants.push(label);
    } else if (report.isDemo) {
      estimatedPollutants.push(label);
    } else if (primaryGround && primaryGround.pollutants[key] !== null) {
      verifiedPollutants.push(label);
    } else {
      estimatedPollutants.push(label);
    }
  }

  let statusCategory: AiDataStatusCategory = 'unavailable';
  let statusLabel = 'Unavailable (No recent measurements)';

  if (report.isDemo) {
    statusCategory = 'demo';
    statusLabel = 'DEMO Mode (Simulated reference readings, live APIs unreachable)';
  } else if (!hasAnyPollutantReading(report.pollutants)) {
    statusCategory = 'unavailable';
    statusLabel = 'Unavailable (No pollutant readings returned)';
  } else if (primaryGround) {
    if (estimatedPollutants.length > 0) {
      statusCategory = 'supplemented-ground';
      statusLabel = `Verified ground sensor (${primaryGround.name}) · ${estimatedPollutants.join(', ')} estimated via Open-Meteo CAMS`;
    } else {
      statusCategory = 'live-ground';
      statusLabel = `Verified live ground sensor (${primaryGround.name})`;
    }
  } else if (report.openAqStatus === 'stale-only') {
    statusCategory = 'estimated-model';
    statusLabel = 'Estimated via Open-Meteo CAMS model (nearby ground sensors stale >72h)';
  } else {
    statusCategory = 'estimated-model';
    statusLabel = 'Estimated via Open-Meteo CAMS atmospheric model (no active local ground sensor)';
  }

  const measurementAge = formatMeasurementAge(report.lastUpdated, nowMs);

  const meta: AiGroundedMeta = {
    locationLabel,
    aqi: aqiResult.aqi,
    standardLabel: aqiResult.standardLabel,
    categoryLabel: aqiResult.category.label,
    dominantPollutant: aqiResult.dominantPollutant,
    dataSource: report.dataSource,
    lastUpdated: report.lastUpdated,
    fetchedAt: report.fetchedAt ?? null,
    statusCategory,
    statusLabel,
    verifiedPollutants,
    estimatedPollutants,
    unavailablePollutants,
  };

  const promptContext = {
    location: {
      city: report.location.name,
      region: report.location.region ?? null,
      country: report.location.country,
    },
    airQuality: {
      standard: aqiResult.standardLabel,
      aqi: aqiResult.aqi,
      category: aqiResult.category.label,
      dominantPollutant: aqiResult.dominantPollutant,
      pollutantsUgPerM3: report.pollutants,
      weather: report.weather,
      dataSource: report.dataSource,
      lastUpdatedUtc: report.lastUpdated,
      measurementAge,
      fetchedAtUtc: report.fetchedAt ?? null,
      openAqStatus: report.openAqStatus ?? null,
      isDemo: report.isDemo,
      notice: report.notice ?? null,
    },
    provenance: {
      statusCategory,
      statusLabel,
      verifiedGroundPollutants: verifiedPollutants,
      estimatedModelPollutants: estimatedPollutants,
      unavailablePollutants,
      activeGroundStationsCount: liveGroundStations.length,
    },
    lifestyleProfile: buildLifestyleContext(preferences),
  };

  return { meta, promptContext };
}

function buildLifestyleContext(preferences?: Partial<UserPreferences>) {
  return {
    lifestyle: preferences?.lifestyle ?? 'Working Professional',
    wakeUpTime: preferences?.wakeUpTime ?? '07:00',
    outdoorPreference: preferences?.outdoorPreference ?? 'Outdoor walking or light activity',
    primaryTransport: preferences?.primaryTransport ?? 'public_bus',
    householdPreference: preferences?.householdPreference ?? 'Standard household ventilation',
    sensitiveConsiderations: preferences?.sensitiveConsiderations ?? {
      children: false,
      olderAdults: false,
      respiratorySensitivity: false,
    },
  };
}

export function buildAirAwareSystemInstruction(promptContext: Record<string, unknown>): string {
  return [
    'You are AirAware Assistant, a practical, evidence-based urban air quality guide.',
    'Follow EVERY rule below strictly:',
    '1. GROUNDING & HONESTY: Use ONLY the backend air quality numbers, weather conditions, data source, and timestamp provided in the context below. Never invent, extrapolate, or guess pollutant readings. If a pollutant is null or in unavailablePollutants, state clearly that it is unavailable.',
    '2. PROVENANCE & TRANSPARENCY: Briefly cite the location, current AQI value & standard, exact measurement timestamp (or age), data source, and whether readings come from a verified ground sensor, an estimated atmospheric model (Open-Meteo CAMS), stale data (>72h old), DEMO mode, or are unavailable.',
    '3. STALE / ESTIMATED / UNAVAILABLE CLARITY: Whenever statusCategory is "estimated-model", "supplemented-ground", "stale", "demo", or "unavailable", explicitly tell the user which values are model estimates or unavailable rather than direct street-level measurements.',
    '4. PERSONALIZATION: Tailor every recommendation specifically to the user’s location, weather (e.g., calm wind trapping winter smog), current pollution level, lifestyle, wake-up time, primary transport mode, household setup, and any family sensitivities.',
    '5. REASON + EXPECTED BENEFIT: For EVERY recommendation you give, explain both (a) WHY it helps (the mechanism) and (b) its EXPECTED PRACTICAL BENEFIT (e.g., lower inhaled fine-particle dose, reduced indoor infiltration).',
    '6. NO UNSUPPORTED HEALTH OR TRANSPORT CLAIMS: Never diagnose medical conditions, prescribe/adjust treatments, or promise that any action "prevents disease" or "cures" symptoms—advise consulting a clinician for symptoms. Never assume cycling, walking, or transit is automatically safe in every area; note road/traffic safety considerations (dedicated lanes, smog visibility, heavy-traffic breathing rate) honestly.',
    '7. AFFORDABLE FAMILY ALTERNATIVES: Include practical, low-cost or zero-cost options families can apply immediately (e.g., damp mopping instead of dry sweeping, brief midday cross-ventilation only during cleaner windows, lids on pots + kitchen exhaust, sealing drafty gaps, indoor active play for kids, combining errands) rather than relying solely on expensive devices.',
    '8. CLEAR 3-WAY DISTINCTION: Clearly distinguish (a) personal pollution exposure reduction (e.g., N95/FFP2 masks, staying indoors, HEPA filtration—protects your lungs, not outdoor city air), (b) local air pollution reduction (e.g., avoiding idling, open burning, short combustion trips—reduces neighborhood emissions), and (c) CO2 / greenhouse gas reduction (climate impact over time, not an immediate drop in today’s PM2.5). Never claim a personal action has already lowered pollution without measured evidence.',
    '9. CONVERSATIONAL & CONCISE: Write in warm, plain everyday language without jargon. Aim for a crisp ~120–200 word response using short paragraphs or 3–5 clear bullet points.',
    `Latest Backend Grounded Context: ${JSON.stringify(promptContext)}`,
  ].join('\n');
}
