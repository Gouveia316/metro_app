import { fetchOfficialStationArrivals } from "@/api/client";
import type { StationArrivalsResult } from "@/api/client";

const DEFAULT_STATION_ARRIVALS_TTL_MS = 20_000;

type StationArrivalsCacheEntry = {
  cachedAt: number;
  data: StationArrivalsResult;
};

type FetchStationArrivalsCachedOptions = {
  forceRefresh?: boolean;
  ttlMs?: number;
};

const stationArrivalsCache = new Map<string, StationArrivalsCacheEntry>();

export function getCachedStationArrivals(stationId: string) {
  return stationArrivalsCache.get(stationId)?.data ?? null;
}

export function setCachedStationArrivals(stationId: string, data: StationArrivalsResult) {
  stationArrivalsCache.set(stationId, {
    cachedAt: Date.now(),
    data,
  });
}

export function isStationArrivalsFresh(stationId: string, ttlMs = DEFAULT_STATION_ARRIVALS_TTL_MS) {
  const entry = stationArrivalsCache.get(stationId);

  return entry ? Date.now() - entry.cachedAt <= ttlMs : false;
}

export async function fetchStationArrivalsCached(
  stationId: string,
  options: FetchStationArrivalsCachedOptions = {},
) {
  const ttlMs = options.ttlMs ?? DEFAULT_STATION_ARRIVALS_TTL_MS;
  const cachedData = getCachedStationArrivals(stationId);

  if (!options.forceRefresh && cachedData && isStationArrivalsFresh(stationId, ttlMs)) {
    return cachedData;
  }

  const freshData = await fetchOfficialStationArrivals(stationId);
  setCachedStationArrivals(stationId, freshData);

  return freshData;
}
