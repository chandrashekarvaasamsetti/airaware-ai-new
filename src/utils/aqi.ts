import type { AqiStandard, PollutantReadings } from '../types/airaware.ts';

export interface AqiBreakpoint {
  cLow: number;
  cHigh: number;
  iLow: number;
  iHigh: number;
}

export interface AqiCategoryMeta {
  tier: 1 | 2 | 3 | 4 | 5 | 6;
  label: string;
  colorHex: string;
  badgeBgClass: string;
  textClass: string;
  borderClass: string;
  advisory: string;
  outdoorActivityNote: string;
}

export interface CalculatedAqiResult {
  aqi: number | null;
  standard: AqiStandard;
  standardLabel: string;
  dominantPollutant: string | null;
  subIndices: Record<string, number>;
  category: AqiCategoryMeta;
}

export interface SmartAlert {
  id: string;
  severity: 'unhealthy' | 'very-unhealthy' | 'hazardous' | 'spike' | 'threshold';
  title: string;
  levelLabel: string;
  aqiValue: number;
  locationName: string;
  timestamp: string;
  mainPollutant: string;
  precaution: string;
  alternativeActivity: string;
  colorHex: string;
}

// US EPA 2024 Revised AQI Breakpoints
const US_PM25_BP: AqiBreakpoint[] = [
  { cLow: 0.0, cHigh: 9.0, iLow: 0, iHigh: 50 },
  { cLow: 9.1, cHigh: 35.4, iLow: 51, iHigh: 100 },
  { cLow: 35.5, cHigh: 55.4, iLow: 101, iHigh: 150 },
  { cLow: 55.5, cHigh: 125.4, iLow: 151, iHigh: 200 },
  { cLow: 125.5, cHigh: 225.4, iLow: 201, iHigh: 300 },
  { cLow: 225.5, cHigh: 325.4, iLow: 301, iHigh: 400 },
  { cLow: 325.5, cHigh: 500.4, iLow: 401, iHigh: 500 },
];

const US_PM10_BP: AqiBreakpoint[] = [
  { cLow: 0, cHigh: 54, iLow: 0, iHigh: 50 },
  { cLow: 55, cHigh: 154, iLow: 51, iHigh: 100 },
  { cLow: 155, cHigh: 254, iLow: 101, iHigh: 150 },
  { cLow: 255, cHigh: 354, iLow: 151, iHigh: 200 },
  { cLow: 355, cHigh: 424, iLow: 201, iHigh: 300 },
  { cLow: 425, cHigh: 504, iLow: 301, iHigh: 400 },
  { cLow: 505, cHigh: 604, iLow: 401, iHigh: 500 },
];

const US_O3_PPB_BP: AqiBreakpoint[] = [
  { cLow: 0, cHigh: 54, iLow: 0, iHigh: 50 },
  { cLow: 55, cHigh: 70, iLow: 51, iHigh: 100 },
  { cLow: 71, cHigh: 85, iLow: 101, iHigh: 150 },
  { cLow: 86, cHigh: 105, iLow: 151, iHigh: 200 },
  { cLow: 106, cHigh: 200, iLow: 201, iHigh: 300 },
];

const US_NO2_PPB_BP: AqiBreakpoint[] = [
  { cLow: 0, cHigh: 53, iLow: 0, iHigh: 50 },
  { cLow: 54, cHigh: 100, iLow: 51, iHigh: 100 },
  { cLow: 101, cHigh: 360, iLow: 101, iHigh: 150 },
  { cLow: 361, cHigh: 649, iLow: 151, iHigh: 200 },
  { cLow: 650, cHigh: 1249, iLow: 201, iHigh: 300 },
  { cLow: 1250, cHigh: 2049, iLow: 301, iHigh: 500 },
];

const US_SO2_PPB_BP: AqiBreakpoint[] = [
  { cLow: 0, cHigh: 35, iLow: 0, iHigh: 50 },
  { cLow: 36, cHigh: 75, iLow: 51, iHigh: 100 },
  { cLow: 76, cHigh: 185, iLow: 101, iHigh: 150 },
  { cLow: 186, cHigh: 304, iLow: 151, iHigh: 200 },
  { cLow: 305, cHigh: 604, iLow: 201, iHigh: 300 },
  { cLow: 605, cHigh: 1004, iLow: 301, iHigh: 500 },
];

