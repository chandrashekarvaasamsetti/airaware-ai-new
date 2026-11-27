import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateAqi, evaluatePollutionAlerts, getAqiCategory } from './aqi';

test('US EPA AQI computes Good and Unhealthy PM2.5 correctly without mixing scales', () => {
  const good = calculateAqi(
    { pm25: 7.2, pm10: 18, no2: 12, so2: 4, co: 300, o3: 45 },
    'US_AQI'
  );
  assert.equal(good.standardLabel, 'US EPA AQI');
  assert.equal(good.category.label, 'Good');
  assert.ok(good.aqi !== null && good.aqi <= 50);

  const unhealthy = calculateAqi(
    { pm25: 90, pm10: 120, no2: 40, so2: 10, co: 800, o3: 60 },
    'US_AQI'
  );
  assert.equal(unhealthy.dominantPollutant, 'PM2.5');
  assert.equal(unhealthy.category.label, 'Unhealthy');
  assert.ok(unhealthy.aqi !== null && unhealthy.aqi >= 151 && unhealthy.aqi <= 200);
});

test('CPCB India AQI applies official CPCB categories and breakpoints', () => {
  const satisfactory = calculateAqi(
    { pm25: 45, pm10: 85, no2: 35, so2: 15, co: 1000, o3: 55 },
    'CPCB_INDIA'
  );
  assert.equal(satisfactory.standardLabel, 'CPCB India AQI');
  assert.equal(satisfactory.category.label, 'Satisfactory');
  assert.ok(satisfactory.aqi !== null && satisfactory.aqi >= 51 && satisfactory.aqi <= 100);

  const severe = calculateAqi(
    { pm25: 320, pm10: 450, no2: 90, so2: 20, co: 2500, o3: 60 },
    'CPCB_INDIA'
  );
  assert.equal(severe.category.label, 'Severe');
  assert.ok(severe.aqi !== null && severe.aqi >= 401);
});

test('evaluatePollutionAlerts detects threshold breaches and sudden spikes', () => {
  const alerts = evaluatePollutionAlerts({
    currentAqi: 165,
    dominantPollutant: 'PM2.5',
    standard: 'US_AQI',
    locationName: 'New Delhi',
    timestamp: '2026-11-27T10:00:00Z',
    alertThreshold: 120,
    previousAqiPoints: [95, 102, 118, 165],
  });
  assert.equal(alerts.length, 2);
  assert.equal(alerts[0].severity, 'unhealthy');
  assert.equal(alerts[1].severity, 'spike');
});

test('getAqiCategory handles null AQI gracefully', () => {
  const cat = getAqiCategory(null, 'US_AQI');
  assert.equal(cat.label, 'Data Unavailable');
});

test('CPCB India distinguishes Very Poor (301-400) from Severe (401+) alerts', () => {
  const veryPoor = evaluatePollutionAlerts({
    currentAqi: 350,
    dominantPollutant: 'PM2.5',
    standard: 'CPCB_INDIA',
    locationName: 'New Delhi',
    timestamp: '2026-11-27T10:00:00Z',
    alertThreshold: 120,
  });
  assert.equal(veryPoor[0]?.id, 'alert-very-unhealthy');
  assert.equal(veryPoor[0]?.severity, 'very-unhealthy');

  const severe = evaluatePollutionAlerts({
    currentAqi: 420,
    dominantPollutant: 'PM2.5',
    standard: 'CPCB_INDIA',
    locationName: 'New Delhi',
    timestamp: '2026-11-27T10:00:00Z',
    alertThreshold: 120,
  });
  assert.equal(severe[0]?.id, 'alert-hazardous');
  assert.equal(severe[0]?.severity, 'hazardous');
});
