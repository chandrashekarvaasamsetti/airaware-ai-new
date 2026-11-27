export type AqiStandard = 'US_AQI' | 'CPCB_INDIA';

export type NavSection =
  | 'dashboard'
  | 'live-aqi'
  | 'ai-assistant'
  | 'daily-routine'
  | 'clean-home'
  | 'eco-calculator'
  | 'alerts'
  | 'family-protection'
  | 'go-green'
  | 'education'
  | 'community'
  | 'progress'
  | 'settings';

export type LifestyleType = 'Student' | 'Working Professional' | 'Homemaker' | 'Other';

export type TransportMode =
  | 'personal_car'
  | 'motorcycle'
  | 'public_bus'
  | 'electric_vehicle'
  | 'bicycle'
  | 'walking';

export interface LocationInfo {
  name: string;
  region?: string;
  country: string;
  latitude: number;
  longitude: number;
}

export interface PollutantReadings {
  pm25: number | null; // µg/m³
  pm10: number | null; // µg/m³
  no2: number | null;  // µg/m³
  so2: number | null;  // µg/m³
  co: number | null;   // µg/m³
  o3: number | null;   // µg/m³
}

export interface WeatherSnapshot {
  temperatureC: number | null;
  humidityPercent: number | null;
  windSpeedKmh: number | null;
  condition: string;
}

export interface AqiHistoryPoint {
  timestamp: string;
  label: string;
  pm25: number | null;
  pm10: number | null;
  no2: number | null;
  o3: number | null;
}

export interface MonitoringStation {
  id: string;
  name: string;
  provider: string;
  latitude: number;
  longitude: number;
  distanceKm: number | null;
  lastUpdated: string | null;
  hasRecentData: boolean;
  dataAvailability: 'live' | 'stale' | 'unavailable';
  availabilityNote: string;
  stationType: 'ground-station' | 'atmospheric-model' | 'demo';
  pollutants: PollutantReadings;
  isDemo?: boolean;
}

export interface AirQualityReport {
  location: LocationInfo;
  pollutants: PollutantReadings;
  weather: WeatherSnapshot;
  hourlyHistory: AqiHistoryPoint[];
  dailyHistory: AqiHistoryPoint[];
  stations: MonitoringStation[];
  dataSource: string;
  lastUpdated: string;
  fetchedAt?: string;
  openAqStatus?: 'live' | 'stale-only' | 'no-stations' | 'unconfigured' | 'error';
  isDemo: boolean;
  notice?: string;
}

export interface UserPreferences {
  displayName: string;
  lifestyle: LifestyleType;
  wakeUpTime: string;
  outdoorPreference: string;
  primaryTransport: TransportMode;
  householdPreference: string;
  sensitiveConsiderations: {
    children: boolean;
    olderAdults: boolean;
    respiratorySensitivity: boolean;
  };
  aqiStandard: AqiStandard;
  alertThreshold: number;
  browserAlertsEnabled: boolean;
  theme: 'light' | 'dark';
}

export interface RoutineBlock {
  period: 'Morning' | 'Afternoon' | 'Evening' | 'Night';
  timeRange: string;
  environment: 'Indoor' | 'Outdoor' | 'Flexible';
  title: string;
  actions: Array<{
    recommendation: string;
    reason: string;
  }>;
}

export interface SavedDailyPlan {
  id: string;
  generatedAt: string;
  locationName: string;
  aqiValue: number | null;
  aqiStandard: AqiStandard;
  summary: string;
  blocks: RoutineBlock[];
  isDemo?: boolean;
}

export type AiDataStatusCategory =
  | 'live-ground'
  | 'supplemented-ground'
  | 'estimated-model'
  | 'stale'
  | 'demo'
  | 'unavailable';

export interface AiGroundedMeta {
  locationLabel: string;
  aqi: number | null;
  standardLabel: string;
  categoryLabel: string;
  dominantPollutant: string | null;
  dataSource: string;
  lastUpdated: string | null;
  fetchedAt: string | null;
  statusCategory: AiDataStatusCategory;
  statusLabel: string;
  verifiedPollutants: string[];
  estimatedPollutants: string[];
  unavailablePollutants: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  error?: boolean;
  meta?: AiGroundedMeta;
}

export interface EcoTripLog {
  id: string;
  date: string;
  chosenMode: TransportMode;
  baselineMode: TransportMode;
  distanceKm: number;
  trips: number;
  co2EmittedKg: number;
  co2AvoidedKg: number;
  fuelSavedLiters: number;
}

export interface CommunityTip {
  id: string;
  author: string;
  city: string;
  category: 'Home Air' | 'Commute' | 'Community Action' | 'School & Family';
  title: string;
  body: string;
  likes: number;
  createdAt: string;
  isUserSubmitted?: boolean;
}