const US_CO_PPM_BP: AqiBreakpoint[] = [
  { cLow: 0.0, cHigh: 4.4, iLow: 0, iHigh: 50 },
  { cLow: 4.5, cHigh: 9.4, iLow: 51, iHigh: 100 },
  { cLow: 9.5, cHigh: 12.4, iLow: 101, iHigh: 150 },
  { cLow: 12.5, cHigh: 15.4, iLow: 151, iHigh: 200 },
  { cLow: 15.5, cHigh: 30.4, iLow: 201, iHigh: 300 },
  { cLow: 30.5, cHigh: 50.4, iLow: 301, iHigh: 500 },
];

// CPCB India National Air Quality Index Breakpoints (µg/m³, CO in mg/m³)
const CPCB_PM25_BP: AqiBreakpoint[] = [
  { cLow: 0, cHigh: 30, iLow: 0, iHigh: 50 },
  { cLow: 31, cHigh: 60, iLow: 51, iHigh: 100 },
  { cLow: 61, cHigh: 90, iLow: 101, iHigh: 200 },
  { cLow: 91, cHigh: 120, iLow: 201, iHigh: 300 },
  { cLow: 121, cHigh: 250, iLow: 301, iHigh: 400 },
  { cLow: 251, cHigh: 500, iLow: 401, iHigh: 500 },
];

const CPCB_PM10_BP: AqiBreakpoint[] = [
  { cLow: 0, cHigh: 50, iLow: 0, iHigh: 50 },
  { cLow: 51, cHigh: 100, iLow: 51, iHigh: 100 },
  { cLow: 101, cHigh: 250, iLow: 101, iHigh: 200 },
  { cLow: 251, cHigh: 350, iLow: 201, iHigh: 300 },
  { cLow: 351, cHigh: 430, iLow: 301, iHigh: 400 },
  { cLow: 431, cHigh: 600, iLow: 401, iHigh: 500 },
];

const CPCB_NO2_BP: AqiBreakpoint[] = [
  { cLow: 0, cHigh: 40, iLow: 0, iHigh: 50 },
  { cLow: 41, cHigh: 80, iLow: 51, iHigh: 100 },
  { cLow: 81, cHigh: 180, iLow: 101, iHigh: 200 },
  { cLow: 181, cHigh: 280, iLow: 201, iHigh: 300 },
  { cLow: 281, cHigh: 400, iLow: 301, iHigh: 400 },
  { cLow: 401, cHigh: 800, iLow: 401, iHigh: 500 },
];

const CPCB_SO2_BP: AqiBreakpoint[] = [
  { cLow: 0, cHigh: 40, iLow: 0, iHigh: 50 },
  { cLow: 41, cHigh: 80, iLow: 51, iHigh: 100 },
  { cLow: 81, cHigh: 380, iLow: 101, iHigh: 200 },
  { cLow: 381, cHigh: 800, iLow: 201, iHigh: 300 },
  { cLow: 801, cHigh: 1600, iLow: 301, iHigh: 400 },
  { cLow: 1601, cHigh: 2400, iLow: 401, iHigh: 500 },
];

const CPCB_O3_BP: AqiBreakpoint[] = [
  { cLow: 0, cHigh: 50, iLow: 0, iHigh: 50 },
  { cLow: 51, cHigh: 100, iLow: 51, iHigh: 100 },
  { cLow: 101, cHigh: 168, iLow: 101, iHigh: 200 },
  { cLow: 169, cHigh: 208, iLow: 201, iHigh: 300 },
  { cLow: 209, cHigh: 748, iLow: 301, iHigh: 400 },
  { cLow: 749, cHigh: 1000, iLow: 401, iHigh: 500 },
];

