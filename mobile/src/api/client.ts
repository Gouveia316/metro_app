import { BACKEND_BASE_URL } from "@/api/config";
import { lines } from "@/data/mockData";
import type { LineStatus, MetroLine, Station } from "@/data/mockData";

type OfficialLineKey = "azul" | "amarela" | "verde" | "vermelha";
type OfficialLineShortKey = "azul_curta" | "amarela_curta" | "verde_curta" | "vermelha_curta";

type OfficialLinesResponse = {
  source: string;
  updatedAt: string;
  data: {
    resposta: Partial<Record<OfficialLineKey | OfficialLineShortKey, string | null | undefined>>;
    codigo: string;
  };
};

export type OfficialLineStatusResult = {
  lines: MetroLine[];
  source: OfficialLinesResponse["source"];
  updatedAt: string;
};

type OfficialStation = {
  stop_id?: string | null;
  stop_name?: string | null;
  stop_lat?: string | null;
  stop_lon?: string | null;
  linha?: string | null;
  zone_id?: string | null;
};

type OfficialStationsResponse = {
  source: string;
  updatedAt: string;
  data: {
    resposta: OfficialStation[];
    codigo: string;
  };
};

export type OfficialStationsResult = {
  source: OfficialStationsResponse["source"];
  stations: Station[];
  updatedAt: string;
};

type OfficialWaitTimeRow = {
  stop_id?: string | null;
  cais?: string | null;
  hora?: string | null;
  comboio?: string | null;
  tempoChegada1?: string | null;
  comboio2?: string | null;
  tempoChegada2?: string | null;
  comboio3?: string | null;
  tempoChegada3?: string | null;
  destino?: string | null;
  sairServico?: string | null;
};

type OfficialWaitTimesResponse = {
  source: string;
  updatedAt: string;
  data: {
    resposta: OfficialWaitTimeRow[];
    codigo: string;
  };
};

export type OfficialWaitTimeArrival = {
  id: string;
  minutes: number;
  trainId: string;
};

export type OfficialWaitTime = {
  arrivals: OfficialWaitTimeArrival[];
  destinationCode: string;
  outOfService: boolean;
  platformId: string;
  rawTimestamp: string;
  stationId: string;
};

export type OfficialWaitTimesResult = {
  source: OfficialWaitTimesResponse["source"];
  updatedAt: string;
  waitTimes: OfficialWaitTime[];
};

const officialLineFields: Record<
  MetroLine["id"],
  { messageKey: OfficialLineKey; shortStatusKey: OfficialLineShortKey }
> = {
  blue: { messageKey: "azul", shortStatusKey: "azul_curta" },
  yellow: { messageKey: "amarela", shortStatusKey: "amarela_curta" },
  green: { messageKey: "verde", shortStatusKey: "verde_curta" },
  red: { messageKey: "vermelha", shortStatusKey: "vermelha_curta" },
};

const officialLineNameToId: Record<string, string> = {
  amarela: "yellow",
  azul: "blue",
  verde: "green",
  vermelha: "red",
};

let officialStationsCache: Station[] = [];

