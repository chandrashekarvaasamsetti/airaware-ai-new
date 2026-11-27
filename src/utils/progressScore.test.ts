import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateSustainabilityScore } from './progressScore';

test('sustainability score caps accurately at 100 and reflects sub-components', () => {
  const full = calculateSustainabilityScore({
    ecoTripsLoggedCount: 10,
    totalCo2AvoidedKg: 25,
    completedChallengesCount: 6,
    totalChallengesAvailable: 6,
    completedHomeChecklistCount: 8,
    totalHomeChecklistCount: 8,
  });

  assert.equal(full.transportPoints, 35);
  assert.equal(full.challengePoints, 35);
  assert.equal(full.indoorPoints, 30);
  assert.equal(full.totalScore, 100);
  assert.equal(full.tierLabel, 'Clean Air Champion');
});

test('zero inputs return 0 score without NaN', () => {
  const empty = calculateSustainabilityScore({
    ecoTripsLoggedCount: 0,
    totalCo2AvoidedKg: 0,
    completedChallengesCount: 0,
    totalChallengesAvailable: 0,
    completedHomeChecklistCount: 0,
    totalHomeChecklistCount: 0,
  });
  assert.equal(empty.totalScore, 0);
  assert.equal(empty.tierLabel, 'Getting Started');
});