const CPCB_CO_MG_BP: AqiBreakpoint[] = [
  { cLow: 0.0, cHigh: 1.0, iLow: 0, iHigh: 50 },
  { cLow: 1.1, cHigh: 2.0, iLow: 51, iHigh: 100 },
  { cLow: 2.1, cHigh: 10.0, iLow: 101, iHigh: 200 },
  { cLow: 10.1, cHigh: 17.0, iLow: 201, iHigh: 300 },
  { cLow: 17.1, cHigh: 34.0, iLow: 301, iHigh: 400 },
  { cLow: 34.1, cHigh: 50.0, iLow: 401, iHigh: 500 },
];

export function computeSubIndex(concentration: number | null, breakpoints: AqiBreakpoint[]): number | null {
  if (concentration === null || Number.isNaN(concentration) || concentration < 0) {
    return null;
  }

  for (let idx = 0; idx < breakpoints.length; idx++) {
    const bp = breakpoints[idx];
    const nextBp = breakpoints[idx + 1];
    if (concentration <= bp.cHigh || !nextBp) {
      const clamped = Math.min(concentration, bp.cHigh);
      const val = ((bp.iHigh - bp.iLow) / (bp.cHigh - bp.cLow)) * (clamped - bp.cLow) + bp.iLow;
      return Math.round(val);
    }
    if (concentration > bp.cHigh && concentration < nextBp.cLow) {
      // Interpolate across gap between truncated breakpoint thresholds
      const val = ((nextBp.iLow - bp.iHigh) / (nextBp.cLow - bp.cHigh)) * (concentration - bp.cHigh) + bp.iHigh;
      return Math.round(val);
    }
  }
  return 500;
}

