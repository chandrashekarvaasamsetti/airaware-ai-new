import test from 'node:test';
import assert from 'node:assert/strict';
import type { AirQualityReport, UserPreferences } from '../types/airaware';
import { buildAirAwareSystemInstruction, buildGroundedAiContext } from './aiContext';

const BASE_PREFERENCES: Partial<UserPreferences> = {
  lifestyle: 'Student',
  wakeUpTime: '06:30',
  outdoorPreference: 'Evening campus run',
  primaryTransport: 'bicycle',
  householdPreference: 'Shared apartment with ceiling fans',
  sensitiveConsiderations: {
    children: true,
    olderAdults: false,
    respiratorySensitivity: true,
  },
};

function makeBaseReport(overrides: Partial<AirQualityReport> = {}): AirQualityReport {
  return {
    location: {
      name: 'New Delhi',
      region: 'Delhi',
      country: 'India',
      latitude: 28.6139,
      longitude: 77.209,
    },
    pollutants: {
      pm25: 62,
      pm10: 135,
      no2: 146.1,
      so2: 23.1,
      co: 1170,
      o3: 34,
    },
    weather: {
      temperatureC: 21,
      humidityPercent: 58,
      windSpeedKmh: 2.1,
      condition: 'Haze',
    },
    hourlyHistory: [],
    dailyHistory: [],
    stations: [
      {
        id: 'openaq-17',
        name: 'R K Puram, Delhi - DPCC',
        provider: 'CPCB',
        latitude: 28.563,
        longitude: 77.186,
        distanceKm: 6,
        lastUpdated: '2026-11-27T10:30:00Z',
        hasRecentData: true,
        dataAvailability: 'live',
        availabilityNote: 'Live ground measurement · 1h ago',
        stationType: 'ground-station',
        pollutants: {
          pm25: 62,
          pm10: 135,
          no2: 146.1,
          so2: 23.1,
          co: 1170,
          o3: 34,
        },
        isDemo: false,
      },
    ],
    dataSource: 'OpenAQ Ground Station (R K Puram, Delhi - DPCC)',
    lastUpdated: '2026-11-27T10:30:00Z',
    fetchedAt: '2026-11-27T11:30:00Z',
    openAqStatus: 'live',
    isDemo: false,
    ...overrides,
  };
}

test('identifies verified live ground station provenance accurately', () => {
  const report = makeBaseReport();
  const res = buildGroundedAiContext({
    report,
    standard: 'US_AQI',
    preferences: BASE_PREFERENCES,
    nowMs: Date.parse('2026-11-27T11:30:00Z'),
  });

  assert.equal(res.meta.statusCategory, 'live-ground');
  assert.equal(res.meta.aqi, 156);
  assert.deepEqual(res.meta.verifiedPollutants, ['PM2.5', 'PM10', 'NO2', 'SO2', 'CO', 'O3']);
  assert.deepEqual(res.meta.estimatedPollutants, []);
  assert.deepEqual(res.meta.unavailablePollutants, []);
});

test('marks CAMS-supplemented gases separately from verified ground pollutants', () => {
  const report = makeBaseReport({
    dataSource: 'OpenAQ (Tower Hamlets) + Open-Meteo CAMS (PM10, SO2, CO, O3)',
    stations: [
      {
        id: 'openaq-151',
        name: 'Tower Hamlets',
        provider: 'DEFRA',
        latitude: 51.5,
        longitude: -0.04,
        distanceKm: 4,
        lastUpdated: '2026-11-27T10:00:00Z',
        hasRecentData: true,
        dataAvailability: 'live',
        availabilityNote: 'Live',
        stationType: 'ground-station',
        pollutants: {
          pm25: 26,
          pm10: null,
          no2: 28.6,
          so2: null,
          co: null,
          o3: null,
        },
        isDemo: false,
      },
    ],
  });

  const res = buildGroundedAiContext({ report, standard: 'US_AQI', preferences: BASE_PREFERENCES });
  assert.equal(res.meta.statusCategory, 'supplemented-ground');
  assert.deepEqual(res.meta.verifiedPollutants, ['PM2.5', 'NO2']);
  assert.deepEqual(res.meta.estimatedPollutants, ['PM10', 'SO2', 'CO', 'O3']);
});

test('identifies estimated-model, demo, and unavailable reports transparently', () => {
  const camsReport = makeBaseReport({
    dataSource: 'Open-Meteo CAMS Atmospheric Model (Fallback)',
    openAqStatus: 'stale-only',
    stations: [
      {
        id: 'open-meteo-cams',
        name: 'City Atmospheric Grid Point',
        provider: 'Open-Meteo CAMS Atmospheric Model',
        latitude: 28.6,
        longitude: 77.2,
        distanceKm: 0,
        lastUpdated: '2026-11-27T11:00:00Z',
        hasRecentData: true,
        dataAvailability: 'live',
        availabilityNote: 'CAMS fallback',
        stationType: 'atmospheric-model',
        pollutants: { pm25: 40, pm10: 60, no2: 20, so2: 5, co: 400, o3: 45 },
      },
    ],
  });
  const camsRes = buildGroundedAiContext({ report: camsReport, standard: 'CPCB_INDIA' });
  assert.equal(camsRes.meta.statusCategory, 'estimated-model');
  assert.match(camsRes.meta.statusLabel, /Open-Meteo CAMS/i);

  const demoRes = buildGroundedAiContext({
    report: makeBaseReport({ isDemo: true, dataSource: 'DEMO MODE' }),
    standard: 'US_AQI',
  });
  assert.equal(demoRes.meta.statusCategory, 'demo');

  const unavailRes = buildGroundedAiContext({ report: null, standard: 'US_AQI' });
  assert.equal(unavailRes.meta.statusCategory, 'unavailable');
  assert.equal(unavailRes.meta.unavailablePollutants.length, 6);
});

test('system instruction includes all evidence guardrails and embedded context', () => {
  const res = buildGroundedAiContext({
    report: makeBaseReport(),
    standard: 'US_AQI',
    preferences: BASE_PREFERENCES,
  });
  const prompt = buildAirAwareSystemInstruction(res.promptContext);

  assert.match(prompt, /PROVENANCE & TRANSPARENCY/);
  assert.match(prompt, /NO UNSUPPORTED HEALTH OR TRANSPORT CLAIMS/);
  assert.match(prompt, /AFFORDABLE FAMILY ALTERNATIVES/);
  assert.match(prompt, /CLEAR 3-WAY DISTINCTION/);
  assert.match(prompt, /R K Puram, Delhi - DPCC/);
  assert.match(prompt, /"lifestyle":"Student"/);
});
