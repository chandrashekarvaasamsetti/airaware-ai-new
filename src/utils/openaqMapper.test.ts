import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isTimestampRecent,
  mapOpenAqStation,
  normalizeToUgPerM3,
} from './openaqMapper';

test('normalizes OpenAQ gas units (ppm, ppb, mg/m3) to µg/m³ accurately', () => {
  assert.equal(normalizeToUgPerM3('co', 1.2, 'mg/m3'), 1200);
  assert.equal(normalizeToUgPerM3('co', 1.3, 'µg/m³'), 1300);
  assert.equal(normalizeToUgPerM3('co', 1.3, 'ppb'), 1300);
  assert.equal(normalizeToUgPerM3('co', 250, 'ppb'), 286.3);
  assert.equal(normalizeToUgPerM3('co', 1, 'ppm'), 1145);
  assert.equal(normalizeToUgPerM3('no2', 20, 'ppb'), 37.6);
  assert.equal(normalizeToUgPerM3('pm25', 64.5, 'µg/m³'), 64.5);
  assert.equal(normalizeToUgPerM3('pm10', -5, 'µg/m³'), null);
});

test('maps OpenAQ v3 /latest measurements via sensorsId and verifies recency', () => {
  const nowMs = Date.parse('2026-11-27T12:00:00Z');
  const recentStation = mapOpenAqStation({
    nowMs,
    distanceKm: 4.2,
    location: {
      id: 17,
      name: 'R K Puram, Delhi - DPCC',
      provider: { name: 'CPCB' },
      coordinates: { latitude: 28.563, longitude: 77.186 },
      datetimeLast: { utc: '2026-11-27T11:30:00Z' },
      sensors: [
        { id: 101, parameter: { name: 'pm25', units: 'µg/m³' } },
        { id: 102, parameter: { name: 'pm10', units: 'µg/m³' } },
        { id: 103, parameter: { name: 'no2', units: 'µg/m³' } },
        { id: 104, parameter: { name: 'so2', units: 'µg/m³' } },
        { id: 105, parameter: { name: 'co', units: 'mg/m3' } },
        { id: 106, parameter: { name: 'o3', units: 'µg/m³' } },
      ],
    },
    latestResults: [
      { sensorsId: 101, value: 112.4, datetime: { utc: '2026-11-27T11:30:00Z' } },
      { sensorsId: 102, value: 185.0, datetime: { utc: '2026-11-27T11:30:00Z' } },
      { sensorsId: 103, value: 44.2, datetime: { utc: '2026-11-27T11:30:00Z' } },
      { sensorsId: 104, value: 12.1, datetime: { utc: '2026-11-27T11:30:00Z' } },
      { sensorsId: 105, value: 1.5, datetime: { utc: '2026-11-27T11:30:00Z' } },
      { sensorsId: 106, value: 51.8, datetime: { utc: '2026-11-27T11:30:00Z' } },
    ],
  });

  assert.ok(recentStation);
  assert.equal(recentStation.hasRecentData, true);
  assert.equal(recentStation.dataAvailability, 'live');
  assert.equal(recentStation.pollutants.pm25, 112.4);
  assert.equal(recentStation.pollutants.pm10, 185);
  assert.equal(recentStation.pollutants.no2, 44.2);
  assert.equal(recentStation.pollutants.so2, 12.1);
  assert.equal(recentStation.pollutants.co, 1500);
  assert.equal(recentStation.pollutants.o3, 51.8);
});

test('flags stale 2018 station measurements as stale instead of treating them as live', () => {
  const nowMs = Date.parse('2026-11-27T12:00:00Z');
  assert.equal(isTimestampRecent('2018-02-22T04:00:00Z', nowMs), false);

  const staleStation = mapOpenAqStation({
    nowMs,
    distanceKm: 16.9,
    location: {
      id: 13,
      name: 'Old Station',
      provider: { name: 'CPCB' },
      coordinates: { latitude: 28.744, longitude: 77.12 },
      datetimeLast: { utc: '2018-02-22T04:00:00Z' },
      sensors: [{ id: 201, parameter: { name: 'pm25', units: 'µg/m³' } }],
    },
    latestResults: [{ sensorsId: 201, value: 99, datetime: { utc: '2018-02-22T04:00:00Z' } }],
  });

  assert.ok(staleStation);
  assert.equal(staleStation.hasRecentData, false);
  assert.equal(staleStation.dataAvailability, 'stale');
  assert.equal(staleStation.pollutants.pm25, null);
});
