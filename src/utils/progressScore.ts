export interface SustainabilityScoreInput {
  ecoTripsLoggedCount: number;
  totalCo2AvoidedKg: number;
  completedChallengesCount: number;
  totalChallengesAvailable: number;
  completedHomeChecklistCount: number;
  totalHomeChecklistCount: number;
}

export interface SustainabilityScoreBreakdown {
  totalScore: number; // 0 to 100
  transportPoints: number; // max 35
  challengePoints: number; // max 35
  indoorPoints: number; // max 30
  tierLabel: string;
  rulesExplanation: string[];
}

export function calculateSustainabilityScore(input: SustainabilityScoreInput): SustainabilityScoreBreakdown {
  // Transparent scoring rules (100 points total):
  // 1. Clean Transport & CO2 Avoided (35 pts max):
  //    Up to 15 pts for logging up to 5 eco-friendly trips (3 pts/trip) + up to 20 pts for CO2 avoided (1 pt per 0.5 kg avoided, max 10 kg).
  const tripPts = Math.min(15, Math.max(0, input.ecoTripsLoggedCount) * 3);
  const co2Pts = Math.min(20, Math.round(Math.max(0, input.totalCo2AvoidedKg) * 2));
  const transportPoints = Math.min(35, tripPts + co2Pts);

  // 2. Daily Go Green Challenges (35 pts max):
  //    Proportional to challenges completed out of available challenges.
  const challengeRatio =
    input.totalChallengesAvailable > 0
      ? Math.min(1, Math.max(0, input.completedChallengesCount) / input.totalChallengesAvailable)
      : 0;
  const challengePoints = Math.round(challengeRatio * 35);

  // 3. Clean Air at Home Checklist (30 pts max):
  //    Proportional to indoor air quality safeguards completed.
  const homeRatio =
    input.totalHomeChecklistCount > 0
      ? Math.min(1, Math.max(0, input.completedHomeChecklistCount) / input.totalHomeChecklistCount)
      : 0;
  const indoorPoints = Math.round(homeRatio * 30);

  const totalScore = Math.min(100, transportPoints + challengePoints + indoorPoints);

  let tierLabel = 'Getting Started';
  if (totalScore >= 80) tierLabel = 'Clean Air Champion';
  else if (totalScore >= 55) tierLabel = 'Steady Steward';
  else if (totalScore >= 25) tierLabel = 'Active Explorer';

  return {
    totalScore,
    transportPoints,
    challengePoints,
    indoorPoints,
    tierLabel,
    rulesExplanation: [
      'Clean Transport (35 pts max): 3 pts per logged eco-trip (up to 15 pts) + 2 pts per kg of CO2 avoided (up to 20 pts).',
      'Go Green Challenges (35 pts max): Percentage of daily sustainability challenges completed.',
      'Clean Air at Home (30 pts max): Percentage of indoor air quality checklist actions completed.',
    ],
  };
}
