import { BACKEND_BASE_URL } from "@/api/config";
import { lines } from "@/data/mockData";
import type { LineStatus, MetroLine, Station } from "@/data/mockData";

type NormalizedLineStatus = "normal" | "interrupted" | "closed" | "disrupted" | "unknown";

type NormalizedLine = {
  id: string;
  namePt: string;
  nameEn: string;
  color: string;
  status: NormalizedLineStatus;
  statusReason: "strike" | "closed" | null;
  message: string;
};

type NormalizedLinesResponse = {
  source: string;
  updatedAt: string;
  lines: NormalizedLine[];
};

export type OfficialLineStatusResult = {
  lines: MetroLine[];
  source: NormalizedLinesResponse["source"];
  updatedAt: string;
};

type NormalizedStation = {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  lineIds: string[];
  zone: string | null;
};

type NormalizedStationsResponse = {
  source: string;
  updatedAt: string;
  stations: NormalizedStation[];
};

export type OfficialStationsResult = {
  source: NormalizedStationsResponse["source"];
  stations: Station[];
  updatedAt: string;
};

export type OfficialWaitTimeArrival = {
  id: string;
  minutes: number;
  trainId: string;
};

export type OfficialWaitTime = {
  arrivals: OfficialWaitTimeArrival[];
  destinationCode: string;
  destinationName: string | null;
  outOfService: boolean;
  platformId: string;
  rawTimestamp: string;
};

type NormalizedStationArrival = {
  trainId: string;
  minutes: number;
};

type NormalizedStationPlatform = {
  id: string;
  destinationCode: string | null;
  destinationName: string | null;
  outOfService: boolean;
  rawTimestamp: string | null;
  arrivals: NormalizedStationArrival[];
};

type NormalizedStationArrivalsResponse = {
  source: string;
  updatedAt: string;
  stationId: string;
  state: "arrivals_available" | "service_closed" | "no_arrivals_available" | "no_live_data";
  emptyReason: "strike" | "closed" | "all_arrivals_unavailable" | "station_not_found_in_wait_times" | null;
  platforms: NormalizedStationPlatform[];
};

export type StationArrivalsResult = {
  emptyReason: NormalizedStationArrivalsResponse["emptyReason"];
  platforms: OfficialWaitTime[];
  source: NormalizedStationArrivalsResponse["source"];
  state: NormalizedStationArrivalsResponse["state"];
  stationId: string;
  updatedAt: string;
};

let officialStationsCache: Station[] = [];

function mapNormalizedLineStatus(status: NormalizedLineStatus): LineStatus {
  if (status === "normal") {
    return "good_service";
  }

  if (status === "interrupted") {
    return "suspended";
  }

  if (status === "closed") {
    return "closed";
  }

  if (status === "disrupted") {
    return "disrupted";
  }

  return "unknown";
}

function getStatusLabelKey(status: LineStatus): MetroLine["statusLabelKey"] {
  if (status === "good_service") {
    return "line.status.good";
  }

  if (status === "suspended") {
    return "line.status.suspended";
  }

  if (status === "closed") {
    return "line.status.closed";
  }

  if (status === "unknown") {
    return "line.status.unknown";
  }

  if (status === "disrupted") {
    return "line.status.disrupted";
  }

  return "line.status.minorDelays";
}

function getFallbackMessageKey(status: LineStatus): MetroLine["noteKey"] {
  if (status === "good_service") {
    return "line.statusMessage.normal";
  }

  if (status === "suspended") {
    return "line.statusMessage.interrupted";
  }

  if (status === "closed") {
    return "line.statusMessage.closed";
  }

  if (status === "unknown") {
    return "line.statusMessage.unknown";
  }

  return "line.statusMessage.disrupted";
}

function mapNormalizedLines(response: NormalizedLinesResponse): MetroLine[] {
  const lineById: Record<string, MetroLine> = Object.fromEntries(lines.map((line) => [line.id, line]));

  return response.lines.map((line) => {
    const existingLine = lineById[line.id] ?? lines[0];
    const status = mapNormalizedLineStatus(line.status);
    const message = line.message.trim();

    return {
      ...existingLine,
      color: line.color || existingLine.color,
      id: line.id,
      note: message || undefined,
      noteKey: message ? existingLine.noteKey : getFallbackMessageKey(status),
      status,
      statusLabelKey: getStatusLabelKey(status),
      statusReason: line.statusReason,
    };
  });
}

function mapNormalizedStations(response: NormalizedStationsResponse): Station[] {
  return response.stations.map((station) => ({
    id: station.id,
    name: station.name,
    latitude: station.latitude ?? undefined,
    lineIds: station.lineIds,
    lines: station.lineIds,
    longitude: station.longitude ?? undefined,
    zone: station.zone ?? undefined,
  }));
}

function mapNormalizedStationPlatforms(response: NormalizedStationArrivalsResponse): OfficialWaitTime[] {
  return response.platforms.map((platform) => ({
    arrivals: platform.arrivals.map((arrival, arrivalIndex) => ({
      id: `${platform.id}-${arrival.trainId}-${arrivalIndex}`,
      minutes: arrival.minutes,
      trainId: arrival.trainId,
    })),
    destinationCode: platform.destinationCode ?? "",
    destinationName: platform.destinationName,
    outOfService: platform.outOfService,
    platformId: platform.id,
    rawTimestamp: platform.rawTimestamp ?? "",
  }));
}

export async function fetchOfficialLineStatus(): Promise<OfficialLineStatusResult> {
  const response = await fetch(`${BACKEND_BASE_URL}/metro/lines/status`);

  if (!response.ok) {
    throw new Error(`Metro lines request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as NormalizedLinesResponse;

  return {
    lines: mapNormalizedLines(payload),
    source: payload.source,
    updatedAt: payload.updatedAt,
  };
}

export async function fetchOfficialStations(): Promise<OfficialStationsResult> {
  const response = await fetch(`${BACKEND_BASE_URL}/metro/stations`);

  if (!response.ok) {
    throw new Error(`Metro stations request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as NormalizedStationsResponse;
  officialStationsCache = mapNormalizedStations(payload);

  return {
    source: payload.source,
    stations: officialStationsCache,
    updatedAt: payload.updatedAt,
  };
}

export function getCachedOfficialStation(stationId: string) {
  return officialStationsCache.find((station) => station.id === stationId);
}

export async function fetchOfficialStationArrivals(stationId: string): Promise<StationArrivalsResult> {
  const response = await fetch(`${BACKEND_BASE_URL}/metro/stations/${stationId}/arrivals`);

  if (!response.ok) {
    throw new Error(`Metro station arrivals request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as NormalizedStationArrivalsResponse;

  return {
    emptyReason: payload.emptyReason,
    platforms: mapNormalizedStationPlatforms(payload),
    source: payload.source,
    state: payload.state,
    stationId: payload.stationId,
    updatedAt: payload.updatedAt,
  };
}
