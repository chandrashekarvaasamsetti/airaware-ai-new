import type { MonitoringStation, PollutantReadings } from '../types/airaware.ts';

export const MAX_RECENT_AGE_HOURS = 72;

export interface OpenAqSensorMeta {
  id: number;
  name?: string;
  parameter?: {
    id?: number;
    name?: string;
    units?: string;
    displayName?: string;
  };
}

export interface OpenAqLocationMeta {
  id: number;
  name?: string;
  locality?: string;
  provider?: { name?: string };
  owner?: { name?: string };
  coordinates?: { latitude?: number; longitude?: number };
  datetimeLast?: { utc?: string | null };
  sensors?: OpenAqSensorMeta[];
}

export interface OpenAqLatestMeasurement {
  sensorsId?: number;
  locationsId?: number;
  value?: number;
  datetime?: { utc?: string | null };
  parameter?: {
    id?: number;
    name?: string;
    units?: string;
  };
}

export function normalizeToUgPerM3(
  paramName: string,
  value: number,
  rawUnits?: string
): number | null {
  if (!Number.isFinite(value) || value < 0) return null;

  const param = paramName.trim().toLowerCase().replace('.', '');
  const units = (rawUnits ?? '').trim().toLowerCase().replace(/\s+/g, '');

  // Particulate matter (PM2.5, PM10)
  if (param === 'pm25' || param === 'pm10') {
    if (units === 'mg/m3' || units === 'mg/m³') {
      return Number((value * 1000).toFixed(1));
    }
    return Number(value.toFixed(1));
  }

  // Gases: convert ppm / ppb / mg/m3 into µg/m³ at 25°C, 1 atm
  if (units === 'mg/m3' || units === 'mg/m³' || units === 'mg/m^3') {
    return Number((value * 1000).toFixed(1));
  }

  if (units === 'ppm') {
    if (param === 'co') return Number((value * 1145).toFixed(1));
    if (param === 'no2') return Number((value * 1880).toFixed(1));
    if (param === 'so2') return Number((value * 2620).toFixed(1));
    if (param === 'o3') return Number((value * 1960).toFixed(1));
  }

  // Some ground networks (e.g., CPCB/DPCC via OpenAQ) transmit CO in mg/m³ (0.1–20)
  // while metadata tags µg/m³ or ppb. Ambient CO is physically >= 50 µg/m³ (~44 ppb) everywhere on Earth.
  if (param === 'co' && value > 0 && value < 25) {
    return Number((value * 1000).toFixed(1));
  }

  if (units === 'ppb') {
    if (param === 'co') return Number((value * 1.145).toFixed(1));
    if (param === 'no2') return Number((value * 1.88).toFixed(1));
    if (param === 'so2') return Number((value * 2.62).toFixed(1));
    if (param === 'o3') return Number((value * 1.96).toFixed(1));
  }

  // Already µg/m³ (ug/m3, µg/m³) or unspecified standard OpenAQ µg/m³
  return Number(value.toFixed(1));
}

export function isTimestampRecent(
  utcTimestamp: string | null | undefined,
  nowMs = Date.now(),
  maxAgeHours = MAX_RECENT_AGE_HOURS
): boolean {
  if (!utcTimestamp) return false;
  const parsed = Date.parse(utcTimestamp);
  if (Number.isNaN(parsed)) return false;
  const ageMs = nowMs - parsed;
  // Allow slight clock skew up to 2 hours into future, otherwise must be within maxAgeHours
  return ageMs >= -2 * 3600_000 && ageMs <= maxAgeHours * 3600_000;
}