export function getAqiCategory(aqi: number | null, standard: AqiStandard): AqiCategoryMeta {
  if (aqi === null) {
    return {
      tier: 1,
      label: 'Data Unavailable',
      colorHex: '#64748B',
      badgeBgClass: 'bg-slate-100 dark:bg-slate-800',
      textClass: 'text-slate-700 dark:text-slate-300',
      borderClass: 'border-slate-300 dark:border-slate-700',
      advisory: 'Live measurements are unavailable for this location. Follow general local public health advisories.',
      outdoorActivityNote: 'Check local municipal bulletins before extended outdoor exercise.',
    };
  }

  if (standard === 'CPCB_INDIA') {
    if (aqi <= 50) {
      return {
        tier: 1,
        label: 'Good',
        colorHex: '#16A34A',
        badgeBgClass: 'bg-emerald-50 dark:bg-emerald-950/40',
        textClass: 'text-emerald-700 dark:text-emerald-400',
        borderClass: 'border-emerald-200 dark:border-emerald-800',
        advisory: 'Minimal health impact. Ideal conditions for outdoor activity and natural home ventilation.',
        outdoorActivityNote: 'Safe for outdoor walking, cycling, and children’s play.',
      };
    }
    if (aqi <= 100) {
      return {
        tier: 2,
        label: 'Satisfactory',
        colorHex: '#CA8A04',
        badgeBgClass: 'bg-yellow-50 dark:bg-yellow-950/40',
        textClass: 'text-yellow-700 dark:text-yellow-400',
        borderClass: 'border-yellow-200 dark:border-yellow-800',
        advisory: 'Minor breathing discomfort may affect unusually sensitive individuals.',
        outdoorActivityNote: 'Normal outdoor routines are generally comfortable; monitor sensitive family members.',
      };
    }
    if (aqi <= 200) {
      return {
        tier: 3,
        label: 'Moderate',
        colorHex: '#F59E0B',
        badgeBgClass: 'bg-amber-50 dark:bg-amber-950/40',
        textClass: 'text-amber-700 dark:text-amber-400',
        borderClass: 'border-amber-200 dark:border-amber-800',
        advisory: 'Breathing discomfort possible for people with lung or heart conditions, children, and older adults.',
        outdoorActivityNote: 'Shorten strenuous outdoor workouts near busy roads; prefer midday hours.',
      };
    }
    if (aqi <= 300) {
      return {
        tier: 4,
        label: 'Poor',
        colorHex: '#DC2626',
        badgeBgClass: 'bg-red-50 dark:bg-red-950/40',
        textClass: 'text-red-700 dark:text-red-400',
        borderClass: 'border-red-200 dark:border-red-800',
        advisory: 'Breathing discomfort to most people on prolonged exposure; heightened risk for sensitive groups.',
        outdoorActivityNote: 'Shift exercise indoors, wear a well-fitted N95/FFP2 mask outdoors, and run HEPA filtration.',
      };
    }
    if (aqi <= 400) {
      return {
        tier: 5,
        label: 'Very Poor',
        colorHex: '#7E22CE',
        badgeBgClass: 'bg-purple-50 dark:bg-purple-950/40',
        textClass: 'text-purple-700 dark:text-purple-400',
        borderClass: 'border-purple-200 dark:border-purple-800',
        advisory: 'Respiratory illness risk on prolonged exposure. Effects may be pronounced in people with lung or heart conditions.',
        outdoorActivityNote: 'Avoid outdoor exertion. Keep windows closed and use indoor air purification.',
      };
    }
    return {
      tier: 6,
      label: 'Severe',
      colorHex: '#881337',
      badgeBgClass: 'bg-rose-50 dark:bg-rose-950/40',
      textClass: 'text-rose-900 dark:text-rose-300',
      borderClass: 'border-rose-300 dark:border-rose-800',
      advisory: 'Affects healthy people and seriously impacts sensitive individuals. Minimize all outdoor exposure.',
      outdoorActivityNote: 'Stay indoors with sealed windows and continuous HEPA filtration; avoid outdoor travel unless essential.',
    };
  }

  // US EPA AQI Standard
  if (aqi <= 50) {
    return {
      tier: 1,
      label: 'Good',
      colorHex: '#16A34A',
      badgeBgClass: 'bg-emerald-50 dark:bg-emerald-950/40',
      textClass: 'text-emerald-700 dark:text-emerald-400',
      borderClass: 'border-emerald-200 dark:border-emerald-800',
      advisory: 'Air quality is satisfactory, and air pollution poses little or no risk.',
      outdoorActivityNote: 'Great window for outdoor exercise, walking, cycling, and opening windows for cross-ventilation.',
    };
  }
  if (aqi <= 100) {
    return {
      tier: 2,
      label: 'Moderate',
      colorHex: '#CA8A04',
      badgeBgClass: 'bg-yellow-50 dark:bg-yellow-950/40',
      textClass: 'text-yellow-700 dark:text-yellow-400',
      borderClass: 'border-yellow-200 dark:border-yellow-800',
      advisory: 'Air quality is acceptable; however, there may be a risk for people unusually sensitive to air pollution.',
      outdoorActivityNote: 'Outdoor activities remain fine for most people; sensitive individuals should pace intense exertion.',
    };
  }
  if (aqi <= 150) {
    return {
      tier: 3,
      label: 'Unhealthy for Sensitive Groups',
      colorHex: '#F59E0B',
      badgeBgClass: 'bg-amber-50 dark:bg-amber-950/40',
      textClass: 'text-amber-700 dark:text-amber-400',
      borderClass: 'border-amber-200 dark:border-amber-800',
      advisory: 'Members of sensitive groups (children, older adults, people with respiratory or heart sensitivities) may experience health effects.',
      outdoorActivityNote: 'Sensitive groups should move heavy workouts indoors and take quieter, low-traffic routes.',
    };
  }
  if (aqi <= 200) {
    return {
      tier: 4,
      label: 'Unhealthy',
      colorHex: '#DC2626',
      badgeBgClass: 'bg-red-50 dark:bg-red-950/40',
      textClass: 'text-red-700 dark:text-red-400',
      borderClass: 'border-red-200 dark:border-red-800',
      advisory: 'Some members of the general public may experience health effects; sensitive groups may experience more serious effects.',
      outdoorActivityNote: 'Avoid prolonged outdoor exertion; keep windows shut and run HEPA filtration indoors.',
    };
  }
  if (aqi <= 300) {
    return {
      tier: 5,
      label: 'Very Unhealthy',
      colorHex: '#7E22CE',
      badgeBgClass: 'bg-purple-50 dark:bg-purple-950/40',
      textClass: 'text-purple-700 dark:text-purple-400',
      borderClass: 'border-purple-200 dark:border-purple-800',
      advisory: 'Health alert: the risk of health effects is increased for everyone.',
      outdoorActivityNote: 'Move all exercise indoors, wear an N95/FFP2 respirator if stepping outside, and limit vehicle trips.',
    };
  }
  return {
    tier: 6,
    label: 'Hazardous',
    colorHex: '#881337',
    badgeBgClass: 'bg-rose-50 dark:bg-rose-950/40',
    textClass: 'text-rose-900 dark:text-rose-300',
    borderClass: 'border-rose-300 dark:border-rose-800',
    advisory: 'Health warning of emergency conditions: everyone is more likely to be affected.',
    outdoorActivityNote: 'Remain indoors with doors and windows sealed, run air purifiers, and follow local emergency health guidance.',
  };
}