function normalizeText(value: string | null | undefined) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeOfficialStatus(statusText: string | null | undefined): LineStatus {
  const normalizedStatus = normalizeText(statusText);

  if (!normalizedStatus) {
    return "unknown";
  }

  if (normalizedStatus === "interrompida") {
    return "suspended";
  }

  if (
    normalizedStatus.includes("servico encerrado") ||
    normalizedStatus.includes("encerrado") ||
    normalizedStatus.includes("greve")
  ) {
    return "closed";
  }

  if (normalizedStatus === "normal" || normalizedStatus === "ok") {
    return "good_service";
  }

  if (
    normalizedStatus.includes("condicionada") ||
    normalizedStatus.includes("perturbada") ||
    normalizedStatus.includes("atrasos")
  ) {
    return "disrupted";
  }

  return "disrupted";
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

function mapOfficialLines(response: OfficialLinesResponse): MetroLine[] {
  const officialStatus = response.data.resposta;

  return lines.map((line) => {
    const fields = officialLineFields[line.id];
    const status = normalizeOfficialStatus(officialStatus[fields.shortStatusKey]);
    const message = (officialStatus[fields.messageKey] ?? "").trim();

    return {
      ...line,
      note: message || undefined,
      noteKey: message ? line.noteKey : getFallbackMessageKey(status),
      status,
      statusLabelKey: getStatusLabelKey(status),
    };
  });
}

function parseOfficialLineIds(lineText: string | null | undefined) {
  return (lineText ?? "")
    .replace("[", "")
    .replace("]", "")
    .split(",")
    .map((lineName) => officialLineNameToId[normalizeText(lineName)])
    .filter((lineId): lineId is string => Boolean(lineId));
}

function parseCoordinate(value: string | null | undefined) {
  const coordinate = Number.parseFloat(value ?? "");
  return Number.isFinite(coordinate) ? coordinate : undefined;
}

function mapOfficialStations(response: OfficialStationsResponse): Station[] {
  return response.data.resposta
    .map((station) => {
      const id = station.stop_id?.trim();
      const name = station.stop_name?.trim();
      const lineIds = parseOfficialLineIds(station.linha);

      if (!id || !name) {
        return null;
      }

      return {
        id,
        name,
        latitude: parseCoordinate(station.stop_lat),
        lineIds,
        lines: lineIds,
        longitude: parseCoordinate(station.stop_lon),
        zone: station.zone_id?.trim() || undefined,
      };
    })
    .filter((station): station is Station => Boolean(station));
}

function parseArrivalMinutes(value: string | null | undefined) {
  const arrivalText = (value ?? "").trim();

  if (!arrivalText || arrivalText === "--" || !/^\d+$/.test(arrivalText)) {
    return undefined;
  }

  return Number.parseInt(arrivalText, 10);
}

function mapOfficialWaitTimeArrival(
  trainId: string | null | undefined,
  minutesText: string | null | undefined,
  id: string,
): OfficialWaitTimeArrival | undefined {
  const minutes = parseArrivalMinutes(minutesText);

  if (minutes == null) {
    return undefined;
  }

  return {
    id,
    minutes,
    trainId: trainId?.trim() || "-",
  };
}

function mapOfficialWaitTimes(response: OfficialWaitTimesResponse): OfficialWaitTime[] {
  return response.data.resposta
    .map((row, rowIndex) => {
      const stationId = row.stop_id?.trim();
      const platformId = row.cais?.trim();

      if (!stationId || !platformId) {
        return null;
      }

      const arrivals = [
        mapOfficialWaitTimeArrival(row.comboio, row.tempoChegada1, `${stationId}-${platformId}-${rowIndex}-1`),
        mapOfficialWaitTimeArrival(row.comboio2, row.tempoChegada2, `${stationId}-${platformId}-${rowIndex}-2`),
        mapOfficialWaitTimeArrival(row.comboio3, row.tempoChegada3, `${stationId}-${platformId}-${rowIndex}-3`),
      ].filter((arrival): arrival is OfficialWaitTimeArrival => Boolean(arrival));

      return {
        arrivals,
        destinationCode: row.destino?.trim() || "",
        outOfService: row.sairServico?.trim() === "1",
        platformId,
        rawTimestamp: row.hora?.trim() || "",
        stationId,
      };
    })
    .filter((waitTime): waitTime is OfficialWaitTime => Boolean(waitTime));
}

export async function fetchOfficialLineStatus(): Promise<OfficialLineStatusResult> {
  const response = await fetch(`${BACKEND_BASE_URL}/metro/official/lines`);

  if (!response.ok) {
    throw new Error(`Metro lines request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as OfficialLinesResponse;

  if (payload.data.codigo !== "200") {
    throw new Error(`Metro lines API returned code ${payload.data.codigo}`);
  }

  return {
    lines: mapOfficialLines(payload),
    source: payload.source,
    updatedAt: payload.updatedAt,
  };
}

export async function fetchOfficialStations(): Promise<OfficialStationsResult> {
  const response = await fetch(`${BACKEND_BASE_URL}/metro/official/stations`);

  if (!response.ok) {
    throw new Error(`Metro stations request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as OfficialStationsResponse;

  if (payload.data.codigo !== "200") {
    throw new Error(`Metro stations API returned code ${payload.data.codigo}`);
  }

  officialStationsCache = mapOfficialStations(payload);

  return {
    source: payload.source,
    stations: officialStationsCache,
    updatedAt: payload.updatedAt,
  };
}

export function getCachedOfficialStation(stationId: string) {
  return officialStationsCache.find((station) => station.id === stationId);
}

export async function fetchOfficialWaitTimes(): Promise<OfficialWaitTimesResult> {
  const response = await fetch(`${BACKEND_BASE_URL}/metro/official/wait-times`);

  if (!response.ok) {
    throw new Error(`Metro wait-times request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as OfficialWaitTimesResponse;

  if (payload.data.codigo !== "200") {
    throw new Error(`Metro wait-times API returned code ${payload.data.codigo}`);
  }

  return {
    source: payload.source,
    updatedAt: payload.updatedAt,
    waitTimes: mapOfficialWaitTimes(payload),
  };
}
