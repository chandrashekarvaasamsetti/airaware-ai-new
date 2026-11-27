import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { buildDemoAirQualityReport, POPULAR_CITIES } from './src/data/demoData.ts';
import type {
  AirQualityReport,
  AqiHistoryPoint,
  AqiStandard,
  LocationInfo,
  MonitoringStation,
  PollutantReadings,
  UserPreferences,
  WeatherSnapshot,
} from './src/types/airaware.ts';
import {
  hasAnyPollutantReading,
  isTimestampRecent,
  mapOpenAqStation,
  type OpenAqLatestMeasurement,
  type OpenAqLocationMeta,
} from './src/utils/openaqMapper.ts';
import {
  buildAirAwareSystemInstruction,
  buildGroundedAiContext,
} from './src/utils/aiContext.ts';
import { calculateAqi } from './src/utils/aqi.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rawPort = process.env.PORT?.trim();
const parsedPort = rawPort ? Number.parseInt(rawPort, 10) : 3000;
const PORT = Number.isInteger(parsedPort) && parsedPort > 0 && parsedPort <= 65535 ? parsedPort : 3000;

process.on('unhandledRejection', (reason) => {
  console.error('[AirAware] Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[AirAware] Uncaught Exception:', err);
  process.exit(1);
});

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function generateContentWithRetry(
  ai: GoogleGenAI,
  params: Parameters<GoogleGenAI['models']['generateContent']>[0]
) {
  const modelsToTry = [params.model, 'gemini-3.1-flash-lite'];
  let lastError: unknown;

  for (const modelName of modelsToTry) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await ai.models.generateContent({ ...params, model: modelName });
      } catch (err) {
        lastError = err;
        const msg = err instanceof Error ? err.message : String(err);
        const isTransient = msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('429');
        if (!isTransient) {
          throw err;
        }
        await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)));
      }
    }
  }

  throw lastError;
}