export function calculateAqi(pollutants: PollutantReadings, standard: AqiStandard): CalculatedAqiResult {
  const subIndices: Record<string, number> = {};

  if (standard === 'CPCB_INDIA') {
    const pm25 = computeSubIndex(pollutants.pm25, CPCB_PM25_BP);
    const pm10 = computeSubIndex(pollutants.pm10, CPCB_PM10_BP);
    const no2 = computeSubIndex(pollutants.no2, CPCB_NO2_BP);
    const so2 = computeSubIndex(pollutants.so2, CPCB_SO2_BP);
    const o3 = computeSubIndex(pollutants.o3, CPCB_O3_BP);
    const co = pollutants.co !== null ? computeSubIndex(pollutants.co / 1000, CPCB_CO_MG_BP) : null;

    if (pm25 !== null) subIndices['PM2.5'] = pm25;
    if (pm10 !== null) subIndices['PM10'] = pm10;
    if (no2 !== null) subIndices['NO2'] = no2;
    if (so2 !== null) subIndices['SO2'] = so2;
    if (o3 !== null) subIndices['O3'] = o3;
    if (co !== null) subIndices['CO'] = co;
  } else {
    const pm25 = computeSubIndex(pollutants.pm25, US_PM25_BP);
    const pm10 = computeSubIndex(pollutants.pm10, US_PM10_BP);
    const o3 = pollutants.o3 !== null ? computeSubIndex(pollutants.o3 / 1.96, US_O3_PPB_BP) : null;
    const no2 = pollutants.no2 !== null ? computeSubIndex(pollutants.no2 / 1.88, US_NO2_PPB_BP) : null;
    const so2 = pollutants.so2 !== null ? computeSubIndex(pollutants.so2 / 2.62, US_SO2_PPB_BP) : null;
    const co = pollutants.co !== null ? computeSubIndex(pollutants.co / 1145, US_CO_PPM_BP) : null;

    if (pm25 !== null) subIndices['PM2.5'] = pm25;
    if (pm10 !== null) subIndices['PM10'] = pm10;
    if (o3 !== null) subIndices['O3'] = o3;
    if (no2 !== null) subIndices['NO2'] = no2;
    if (so2 !== null) subIndices['SO2'] = so2;
    if (co !== null) subIndices['CO'] = co;
  }

  const entries = Object.entries(subIndices);
  if (entries.length === 0) {
    return {
      aqi: null,
      standard,
      standardLabel: standard === 'CPCB_INDIA' ? 'CPCB India AQI' : 'US EPA AQI',
      dominantPollutant: null,
      subIndices: {},
      category: getAqiCategory(null, standard),
    };
  }

  let maxVal = -1;
  let dominant: string | null = null;
  for (const [key, val] of entries) {
    if (val > maxVal) {
      maxVal = val;
      dominant = key;
    }
  }

  return {
    aqi: maxVal,
    standard,
    standardLabel: standard === 'CPCB_INDIA' ? 'CPCB India AQI' : 'US EPA AQI',
    dominantPollutant: dominant,
    subIndices,
    category: getAqiCategory(maxVal, standard),
  };
}

