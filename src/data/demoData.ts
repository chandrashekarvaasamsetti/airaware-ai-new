import type { AirQualityReport, LocationInfo } from '../types/airaware.ts';

export const DEFAULT_LOCATION: LocationInfo = {
  name: 'New Delhi',
  region: 'Delhi',
  country: 'India',
  latitude: 28.6139,
  longitude: 77.209,
};

export const POPULAR_CITIES: LocationInfo[] = [
  { name: 'New Delhi', region: 'Delhi', country: 'India', latitude: 28.6139, longitude: 77.209 },
  { name: 'Mumbai', region: 'Maharashtra', country: 'India', latitude: 19.076, longitude: 72.8777 },
  { name: 'Bengaluru', region: 'Karnataka', country: 'India', latitude: 12.9716, longitude: 77.5946 },
  { name: 'London', region: 'Greater London', country: 'United Kingdom', latitude: 51.5072, longitude: -0.1276 },
  { name: 'New York', region: 'New York', country: 'United States', latitude: 40.7128, longitude: -74.006 },
  { name: 'Tokyo', region: 'Tokyo', country: 'Japan', latitude: 35.6762, longitude: 139.6503 },
];

export function buildDemoAirQualityReport(location: LocationInfo, reason?: string): AirQualityReport {
  const now = new Date();
  const hourlyHistory = Array.from({ length: 24 }, (_, idx) => {
    const t = new Date(now.getTime() - (23 - idx) * 3600_000);
    const hour = t.getHours();
    // Deterministic winter diurnal curve (higher morning/evening, lower midday)
    const diurnal = Math.sin(((hour - 4) / 24) * Math.PI * 2) * -18;
    const basePm25 = Math.abs(location.latitude) < 35 && location.country === 'India' ? 74 : 22;
    const pm25 = Number(Math.max(6, basePm25 + diurnal).toFixed(1));
    const pm10 = Number((pm25 * 1.65).toFixed(1));
    return {
      timestamp: t.toISOString(),
      label: `${String(hour).padStart(2, '0')}:00`,
      pm25,
      pm10,
      no2: Number((18 + Math.abs(diurnal) * 0.6).toFixed(1)),
      o3: Number((34 + (hour >= 11 && hour <= 16 ? 24 : 4)).toFixed(1)),
    };
  });

  const dailyHistory = Array.from({ length: 7 }, (_, idx) => {
    const d = new Date(now.getTime() - (6 - idx) * 86400_000);
    const basePm25 = Math.abs(location.latitude) < 35 && location.country === 'India' ? 68 : 20;
    const variation = ((idx * 7) % 19) - 9;
    const pm25 = Number(Math.max(8, basePm25 + variation).toFixed(1));
    return {
      timestamp: d.toISOString(),
      label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      pm25,
      pm10: Number((pm25 * 1.6).toFixed(1)),
      no2: 24,
      o3: 42,
    };
  });

  const latest = hourlyHistory[hourlyHistory.length - 1];

  return {
    location,
    pollutants: {
      pm25: latest.pm25,
      pm10: latest.pm10,
      no2: latest.no2,
      so2: 9.4,
      co: 680,
      o3: latest.o3,
    },
    weather: {
      temperatureC: 16.5,
      humidityPercent: 62,
      windSpeedKmh: 7.4,
      condition: 'Hazy / Calm Wind (DEMO)',
    },
    hourlyHistory,
    dailyHistory,
    stations: [
      {
        id: 'demo-station-central',
        name: `${location.name} Central Station (DEMO)`,
        provider: 'DEMO Reference Network',
        latitude: location.latitude,
        longitude: location.longitude,
        distanceKm: 0.8,
        lastUpdated: now.toISOString(),
        hasRecentData: false,
        dataAvailability: 'unavailable',
        availabilityNote: 'DEMO MODE · Simulated reference values (live APIs unreachable)',
        stationType: 'demo',
        pollutants: {
          pm25: latest.pm25,
          pm10: latest.pm10,
          no2: latest.no2,
          so2: 9.4,
          co: 680,
          o3: latest.o3,
        },
        isDemo: true,
      },
      {
        id: 'demo-station-park',
        name: `${location.name} North Park Monitor (DEMO)`,
        provider: 'DEMO Reference Network',
        latitude: location.latitude + 0.025,
        longitude: location.longitude - 0.022,
        distanceKm: 3.4,
        lastUpdated: now.toISOString(),
        hasRecentData: false,
        dataAvailability: 'unavailable',
        availabilityNote: 'DEMO MODE · Simulated reference values (live APIs unreachable)',
        stationType: 'demo',
        pollutants: {
          pm25: Number((latest.pm25! * 0.88).toFixed(1)),
          pm10: Number((latest.pm10! * 0.9).toFixed(1)),
          no2: Number((latest.no2! * 0.82).toFixed(1)),
          so2: 7.8,
          co: 590,
          o3: latest.o3,
        },
        isDemo: true,
      },
    ],
    dataSource: 'DEMO MODE (Simulated Reference Values)',
    lastUpdated: now.toISOString(),
    fetchedAt: now.toISOString(),
    openAqStatus: 'error',
    isDemo: true,
    notice:
      reason ??
      'Live air quality APIs were unreachable in this environment. Displaying clearly labelled DEMO data so you can explore all features.',
  };
}