function weatherCodeToLabel(code: number | null | undefined): string {
  if (code === null || code === undefined) return 'Unavailable';
  if (code === 0) return 'Clear Sky';
  if (code <= 3) return 'Partly Cloudy';
  if (code === 45 || code === 48) return 'Fog / Haze';
  if (code >= 51 && code <= 67) return 'Rain / Drizzle';
  if (code >= 71 && code <= 77) return 'Snow';
  if (code >= 80 && code <= 82) return 'Rain Showers';
  if (code >= 95) return 'Thunderstorm';
  return 'Mixed Conditions';
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return Number((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1));
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

interface OpenAqFetchResult {
  stations: MonitoringStation[];
  status: NonNullable<AirQualityReport['openAqStatus']>;
  errorMessage?: string;
}

async function fetchOpenAqStations(lat: number, lon: number): Promise<OpenAqFetchResult> {
  const apiKey = process.env.OPENAQ_API_KEY?.trim();
  if (!apiKey) {
    return { stations: [], status: 'unconfigured' };
  }

  try {
    const url = `https://api.openaq.org/v3/locations?coordinates=${lat.toFixed(4)},${lon.toFixed(4)}&radius=25000&limit=15`;
    const headers = {
      'X-API-Key': apiKey,
      Accept: 'application/json',
    };

    const res = await fetchWithTimeout(url, { headers }, 7500);
    if (res.status === 401 || res.status === 403) {
      return {
        stations: [],
        status: 'error',
        errorMessage: `OpenAQ API authentication failed (HTTP ${res.status}).`,
      };
    }
    if (!res.ok) {
      return {
        stations: [],
        status: 'error',
        errorMessage: `OpenAQ API returned HTTP ${res.status}.`,
      };
    }

    const data = (await res.json()) as { results?: OpenAqLocationMeta[] };
    const nowMs = Date.now();

    const validCandidates = (data.results ?? [])
      .filter(
        (loc) =>
          typeof loc.coordinates?.latitude === 'number' &&
          typeof loc.coordinates?.longitude === 'number'
      )
      .map((loc) => ({
        loc,
        distanceKm: haversineKm(
          lat,
          lon,
          loc.coordinates!.latitude!,
          loc.coordinates!.longitude!
        ),
        isLikelyRecent: isTimestampRecent(loc.datetimeLast?.utc, nowMs),
      }))
      .sort((a, b) => {
        if (a.isLikelyRecent !== b.isLikelyRecent) {
          return a.isLikelyRecent ? -1 : 1;
        }
        return a.distanceKm - b.distanceKm;
      })
      .slice(0, 8);

    if (validCandidates.length === 0) {
      return { stations: [], status: 'no-stations' };
    }

    const mappedResults = await Promise.all(
      validCandidates.map(async ({ loc, distanceKm }) => {
        let latestResults: OpenAqLatestMeasurement[] = [];
        try {
          const latestUrl = `https://api.openaq.org/v3/locations/${loc.id}/latest`;
          const latestRes = await fetchWithTimeout(latestUrl, { headers }, 6000);
          if (latestRes.ok) {
            const latestJson = (await latestRes.json()) as {
              results?: OpenAqLatestMeasurement[];
            };
            latestResults = latestJson.results ?? [];
          }
        } catch {
          latestResults = [];
        }

        return mapOpenAqStation({
          location: loc,
          latestResults,
          distanceKm,
          nowMs,
        });
      })
    );

    const priorityOrder: Record<MonitoringStation['dataAvailability'], number> = {
      live: 0,
      stale: 1,
      unavailable: 2,
    };

    const stations = mappedResults
      .filter((s): s is MonitoringStation => s !== null)
      .sort((a, b) => {
        const diff = priorityOrder[a.dataAvailability] - priorityOrder[b.dataAvailability];
        if (diff !== 0) return diff;
        return (a.distanceKm ?? 999) - (b.distanceKm ?? 999);
      });

    const hasLive = stations.some((s) => s.dataAvailability === 'live');
    return {
      stations,
      status: hasLive ? 'live' : stations.length > 0 ? 'stale-only' : 'no-stations',
    };
  } catch (err) {
    return {
      stations: [],
      status: 'error',
      errorMessage: err instanceof Error ? err.message : 'Unable to reach OpenAQ API.',
    };
  }
}

async function fetchLiveAirQualityReport(location: LocationInfo): Promise<AirQualityReport> {
  const { latitude: lat, longitude: lon } = location;

  try {
    const aqUrl =
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}` +
      `&current=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone` +
      `&hourly=pm10,pm2_5,nitrogen_dioxide,ozone&past_days=7&forecast_days=1&timezone=GMT`;

    const weatherUrl =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}` +
      `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&timezone=GMT`;

    const [aqRes, weatherRes, openAqResult] = await Promise.all([
      fetchWithTimeout(aqUrl, {}, 8500),
      fetchWithTimeout(weatherUrl, {}, 8000).catch(() => null),
      fetchOpenAqStations(lat, lon),
    ]);

    if (!aqRes.ok) {
      throw new Error(`Air quality API returned HTTP ${aqRes.status}`);
    }

    const aqJson = (await aqRes.json()) as {
      current?: {
        time?: string;
        pm2_5?: number | null;
        pm10?: number | null;
        nitrogen_dioxide?: number | null;
        sulphur_dioxide?: number | null;
        carbon_monoxide?: number | null;
        ozone?: number | null;
      };
      hourly?: {
        time?: string[];
        pm2_5?: Array<number | null>;
        pm10?: Array<number | null>;
        nitrogen_dioxide?: Array<number | null>;
        ozone?: Array<number | null>;
      };
    };

    const toUtcIso = (raw: string | undefined): string => {
      if (!raw) return new Date().toISOString();
      const normalized = raw.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(raw) ? raw : `${raw}Z`;
      const parsed = new Date(normalized);
      return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
    };

    let weather: WeatherSnapshot = {
      temperatureC: null,
      humidityPercent: null,
      windSpeedKmh: null,
      condition: 'Weather data unavailable',
    };

    if (weatherRes && weatherRes.ok) {
      const wJson = (await weatherRes.json()) as {
        current?: {
          temperature_2m?: number | null;
          relative_humidity_2m?: number | null;
          wind_speed_10m?: number | null;
          weather_code?: number | null;
        };
      };
      weather = {
        temperatureC: wJson.current?.temperature_2m ?? null,
        humidityPercent: wJson.current?.relative_humidity_2m ?? null,
        windSpeedKmh: wJson.current?.wind_speed_10m ?? null,
        condition: weatherCodeToLabel(wJson.current?.weather_code),
      };
    }

    const times = aqJson.hourly?.time ?? [];
    const pm25Arr = aqJson.hourly?.pm2_5 ?? [];
    const pm10Arr = aqJson.hourly?.pm10 ?? [];
    const no2Arr = aqJson.hourly?.nitrogen_dioxide ?? [];
    const o3Arr = aqJson.hourly?.ozone ?? [];

    const nowMs = Date.now();
    const pastPoints: AqiHistoryPoint[] = [];
    for (let i = 0; i < times.length; i++) {
      const isoTs = toUtcIso(times[i]);
      const tsMs = Date.parse(isoTs);
      if (tsMs <= nowMs) {
        const dt = new Date(isoTs);
        pastPoints.push({
          timestamp: isoTs,
          label: `${String(dt.getUTCHours()).padStart(2, '0')}:00`,
          pm25: pm25Arr[i] ?? null,
          pm10: pm10Arr[i] ?? null,
          no2: no2Arr[i] ?? null,
          o3: o3Arr[i] ?? null,
        });
      }
    }

    const hourlyHistory = pastPoints.slice(-24);

    const dayMap = new Map<string, { pm25: number[]; pm10: number[]; no2: number[]; o3: number[]; ts: string }>();
    for (const pt of pastPoints) {
      const dayKey = pt.timestamp.slice(0, 10);
      if (!dayMap.has(dayKey)) {
        dayMap.set(dayKey, { pm25: [], pm10: [], no2: [], o3: [], ts: pt.timestamp });
      }
      const entry = dayMap.get(dayKey)!;
      if (pt.pm25 !== null) entry.pm25.push(pt.pm25);
      if (pt.pm10 !== null) entry.pm10.push(pt.pm10);
      if (pt.no2 !== null) entry.no2.push(pt.no2);
      if (pt.o3 !== null) entry.o3.push(pt.o3);
    }

    const avg = (arr: number[]) =>
      arr.length ? Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1)) : null;

    const dailyHistory: AqiHistoryPoint[] = Array.from(dayMap.entries())
      .slice(-7)
      .map(([dayKey, bucket]) => {
        const d = new Date(dayKey + 'T12:00:00Z');
        return {
          timestamp: bucket.ts,
          label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }),
          pm25: avg(bucket.pm25),
          pm10: avg(bucket.pm10),
          no2: avg(bucket.no2),
          o3: avg(bucket.o3),
        };
      });

    const roundOpt = (v: number | null | undefined) =>
      typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Number(v.toFixed(1)) : null;

    const openMeteoPollutants: PollutantReadings = {
      pm25: roundOpt(aqJson.current?.pm2_5),
      pm10: roundOpt(aqJson.current?.pm10),
      no2: roundOpt(aqJson.current?.nitrogen_dioxide),
      so2: roundOpt(aqJson.current?.sulphur_dioxide),
      co: roundOpt(aqJson.current?.carbon_monoxide),
      o3: roundOpt(aqJson.current?.ozone),
    };

    const openMeteoTimestamp = toUtcIso(aqJson.current?.time);
    const openMeteoAvailable = hasAnyPollutantReading(openMeteoPollutants);

    const openMeteoStation: MonitoringStation = {
      id: 'open-meteo-cams',
      name: `${location.name} Atmospheric Grid Point`,
      provider: 'Open-Meteo CAMS Atmospheric Model',
      latitude: lat,
      longitude: lon,
      distanceKm: 0,
      lastUpdated: openMeteoTimestamp,
      hasRecentData: openMeteoAvailable,
      dataAvailability: openMeteoAvailable ? 'live' : 'unavailable',
      availabilityNote: openMeteoAvailable
        ? 'Open-Meteo CAMS atmospheric model · Live fallback & regional trend'
        : 'Open-Meteo CAMS atmospheric readings unavailable right now.',
      stationType: 'atmospheric-model',
      pollutants: openMeteoPollutants,
      isDemo: false,
    };

    const liveOpenAqStations = openAqResult.stations.filter((s) => s.dataAvailability === 'live');
    const primaryGroundStation =
      liveOpenAqStations.find((s) => s.pollutants.pm25 !== null || s.pollutants.pm10 !== null) ??
      liveOpenAqStations[0];

    let reportPollutants: PollutantReadings = openMeteoPollutants;
    let dataSource = 'Open-Meteo CAMS Atmospheric Model (Fallback)';
    let lastUpdated = openMeteoTimestamp;
    let notice: string | undefined;

    const staleOrUnavailableCount = openAqResult.stations.filter(
      (s) => s.dataAvailability !== 'live'
    ).length;

    if (primaryGroundStation) {
      const supplemented: string[] = [];
      const pick = (key: keyof PollutantReadings, label: string): number | null => {
        const groundVal = primaryGroundStation.pollutants[key];
        if (groundVal !== null) return groundVal;
        const camsVal = openMeteoPollutants[key];
        if (camsVal !== null) {
          supplemented.push(label);
          return camsVal;
        }
        return null;
      };

      reportPollutants = {
        pm25: pick('pm25', 'PM2.5'),
        pm10: pick('pm10', 'PM10'),
        no2: pick('no2', 'NO2'),
        so2: pick('so2', 'SO2'),
        co: pick('co', 'CO'),
        o3: pick('o3', 'O3'),
      };

      lastUpdated = primaryGroundStation.lastUpdated ?? openMeteoTimestamp;
      dataSource =
        supplemented.length > 0
          ? `OpenAQ (${primaryGroundStation.name}) + Open-Meteo CAMS (${supplemented.join(', ')})`
          : `OpenAQ Ground Station (${primaryGroundStation.name})`;

      const parts: string[] = [
        `Showing verified ground measurements from ${primaryGroundStation.name} (${liveOpenAqStations.length} active OpenAQ station${liveOpenAqStations.length > 1 ? 's' : ''} nearby).`,
      ];
      if (supplemented.length > 0) {
        parts.push(`Unmeasured gases (${supplemented.join(', ')}) are supplemented by Open-Meteo CAMS.`);
      }
      if (staleOrUnavailableCount > 0) {
        parts.push(
          `${staleOrUnavailableCount} nearby sensor${staleOrUnavailableCount > 1 ? 's' : ''} had no recent readings in the last 72 hours.`
        );
      }
      notice = parts.join(' ');
    } else {
      if (openAqResult.status === 'unconfigured') {
        notice =
          'OpenAQ API key is not configured on the server. Using Open-Meteo CAMS atmospheric model as the live fallback provider.';
      } else if (openAqResult.status === 'error') {
        notice = `${openAqResult.errorMessage || 'OpenAQ ground station service was unavailable.'} Using Open-Meteo CAMS atmospheric model as the live fallback provider.`;
      } else if (openAqResult.status === 'stale-only') {
        notice = `Nearby OpenAQ stations (${openAqResult.stations.length}) have no recent measurements from the past 72 hours. Using Open-Meteo CAMS atmospheric model as the live fallback provider.`;
      } else {
        notice = `No OpenAQ ground monitoring stations were found within 25 km of ${location.name}. Using Open-Meteo CAMS atmospheric model as the live fallback provider.`;
      }
    }

    const stations: MonitoringStation[] = primaryGroundStation
      ? [...openAqResult.stations, openMeteoStation]
      : [openMeteoStation, ...openAqResult.stations];

    return {
      location,
      pollutants: reportPollutants,
      weather,
      hourlyHistory,
      dailyHistory,
      stations,
      dataSource,
      lastUpdated,
      fetchedAt: new Date().toISOString(),
      openAqStatus: openAqResult.status,
      isDemo: false,
      notice,
    };
  } catch {
    return buildDemoAirQualityReport(
      location,
      'Live external air quality services are currently unreachable. Displaying clearly labelled DEMO data.'
    );
  }
}