export function evaluatePollutionAlerts(params: {
  currentAqi: number | null;
  dominantPollutant: string | null;
  standard: AqiStandard;
  locationName: string;
  timestamp: string;
  alertThreshold: number;
  previousAqiPoints?: number[];
}): SmartAlert[] {
  const { currentAqi, dominantPollutant, standard, locationName, timestamp, alertThreshold, previousAqiPoints = [] } = params;
  if (currentAqi === null) return [];

  const alerts: SmartAlert[] = [];
  const mainPollutant = dominantPollutant ?? 'PM2.5';
  const category = getAqiCategory(currentAqi, standard);

  if ((standard === 'US_AQI' && currentAqi >= 301) || (standard === 'CPCB_INDIA' && currentAqi >= 401)) {
    alerts.push({
      id: 'alert-hazardous',
      severity: 'hazardous',
      title: `${category.label} Air Quality Alert`,
      levelLabel: category.label,
      aqiValue: currentAqi,
      locationName,
      timestamp,
      mainPollutant,
      precaution: category.advisory,
      alternativeActivity: 'Stay indoors with windows sealed, run a HEPA purifier on medium/high, and postpone outdoor errands.',
      colorHex: category.colorHex,
    });
  } else if ((standard === 'US_AQI' && currentAqi >= 201) || (standard === 'CPCB_INDIA' && currentAqi >= 301)) {
    alerts.push({
      id: 'alert-very-unhealthy',
      severity: 'very-unhealthy',
      title: `${category.label} Air Quality Alert`,
      levelLabel: category.label,
      aqiValue: currentAqi,
      locationName,
      timestamp,
      mainPollutant,
      precaution: category.advisory,
      alternativeActivity: 'Replace outdoor runs or walks with indoor stretching, yoga, or stationary cycling.',
      colorHex: category.colorHex,
    });
  } else if ((standard === 'US_AQI' && currentAqi >= 151) || (standard === 'CPCB_INDIA' && currentAqi >= 201)) {
    alerts.push({
      id: 'alert-unhealthy',
      severity: 'unhealthy',
      title: `${category.label} Air Quality Alert`,
      levelLabel: category.label,
      aqiValue: currentAqi,
      locationName,
      timestamp,
      mainPollutant,
      precaution: category.advisory,
      alternativeActivity: 'Move cardio workouts indoors and wear a well-fitted N95/FFP2 mask during essential commutes.',
      colorHex: category.colorHex,
    });
  }

  if (currentAqi >= alertThreshold && alerts.length === 0) {
    alerts.push({
      id: 'alert-custom-threshold',
      severity: 'threshold',
      title: `Custom Alert Threshold Exceeded (>= ${alertThreshold})`,
      levelLabel: category.label,
      aqiValue: currentAqi,
      locationName,
      timestamp,
      mainPollutant,
      precaution: `Current ${standard === 'CPCB_INDIA' ? 'CPCB India' : 'US'} AQI (${currentAqi}) has crossed your personal alert threshold of ${alertThreshold}.`,
      alternativeActivity: category.outdoorActivityNote,
      colorHex: category.colorHex,
    });
  }

  // Check for sudden spike (>= 35 AQI points jump over recent hours)
  if (previousAqiPoints.length >= 2) {
    const recentMin = Math.min(...previousAqiPoints.slice(-6));
    const delta = currentAqi - recentMin;
    if (delta >= 35) {
      alerts.push({
        id: 'alert-spike',
        severity: 'spike',
        title: `Sudden Pollution Increase (+${delta} AQI points)`,
        levelLabel: 'Rapid Rise Detected',
        aqiValue: currentAqi,
        locationName,
        timestamp,
        mainPollutant,
        precaution: `Air quality worsened rapidly by ${delta} AQI points over recent hours, likely due to traffic buildup or wind stagnation.`,
        alternativeActivity: 'Close street-facing windows and delay outdoor walks until dispersion improves.',
        colorHex: '#F59E0B',
      });
    }
  }

  return alerts;
}