export function formatMeasurementAge(utcTimestamp: string | null | undefined, nowMs = Date.now()): string {
  if (!utcTimestamp) return 'No timestamp available';
  const parsed = Date.parse(utcTimestamp);
  if (Number.isNaN(parsed)) return 'Invalid timestamp';
  const diffMin = Math.round((nowMs - parsed) / 60_000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.round(diffMin / 60);
  if (diffHrs < 48) return `${diffHrs}h ago`;
  const diffDays = Math.round(diffHrs / 24);
  if (diffDays <= 30) return `${diffDays}d ago`;
  return `Last reported ${new Date(parsed).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })}`;
}

export function hasAnyPollutantReading(pollutants: PollutantReadings): boolean {
  return (
    pollutants.pm25 !== null ||
    pollutants.pm10 !== null ||
    pollutants.no2 !== null ||
    pollutants.so2 !== null ||
    pollutants.co !== null ||
    pollutants.o3 !== null
  );
}

export function mapOpenAqStation(params: {
  location: OpenAqLocationMeta;
  latestResults: OpenAqLatestMeasurement[];
  distanceKm: number | null;
  nowMs?: number;
}): MonitoringStation | null {
  const { location, latestResults, distanceKm, nowMs = Date.now() } = params;
  const sLat = location.coordinates?.latitude;
  const sLon = location.coordinates?.longitude;
  if (typeof sLat !== 'number' || typeof sLon !== 'number') return null;

  const sensorLookup = new Map<number, { param: string; units?: string }>();
  for (const sensor of location.sensors ?? []) {
    const paramName = sensor.parameter?.name || sensor.name;
    if (typeof sensor.id === 'number' && paramName) {
      sensorLookup.set(sensor.id, {
        param: paramName.toLowerCase().replace('.', ''),
        units: sensor.parameter?.units,
      });
    }
  }

  const pollutants: PollutantReadings = {
    pm25: null,
    pm10: null,
    no2: null,
    so2: null,
    co: null,
    o3: null,
  };

  let latestMeasurementTime: string | null = null;
  let latestMeasurementMs = -1;
  let hasRecentMeasurement = false;
  let sawAnyMeasurement = false;

  for (const item of latestResults) {
    const sensorMeta = typeof item.sensorsId === 'number' ? sensorLookup.get(item.sensorsId) : undefined;
    const rawParam = (item.parameter?.name || sensorMeta?.param || '').toLowerCase().replace('.', '');
    const rawUnits = item.parameter?.units || sensorMeta?.units;
    const val = item.value;
    if (!rawParam || typeof val !== 'number' || !Number.isFinite(val) || val < 0) continue;

    const ts = item.datetime?.utc ?? location.datetimeLast?.utc ?? null;
    if (ts) {
      const parsed = Date.parse(ts);
      if (!Number.isNaN(parsed) && parsed > latestMeasurementMs) {
        latestMeasurementMs = parsed;
        latestMeasurementTime = ts;
      }
    }

    const recent = isTimestampRecent(ts, nowMs);
    const normalized = normalizeToUgPerM3(rawParam, val, rawUnits);
    if (normalized === null) continue;

    sawAnyMeasurement = true;
    // Record measurement only if recent, OR if station has no recent readings at all we still keep
    // the values only when recent; for stale stations we clear live pollutants so stale 2018 readings are not treated as live!
    if (recent) {
      hasRecentMeasurement = true;
      if (rawParam === 'pm25') pollutants.pm25 = normalized;
      else if (rawParam === 'pm10') pollutants.pm10 = normalized;
      else if (rawParam === 'no2') pollutants.no2 = normalized;
      else if (rawParam === 'so2') pollutants.so2 = normalized;
      else if (rawParam === 'co') pollutants.co = normalized;
      else if (rawParam === 'o3') pollutants.o3 = normalized;
    }
  }

  const fallbackLastTime = latestMeasurementTime ?? location.datetimeLast?.utc ?? null;
  const ageText = formatMeasurementAge(fallbackLastTime, nowMs);

  let dataAvailability: MonitoringStation['dataAvailability'] = 'unavailable';
  let availabilityNote = 'No recent pollutant measurements available from this station.';

  if (hasRecentMeasurement && hasAnyPollutantReading(pollutants)) {
    dataAvailability = 'live';
    availabilityNote = `Live ground measurement · ${ageText}`;
  } else if (sawAnyMeasurement || (fallbackLastTime && !isTimestampRecent(fallbackLastTime, nowMs))) {
    dataAvailability = 'stale';
    availabilityNote = `No recent readings (inactive/stale · ${ageText})`;
  }

  return {
    id: `openaq-${location.id}`,
    name: location.name || location.locality || `OpenAQ Station #${location.id}`,
    provider: location.provider?.name || location.owner?.name || 'OpenAQ Ground Network',
    latitude: sLat,
    longitude: sLon,
    distanceKm,
    lastUpdated: fallbackLastTime,
    hasRecentData: dataAvailability === 'live',
    dataAvailability,
    availabilityNote,
    stationType: 'ground-station',
    pollutants,
    isDemo: false,
  };
}