async function startServer() {
  const app = express();
  app.disable('x-powered-by');
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    const geminiConfigured = Boolean(
      process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
    );
    const openAqConfigured = Boolean(process.env.OPENAQ_API_KEY?.trim());
    res.json({
      ok: true,
      geminiConfigured,
      openAqConfigured,
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/locations/search', async (req, res) => {
    const rawQ = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (!rawQ || rawQ.length < 2 || rawQ.length > 80) {
      return res.status(400).json({ error: 'Please enter a city or area name (2 to 80 characters).' });
    }

    try {
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(rawQ)}&count=6&language=en&format=json`;
      const response = await fetchWithTimeout(url, {}, 7000);
      if (!response.ok) {
        throw new Error(`Geocoding service responded with status ${response.status}`);
      }
      const json = (await response.json()) as {
        results?: Array<{
          name: string;
          admin1?: string;
          country?: string;
          latitude: number;
          longitude: number;
        }>;
      };

      const results: LocationInfo[] = (json.results ?? []).map((item) => ({
        name: item.name,
        region: item.admin1,
        country: item.country || 'Unknown',
        latitude: item.latitude,
        longitude: item.longitude,
      }));

      return res.json({ results, isDemo: false });
    } catch {
      const lower = rawQ.toLowerCase();
      const matched = POPULAR_CITIES.filter(
        (c) => c.name.toLowerCase().includes(lower) || c.country.toLowerCase().includes(lower)
      );
      return res.json({
        results: matched,
        isDemo: true,
        notice: 'Live location geocoding is currently unreachable; showing built-in demo cities.',
      });
    }
  });

  app.get('/api/locations/reverse', async (req, res) => {
    const lat = Number(req.query.lat);
    const lon = Number(req.query.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return res.status(400).json({ error: 'Invalid latitude or longitude coordinates.' });
    }

    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat.toFixed(5)}&lon=${lon.toFixed(5)}`;
      const response = await fetchWithTimeout(
        url,
        { headers: { 'User-Agent': 'AirAware-AI-App/1.0' } },
        7000
      );
      if (!response.ok) {
        throw new Error('Reverse geocoding failed');
      }
      const data = (await response.json()) as {
        address?: {
          city?: string;
          town?: string;
          village?: string;
          suburb?: string;
          state?: string;
          country?: string;
        };
      };
      const addr = data.address ?? {};
      const cityName = addr.city || addr.town || addr.village || addr.suburb || 'Current Location';
      const location: LocationInfo = {
        name: cityName,
        region: addr.state,
        country: addr.country || 'Detected Region',
        latitude: lat,
        longitude: lon,
      };
      return res.json({ location });
    } catch {
      return res.json({
        location: {
          name: `Coordinates (${lat.toFixed(2)}, ${lon.toFixed(2)})`,
          country: 'Detected Coordinates',
          latitude: lat,
          longitude: lon,
        },
      });
    }
  });

  app.get('/api/air-quality', async (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');

    const lat = Number(req.query.lat);
    const lon = Number(req.query.lon);
    const name =
      typeof req.query.name === 'string' && req.query.name.trim()
        ? req.query.name.trim().slice(0, 120)
        : 'Selected Location';
    const country = typeof req.query.country === 'string' ? req.query.country.trim().slice(0, 120) : '';
    const region = typeof req.query.region === 'string' ? req.query.region.trim().slice(0, 120) : undefined;

    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return res.status(400).json({ error: 'Valid latitude and longitude coordinates are required.' });
    }

    const report = await fetchLiveAirQualityReport({ name, region, country, latitude: lat, longitude: lon });
    return res.json(report);
  });

  app.post('/api/ai/chat', async (req, res) => {
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error:
          'Gemini API key is not configured on the server. Please add GEMINI_API_KEY in the Settings > Secrets panel.',
      });
    }

    const { message, history, location, aqiStandard, preferences } = req.body ?? {};
    if (typeof message !== 'string' || !message.trim() || message.trim().length > 1500) {
      return res.status(400).json({ error: 'Message must be a non-empty string under 1,500 characters.' });
    }

    const safeHistory = Array.isArray(history)
      ? history
          .slice(-8)
          .filter(
            (m: unknown): m is { role: 'user' | 'assistant'; content: string } =>
              Boolean(m) &&
              typeof m === 'object' &&
              ((m as { role?: string }).role === 'user' || (m as { role?: string }).role === 'assistant') &&
              typeof (m as { content?: unknown }).content === 'string'
          )
      : [];

    const standard: AqiStandard = aqiStandard === 'CPCB_INDIA' ? 'CPCB_INDIA' : 'US_AQI';

    let latestReport: AirQualityReport | null = null;
    if (
      location &&
      typeof location === 'object' &&
      Number.isFinite(Number((location as LocationInfo).latitude)) &&
      Number.isFinite(Number((location as LocationInfo).longitude))
    ) {
      const lat = Number((location as LocationInfo).latitude);
      const lon = Number((location as LocationInfo).longitude);
      if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
        const loc: LocationInfo = {
          name:
            typeof (location as LocationInfo).name === 'string' && (location as LocationInfo).name.trim()
              ? (location as LocationInfo).name.trim().slice(0, 120)
              : 'Selected Location',
          region:
            typeof (location as LocationInfo).region === 'string'
              ? (location as LocationInfo).region!.trim().slice(0, 120)
              : undefined,
          country:
            typeof (location as LocationInfo).country === 'string'
              ? (location as LocationInfo).country.trim().slice(0, 120)
              : '',
          latitude: lat,
          longitude: lon,
        };
        latestReport = await fetchLiveAirQualityReport(loc);
      }
    }

    const safePreferences: Partial<UserPreferences> | undefined =
      preferences && typeof preferences === 'object' ? (preferences as Partial<UserPreferences>) : undefined;

    const grounded = buildGroundedAiContext({
      report: latestReport,
      standard,
      preferences: safePreferences,
    });

    const systemInstruction = buildAirAwareSystemInstruction(grounded.promptContext);

    try {
      const contents = [
        ...safeHistory.map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content.slice(0, 1500) }],
        })),
        { role: 'user', parts: [{ text: message.trim() }] },
      ];

      const response = await generateContentWithRetry(ai, {
        model: 'gemini-4-hydrogen',
        contents,
        config: {
          systemInstruction,
        },
      });

      const replyText = response.text?.trim();
      if (!replyText) {
        return res.status(502).json({ error: 'AirAware Assistant returned an empty response. Please try again.' });
      }

      return res.json({
        reply: replyText,
        groundedMeta: grounded.meta,
        latestReport,
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Unexpected Gemini API error';
      console.error('Gemini /api/ai/chat error:', errMsg);
      if (errMsg.includes('API_KEY') || errMsg.includes('403') || errMsg.includes('PERMISSION_DENIED')) {
        return res.status(403).json({
          error: 'Gemini API key was rejected. Please verify GEMINI_API_KEY in Settings > Secrets.',
        });
      }
      if (errMsg.includes('503') || errMsg.includes('UNAVAILABLE')) {
        return res.status(503).json({
          error: 'Gemini AI is temporarily experiencing high demand. Please retry in a few seconds.',
        });
      }
      return res.status(502).json({
        error: 'Could not reach Gemini AI right now. Please try again shortly.',
      });
    }
  });

  app.post('/api/ai/routine', async (req, res) => {
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error:
          'Gemini API key is not configured on the server. Please add GEMINI_API_KEY in the Settings > Secrets panel.',
      });
    }

    const { profile, airQuality, location, aqiStandard } = req.body ?? {};
    if (!profile || typeof profile !== 'object' || Array.isArray(profile)) {
      return res.status(400).json({ error: 'User routine profile is required.' });
    }

    const rawProfile = profile as Record<string, unknown>;
    const cleanStr = (val: unknown, fallback: string, maxLen = 140) =>
      typeof val === 'string' && val.trim() ? val.trim().slice(0, maxLen) : fallback;
    const rawSens =
      rawProfile.sensitiveConsiderations && typeof rawProfile.sensitiveConsiderations === 'object'
        ? (rawProfile.sensitiveConsiderations as Record<string, unknown>)
        : {};

    const sanitizedProfile = {
      location: cleanStr(rawProfile.location, 'Selected Location', 120),
      lifestyle: cleanStr(rawProfile.lifestyle, 'Working Professional', 60),
      wakeUpTime: cleanStr(rawProfile.wakeUpTime, '07:00', 10),
      outdoorPreference: cleanStr(rawProfile.outdoorPreference, 'Morning walk', 140),
      primaryTransport: cleanStr(rawProfile.primaryTransport, 'public_bus', 40),
      householdPreference: cleanStr(rawProfile.householdPreference, 'Indoor air filtration', 140),
      sensitiveConsiderations: {
        children: Boolean(rawSens.children),
        olderAdults: Boolean(rawSens.olderAdults),
        respiratorySensitivity: Boolean(rawSens.respiratorySensitivity),
      },
    };

    const standard: AqiStandard = aqiStandard === 'CPCB_INDIA' ? 'CPCB_INDIA' : 'US_AQI';
    let routineAirContext: Record<string, unknown> = {};

    if (
      location &&
      typeof location === 'object' &&
      Number.isFinite(Number((location as LocationInfo).latitude)) &&
      Number.isFinite(Number((location as LocationInfo).longitude))
    ) {
      const lat = Number((location as LocationInfo).latitude);
      const lon = Number((location as LocationInfo).longitude);
      if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
        const loc: LocationInfo = {
          name: cleanStr((location as LocationInfo).name, sanitizedProfile.location, 120),
          region:
            typeof (location as LocationInfo).region === 'string'
              ? (location as LocationInfo).region!.trim().slice(0, 120)
              : undefined,
          country: cleanStr((location as LocationInfo).country, '', 120),
          latitude: lat,
          longitude: lon,
        };
        const latestReport = await fetchLiveAirQualityReport(loc);
        const calc = calculateAqi(latestReport.pollutants, standard);
        routineAirContext = {
          standard: calc.standardLabel,
          aqi: calc.aqi,
          category: calc.category.label,
          dominantPollutant: calc.dominantPollutant,
          pm25: latestReport.pollutants.pm25,
          pm10: latestReport.pollutants.pm10,
          weather: latestReport.weather,
          dataSource: latestReport.dataSource,
          lastUpdated: latestReport.lastUpdated,
          isDemo: latestReport.isDemo,
        };
      }
    } else if (airQuality && typeof airQuality === 'object' && !Array.isArray(airQuality)) {
      const aq = airQuality as Record<string, unknown>;
      routineAirContext = {
        standard: cleanStr(aq.standard, 'US EPA AQI', 40),
        aqi: typeof aq.aqi === 'number' && Number.isFinite(aq.aqi) ? aq.aqi : null,
        category: cleanStr(aq.category, 'Unavailable', 60),
        dominantPollutant: typeof aq.dominantPollutant === 'string' ? aq.dominantPollutant.slice(0, 20) : null,
        pm25: typeof aq.pm25 === 'number' && Number.isFinite(aq.pm25) ? aq.pm25 : null,
        pm10: typeof aq.pm10 === 'number' && Number.isFinite(aq.pm10) ? aq.pm10 : null,
        isDemo: Boolean(aq.isDemo),
      };
    }

    const systemInstruction = [
      'You are AirAware AI Daily Routine Planner.',
      'Generate a realistic, personalized 4-period daily plan (Morning, Afternoon, Evening, Night) adapted dynamically to the provided air quality measurements, weather, wake-up time, lifestyle, transport preference, household preferences, and sensitivity considerations.',
      'Do not invent pollutant numbers not present in the input. Keep actions practical, plain-language, and include a clear reason for each recommendation.',
      'Never give medical diagnoses or medication changes.',
    ].join(' ');

    const prompt = `Create a personalized daily clean-air routine using this context:\nProfile: ${JSON.stringify(
      sanitizedProfile
    )}\nAir Quality Context: ${JSON.stringify(routineAirContext)}`;

    try {
      const response = await generateContentWithRetry(ai, {
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: {
                type: Type.STRING,
                description: 'A 1-2 sentence overview of today’s air quality adaptation strategy.',
              },
              blocks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    period: {
                      type: Type.STRING,
                      description: 'Exactly one of: Morning, Afternoon, Evening, Night',
                    },
                    timeRange: {
                      type: Type.STRING,
                      description: 'Suggested time window adapted to user wake-up time.',
                    },
                    environment: {
                      type: Type.STRING,
                      description: 'Exactly one of: Indoor, Outdoor, Flexible',
                    },
                    title: {
                      type: Type.STRING,
                      description: 'Short plain-language title for this time block.',
                    },
                    actions: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          recommendation: { type: Type.STRING },
                          reason: { type: Type.STRING },
                        },
                        required: ['recommendation', 'reason'],
                      },
                    },
                  },
                  required: ['period', 'timeRange', 'environment', 'title', 'actions'],
                },
              },
            },
            required: ['summary', 'blocks'],
          },
        },
      });

      const rawText = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawText) as { summary?: unknown; blocks?: unknown };
      if (!Array.isArray(parsed.blocks) || parsed.blocks.length === 0) {
        return res.status(502).json({ error: 'Daily routine response was incomplete. Please try again.' });
      }
      return res.json(parsed);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Unexpected Gemini API error';
      console.error('Gemini /api/ai/routine error:', errMsg);
      if (errMsg.includes('503') || errMsg.includes('UNAVAILABLE')) {
        return res.status(503).json({
          error: 'Gemini AI is temporarily experiencing high demand. Please click Generate Daily Plan again shortly.',
        });
      }
      return res.status(502).json({
        error: 'Failed to generate AI daily routine right now. Please try again.',
      });
    }
  });

  app.use('/api/*', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  const distDir = path.resolve(__dirname, 'dist');
  const indexFile = path.join(distDir, 'index.html');
  const hasDistBuild = fs.existsSync(indexFile);
  const isDevLifecycle = process.env.npm_lifecycle_event === 'dev';
  const isProduction =
    process.env.NODE_ENV === 'production' ||
    (!isDevLifecycle && process.env.npm_lifecycle_event === 'start' && hasDistBuild);

  const geminiConfigured = Boolean(
    process.env.GEMINI_API_KEY?.trim() && process.env.GEMINI_API_KEY.trim() !== 'MY_GEMINI_API_KEY'
  );
  const openAqConfigured = Boolean(process.env.OPENAQ_API_KEY?.trim());

  console.log('[AirAware] Initializing server', {
    host: '0.0.0.0',
    port: PORT,
    nodeVersion: process.version,
    nodeEnv: process.env.NODE_ENV ?? 'unset',
    mode: isProduction ? 'production' : 'development',
    distBuilt: hasDistBuild,
    geminiConfigured,
    openAqConfigured,
  });

  const mountStaticProduction = () => {
    if (!hasDistBuild) {
      console.warn(
        `[AirAware] Production static directory not found at ${indexFile}. Run "npm run build" before starting.`
      );
    }
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(503).send('Production build not found. Run npm run build first.');
      }
    });
  };

  // Vite dev middleware or static production build
  if (!isProduction) {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (viteErr) {
      console.error('[AirAware] Failed to initialize Vite middleware; falling back to static dist:', viteErr);
      mountStaticProduction();
    }
  } else {
    mountStaticProduction();
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(
      `[AirAware] Server listening on http://0.0.0.0:${PORT} (mode=${isProduction ? 'production' : 'development'})`
    );
  });

  server.on('error', (err) => {
    console.error('[AirAware] HTTP server listen error:', err);
    process.exit(1);
  });
}

startServer().catch((err) => {
  console.error('[AirAware] Fatal startup error:', err);
  process.exit(1);
});
