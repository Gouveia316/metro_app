import { BACKEND_BASE_URL } from "@/api/config";
import { lines } from "@/data/mockData";
import type { LineStatus, MetroLine } from "@/data/mockData";

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

const officialLineFields: Record<
  MetroLine["id"],
  { messageKey: OfficialLineKey; shortStatusKey: OfficialLineShortKey }
> = {
  blue: { messageKey: "azul", shortStatusKey: "azul_curta" },
  yellow: { messageKey: "amarela", shortStatusKey: "amarela_curta" },
  green: { messageKey: "verde", shortStatusKey: "verde_curta" },
  red: { messageKey: "vermelha", shortStatusKey: "vermelha_curta" },
};

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
