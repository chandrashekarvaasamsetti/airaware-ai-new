import L from 'leaflet';
import {
  AlertCircle,
  Compass,
  MapPin,
  Navigation,
  RefreshCw,
  Search,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { POPULAR_CITIES } from '../data/demoData';
import type {
  AirQualityReport,
  AqiStandard,
  LocationInfo,
  MonitoringStation,
} from '../types/airaware';
import { calculateAqi } from '../utils/aqi';
import { formatMeasurementAge } from '../utils/openaqMapper';

interface LiveAqiViewProps {
  report: AirQualityReport | null;
  aqiStandard: AqiStandard;
  isLoading: boolean;
  onSelectLocation: (loc: LocationInfo) => void;
  onRefresh?: () => void;
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function availabilityLabel(status: MonitoringStation['dataAvailability']): string {
  if (status === 'live') return 'Live';
  if (status === 'stale') return 'Stale';
  return 'Unavailable';
}

function availabilityTextColor(status: MonitoringStation['dataAvailability']): string {
  if (status === 'live') return 'text-[#16A34A] dark:text-emerald-400';
  if (status === 'stale') return 'text-[#F59E0B] dark:text-amber-400';
  return 'text-slate-500 dark:text-slate-400';
}

function availabilityDotColor(status: MonitoringStation['dataAvailability']): string {
  if (status === 'live') return 'bg-[#16A34A]';
  if (status === 'stale') return 'bg-[#F59E0B]';
  return 'bg-slate-400';
}

export function LiveAqiView({
  report,
  aqiStandard,
  isLoading,
  onSelectLocation,
  onRefresh,
}: LiveAqiViewProps) {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<LocationInfo[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [geoStatus, setGeoStatus] = useState<string | null>(null);
  const [searchNotice, setSearchNotice] = useState<string | null>(null);
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const lastLocationKeyRef = useRef<string | null>(null);

  // Choose sensible default station when location changes or selected station disappears
  useEffect(() => {
    if (!report || report.stations.length === 0) {
      setSelectedStationId(null);
      return;
    }

    const locationKey = `${report.location.latitude.toFixed(4)},${report.location.longitude.toFixed(4)}`;
    const locationChanged = lastLocationKeyRef.current !== locationKey;
    lastLocationKeyRef.current = locationKey;

    const currentExists =
      !locationChanged &&
      selectedStationId !== null &&
      report.stations.some((s) => s.id === selectedStationId);

    if (!currentExists) {
      const preferred =
        report.stations.find((s) => s.dataAvailability === 'live') ?? report.stations[0];
      setSelectedStationId(preferred.id);
    }
  }, [report, selectedStationId]);

  const selectedStation = useMemo(() => {
    if (!report || report.stations.length === 0) return null;
    return (
      report.stations.find((s) => s.id === selectedStationId) ??
      report.stations.find((s) => s.dataAvailability === 'live') ??
      report.stations[0]
    );
  }, [report, selectedStationId]);

  const fallbackStation = useMemo(
    () => report?.stations.find((s) => s.id === 'open-meteo-cams') ?? null,
    [report]
  );

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSearchError('Enter at least 2 characters to search for a city or neighborhood.');
      return;
    }

    setSearching(true);
    setSearchError(null);
    setSearchNotice(null);
    try {
      const res = await fetch(`/api/locations/search?q=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Search failed');
      }
      setSearchResults(data.results ?? []);
      if ((data.results ?? []).length === 0) {
        setSearchNotice(`No matching locations found for "${trimmed}". Try a nearby major city.`);
      } else if (data.notice) {
        setSearchNotice(data.notice);
      }
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Unable to search locations right now.');
    } finally {
      setSearching(false);
    }
  };

  const handleGeolocation = () => {
    if (!navigator.geolocation) {
      setGeoStatus('Browser geolocation is not supported in this browser.');
      return;
    }
    setGeoStatus('Requesting browser location permission...');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(
            `/api/locations/reverse?lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}`
          );
          const data = await res.json();
          if (!res.ok || !data.location) {
            throw new Error('Reverse lookup unavailable');
          }
          setGeoStatus(`Located: ${data.location.name}, ${data.location.country}`);
          onSelectLocation(data.location);
        } catch {
          onSelectLocation({
            name: 'My Current Location',
            country: 'Detected Coordinates',
            latitude,
            longitude,
          });
          setGeoStatus('Located using browser coordinates.');
        }
      },
      (err) => {
        setGeoStatus(`Location permission unavailable (${err.message}). You can search by city below.`);
      },
      { timeout: 10000 }
    );
  };

  // Initialize Leaflet map once
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (!mapInstanceRef.current) {
      const initialLat = report?.location.latitude ?? 28.6139;
      const initialLon = report?.location.longitude ?? 77.209;
      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLon],
        zoom: 11,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(map);

      markerLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerLayerRef.current = null;
      }
    };
  }, []);

  // Render station markers cleanly
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = markerLayerRef.current;
    if (!map || !layer || !report) return;

    layer.clearLayers();
    map.setView([report.location.latitude, report.location.longitude], 11, { animate: true });

    const stations = report.stations;
    if (stations.length === 0) {
      L.circleMarker([report.location.latitude, report.location.longitude], {
        radius: 10,
        color: '#0F172A',
        fillColor: '#94A3B8',
        fillOpacity: 0.75,
        weight: 2,
      })
        .bindPopup(
          `<strong>${escapeHtml(report.location.name)}</strong><br/>No ground stations reported.`
        )
        .addTo(layer);
      return;
    }

    for (const station of stations) {
      const stAqi = calculateAqi(station.pollutants, aqiStandard);
      const isSelected = selectedStation?.id === station.id;
      const isLive = station.dataAvailability === 'live';

      const marker = L.circleMarker([station.latitude, station.longitude], {
        radius: isSelected ? 13 : 10,
        color: isSelected ? '#16A34A' : '#0F172A',
        fillColor: isLive && stAqi.aqi !== null ? stAqi.category.colorHex : '#94A3B8',
        fillOpacity: isLive ? 0.9 : 0.55,
        weight: isSelected ? 3 : 2,
      });

      const tsLabel = station.lastUpdated
        ? `${formatMeasurementAge(station.lastUpdated)} (${new Date(station.lastUpdated).toLocaleString()})`
        : 'No timestamp reported';

      const readingsSummary = isLive
        ? `PM2.5: ${station.pollutants.pm25 ?? '—'} µg/m³ · PM10: ${station.pollutants.pm10 ?? '—'} µg/m³<br/>` +
          `NO2: ${station.pollutants.no2 ?? '—'} · SO2: ${station.pollutants.so2 ?? '—'} · O3: ${station.pollutants.o3 ?? '—'} µg/m³`
        : escapeHtml(station.availabilityNote);

      marker.bindPopup(
        `<div style="min-width:195px;font-family:sans-serif;font-size:12px;line-height:1.45;">
          <strong>${escapeHtml(station.name)}</strong><br/>
          <span>${escapeHtml(station.provider)} · <strong>${availabilityLabel(station.dataAvailability)}</strong></span><br/>
          <span>${escapeHtml(stAqi.standardLabel)}: <strong>${isLive && stAqi.aqi !== null ? stAqi.aqi : 'Unavailable'}</strong>${isLive && stAqi.aqi !== null ? ` (${escapeHtml(stAqi.category.label)})` : ''}</span><br/>
          <span>${readingsSummary}</span><br/>
          <span style="color:#64748b;font-size:11px;">${escapeHtml(tsLabel)}</span>
        </div>`
      );

      marker.on('click', () => {
        setSelectedStationId(station.id);
      });

      marker.addTo(layer);
    }
  }, [report, aqiStandard, selectedStation?.id]);

  const selectedStationAqi = useMemo(() => {
    if (!selectedStation) return null;
    return calculateAqi(selectedStation.pollutants, aqiStandard);
  }, [selectedStation, aqiStandard]);

  const selectedPollutantCards = useMemo(() => {
    if (!selectedStation) return [];
    const p = selectedStation.pollutants;
    return [
      { key: 'PM2.5', value: p.pm25, unit: 'µg/m³', note: 'Fine particles' },
      { key: 'PM10', value: p.pm10, unit: 'µg/m³', note: 'Coarse dust' },
      { key: 'NO2', value: p.no2, unit: 'µg/m³', note: 'Traffic gas' },
      { key: 'SO2', value: p.so2, unit: 'µg/m³', note: 'Sulfur dioxide' },
      {
        key: 'CO',
        value: p.co !== null ? Number((p.co / 1000).toFixed(2)) : null,
        unit: 'mg/m³',
        note: 'Carbon monoxide',
      },
      { key: 'O3', value: p.o3, unit: 'µg/m³', note: 'Ground ozone' },
    ];
  }, [selectedStation]);

  return (
    <div className="space-y-6">
      {/* Search & Geolocation Panel */}
      <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-bold text-[#0F172A] dark:text-white">
              Search City or Area
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Query verified coordinates worldwide or use browser geolocation with your permission.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 self-start">
            <button
              type="button"
              onClick={handleGeolocation}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-[#0F172A] dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              <Navigation className="h-3.5 w-3.5 text-[#16A34A]" />
              <span>Use My Location</span>
            </button>
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isLoading}
                data-testid="live-aqi-refresh-button"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-[#0F172A] dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60 transition-colors whitespace-nowrap"
              >
                <RefreshCw className={`h-3.5 w-3.5 text-[#16A34A] ${isLoading ? 'animate-spin' : ''}`} />
                <span>{isLoading ? 'Refreshing...' : 'Refresh AQI'}</span>
              </button>
            )}
          </div>
        </div>

        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <label htmlFor="city-search-input" className="sr-only">
              Search city or neighborhood
            </label>
            <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="city-search-input"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter city or area (e.g., Delhi, Mumbai, London, Tokyo)..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
            />
          </div>
          <button
            type="submit"
            disabled={searching}
            className="px-5 py-2.5 rounded-lg bg-[#16A34A] hover:bg-[#14532D] disabled:opacity-60 text-white text-sm font-semibold transition-colors whitespace-nowrap"
          >
            {searching ? 'Searching...' : 'Search City'}
          </button>
        </form>

        {geoStatus && (
          <p className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
            <Compass className="h-3.5 w-3.5 text-[#16A34A]" />
            <span>{geoStatus}</span>
          </p>
        )}

        {searchError && (
          <p className="text-xs text-[#DC2626] flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>{searchError}</span>
          </p>
        )}

        {searchNotice && (
          <p className="text-xs text-amber-700 dark:text-amber-300">{searchNotice}</p>
        )}

        {searchResults.length > 0 && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
              Search Results
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {searchResults.map((loc, idx) => (
                <button
                  key={`${loc.name}-${loc.latitude}-${idx}`}
                  type="button"
                  onClick={() => {
                    onSelectLocation(loc);
                    setSearchResults([]);
                  }}
                  className="flex items-center justify-between gap-2 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-[#16A34A] text-left transition-colors bg-[#F8FAFC] dark:bg-slate-800/50"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[#0F172A] dark:text-white truncate">
                      {loc.name}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {loc.region ? `${loc.region}, ` : ''}
                      {loc.country}
                    </div>
                  </div>
                  <MapPin className="h-4 w-4 text-[#16A34A] shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs text-slate-500 dark:text-slate-400">Quick cities:</span>
          {POPULAR_CITIES.map((city) => {
            const active = report?.location.name === city.name;
            return (
              <button
                key={city.name}
                type="button"
                onClick={() => onSelectLocation(city)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  active
                    ? 'bg-[#14532D] text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {city.name}
              </button>
            );
          })}
        </div>
      </section>

      {/* Interactive Map + Monitoring Stations */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <section className="xl:col-span-7 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
            <div>
              <h3 className="font-display text-base font-bold text-[#0F172A] dark:text-white">
                Monitoring Stations Map
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                OpenStreetMap interactive view · Click markers to inspect station pollutants
              </p>
            </div>
            {isLoading && (
              <span className="text-xs font-medium text-[#16A34A]">Refreshing readings...</span>
            )}
          </div>
          <div
            ref={mapContainerRef}
            data-testid="leaflet-aqi-map"
            className="h-[380px] w-full bg-slate-100 dark:bg-slate-800"
          />
        </section>

        <section className="xl:col-span-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 flex flex-col gap-4">
          <div>
            <h3 className="font-display text-base font-bold text-[#0F172A] dark:text-white">
              Station & Source Transparency
            </h3>
            {report && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Active Source: {report.dataSource} · Timestamp:{' '}
                <span className="font-mono tabular-nums">
                  {new Date(report.lastUpdated).toLocaleString()}
                </span>
              </p>
            )}
          </div>

          {report?.notice && (
            <div
              data-testid="live-aqi-notice"
              className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 leading-relaxed"
            >
              {report.notice}
            </div>
          )}

          {report && report.stations.length > 0 ? (
            <div className="space-y-2.5 overflow-y-auto max-h-[300px] pr-1">
              {report.stations.map((st) => {
                const stAqi = calculateAqi(st.pollutants, aqiStandard);
                const isSelected = selectedStation?.id === st.id;
                const isLive = st.dataAvailability === 'live';

                return (
                  <button
                    key={st.id}
                    type="button"
                    data-testid={`station-card-${st.id}`}
                    onClick={() => {
                      setSelectedStationId(st.id);
                      mapInstanceRef.current?.panTo([st.latitude, st.longitude], { animate: true });
                    }}
                    className={`w-full text-left p-3.5 rounded-lg border transition-colors space-y-2 ${
                      isSelected
                        ? 'border-[#16A34A] bg-emerald-50/40 dark:bg-emerald-950/20'
                        : 'border-slate-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-[#0F172A] dark:text-white truncate">
                          {st.name}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {st.provider}
                          {st.distanceKm !== null ? ` · ${st.distanceKm} km away` : ''}
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 text-[11px] font-medium">
                          <span
                            className={`inline-block h-2 w-2 rounded-full ${availabilityDotColor(
                              st.dataAvailability
                            )}`}
                          />
                          <span className={availabilityTextColor(st.dataAvailability)}>
                            {availabilityLabel(st.dataAvailability)}
                          </span>
                          <span className="text-slate-400">·</span>
                          <span className="text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                            {formatMeasurementAge(st.lastUpdated)}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div
                          className="font-mono text-xl font-bold tabular-nums"
                          style={{
                            color: isLive && stAqi.aqi !== null ? stAqi.category.colorHex : '#64748B',
                          }}
                        >
                          {isLive && stAqi.aqi !== null ? stAqi.aqi : 'N/A'}
                        </div>
                        <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                          {isLive && stAqi.aqi !== null ? stAqi.category.label : 'No Recent Data'}
                        </div>
                      </div>
                    </div>

                    {isLive ? (
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/70 dark:border-slate-700/70 text-xs font-mono tabular-nums">
                        <div>
                          <span className="text-slate-500 dark:text-slate-400">PM2.5:</span>{' '}
                          <span className="text-[#0F172A] dark:text-white">
                            {st.pollutants.pm25 ?? '—'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 dark:text-slate-400">PM10:</span>{' '}
                          <span className="text-[#0F172A] dark:text-white">
                            {st.pollutants.pm10 ?? '—'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 dark:text-slate-400">NO2:</span>{' '}
                          <span className="text-[#0F172A] dark:text-white">
                            {st.pollutants.no2 ?? '—'}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="pt-2 border-t border-slate-200/70 dark:border-slate-700/70 text-[11px] text-slate-500 dark:text-slate-400">
                        {st.availabilityNote}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-6 text-center rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
              No active monitoring stations were returned for these coordinates. Follow general local
              air quality precautions and reduce traffic-side exposure during winter mornings and
              evenings.
            </div>
          )}
        </section>
      </div>

      {/* Selected Station Pollutant Breakdown */}
      {selectedStation && selectedStationAqi && (
        <section
          data-testid="selected-station-details"
          className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-5"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-[#16A34A] dark:text-emerald-400">
                Selected Station · {selectedStation.stationType === 'atmospheric-model' ? 'Fallback Atmospheric Model' : selectedStation.stationType === 'demo' ? 'Demo Reference' : 'Ground Monitoring Station'}
              </p>
              <h3 className="font-display text-lg font-bold text-[#0F172A] dark:text-white mt-0.5">
                {selectedStation.name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Source: {selectedStation.provider} · Availability:{' '}
                <span className={`font-semibold ${availabilityTextColor(selectedStation.dataAvailability)}`}>
                  {availabilityLabel(selectedStation.dataAvailability)}
                </span>{' '}
                · Measured:{' '}
                <span className="font-mono tabular-nums">
                  {selectedStation.lastUpdated
                    ? new Date(selectedStation.lastUpdated).toLocaleString()
                    : 'No measurement timestamp'}
                </span>
              </p>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <div className="text-left md:text-right">
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  {selectedStationAqi.standardLabel}
                </div>
                <div
                  className="font-mono text-3xl font-bold tabular-nums"
                  style={{
                    color:
                      selectedStation.dataAvailability === 'live' && selectedStationAqi.aqi !== null
                        ? selectedStationAqi.category.colorHex
                        : '#64748B',
                  }}
                >
                  {selectedStation.dataAvailability === 'live' && selectedStationAqi.aqi !== null
                    ? selectedStationAqi.aqi
                    : 'Unavailable'}
                </div>
                <div className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  {selectedStation.dataAvailability === 'live' && selectedStationAqi.aqi !== null
                    ? selectedStationAqi.category.label
                    : 'No recent measurements'}
                </div>
              </div>
            </div>
          </div>

          {selectedStation.dataAvailability !== 'live' && (
            <div className="p-4 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                <AlertCircle className="h-4 w-4 text-[#F59E0B] shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Station measurements unavailable: </span>
                  <span>
                    {selectedStation.availabilityNote}. AirAware AI never invents or extrapolates
                    missing ground sensor readings.
                  </span>
                </div>
              </div>
              {fallbackStation && fallbackStation.id !== selectedStation.id && (
                <button
                  type="button"
                  onClick={() => setSelectedStationId(fallbackStation.id)}
                  className="px-3.5 py-2 rounded-lg bg-[#16A34A] hover:bg-[#14532D] text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
                >
                  View Open-Meteo CAMS Fallback
                </button>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {selectedPollutantCards.map((card) => (
              <div
                key={card.key}
                className="p-3.5 rounded-lg bg-[#F8FAFC] dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700/70"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#0F172A] dark:text-white">{card.key}</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">{card.note}</span>
                </div>
                <div className="mt-2 font-mono text-xl font-bold text-[#0F172A] dark:text-white tabular-nums">
                  {selectedStation.dataAvailability === 'live' && card.value !== null
                    ? card.value
                    : 'N/A'}
                  <span className="ml-1 text-[11px] font-normal text-slate-500 dark:text-slate-400">
                    {selectedStation.dataAvailability === 'live' && card.value !== null
                      ? card.unit
                      : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
