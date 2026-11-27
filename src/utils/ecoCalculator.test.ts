import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateEcoImpact } from './ecoCalculator';

test('calculates CO2 avoided when switching from personal car to public bus', () => {
  const result = calculateEcoImpact({
    chosenMode: 'public_bus',
    baselineMode: 'personal_car',
    distanceKmPerTrip: 10,
    tripsCount: 5,
    fuelPricePerLiter: 1.2,
  });

  assert.equal(result.totalDistanceKm, 50);
  assert.equal(result.baselineCo2Kg, 9.6); // 50 * 0.192
  assert.equal(result.chosenCo2Kg, 4.45);  // 50 * 0.089
  assert.equal(result.co2AvoidedKg, 5.15);
  assert.equal(result.fuelSavedLiters, 3.75); // 50 * 0.075
  assert.equal(result.estimatedFuelCostSaved, 4.5);
});

test('bicycle and walking produce zero CO2 and clamp negative inputs safely', () => {
  const bike = calculateEcoImpact({
    chosenMode: 'bicycle',
    baselineMode: 'personal_car',
    distanceKmPerTrip: 5,
    tripsCount: 2,
  });
  assert.equal(bike.chosenCo2Kg, 0);
  assert.equal(bike.co2AvoidedKg, 1.92);

  const negative = calculateEcoImpact({
    chosenMode: 'walking',
    baselineMode: 'personal_car',
    distanceKmPerTrip: -10,
    tripsCount: -2,
    fuelPricePerLiter: -5,
  });
  assert.equal(negative.totalDistanceKm, 0);
  assert.equal(negative.co2AvoidedKg, 0);
  assert.equal(negative.estimatedFuelCostSaved, 0);

  const nanFuel = calculateEcoImpact({
    chosenMode: 'bicycle',
    baselineMode: 'personal_car',
    distanceKmPerTrip: 10,
    tripsCount: 2,
    fuelPricePerLiter: Number.NaN,
  });
  assert.equal(nanFuel.fuelSavedLiters, 1.5);
  assert.equal(nanFuel.estimatedFuelCostSaved, 1.72);
});
