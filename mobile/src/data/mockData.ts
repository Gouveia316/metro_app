import type { TranslationKey } from "@/i18n/translations";
import { lineColors } from "@/styles/theme";

export type LineStatus = "good_service" | "minor_delays" | "suspended" | "closed" | "disrupted" | "unknown";
export type AlertSeverity = "info" | "warning" | "critical";

export type MetroLine = {
  id: string;
  nameKey: TranslationKey;
  color: string;
  status: LineStatus;
  statusLabelKey: TranslationKey;
  note?: string;
  noteKey: TranslationKey;
};

export type Station = {
  id: string;
  name: string;
  lines: string[];
  areaKey: TranslationKey;
};

export type Arrival = {
  id: string;
  directionKey: TranslationKey;
  destination: string;
  lineId: string;
  minutes: number;
  platform: string;
};

export type Alert = {
  id: string;
  severity: AlertSeverity;
  titleKey: TranslationKey;
  messageKey: TranslationKey;
  affectedLines: string[];
};

// TODO: Replace local mocked data with calls to the FastAPI backend.
export const lines: MetroLine[] = [
  {
    id: "blue",
    nameKey: "line.blue.name",
    color: lineColors.blue,
    status: "good_service",
    statusLabelKey: "line.status.good",
    noteKey: "line.blue.note",
  },
  {
    id: "yellow",
    nameKey: "line.yellow.name",
    color: lineColors.yellow,
    status: "minor_delays",
    statusLabelKey: "line.status.minorDelays",
    noteKey: "line.yellow.note",
  },
  {
    id: "green",
    nameKey: "line.green.name",
    color: lineColors.green,
    status: "good_service",
    statusLabelKey: "line.status.good",
    noteKey: "line.green.note",
  },
  {
    id: "red",
    nameKey: "line.red.name",
    color: lineColors.red,
    status: "good_service",
    statusLabelKey: "line.status.good",
    noteKey: "line.red.note",
  },
];

export const lineById: Record<string, MetroLine> = Object.fromEntries(
  lines.map((line) => [line.id, line]),
);

export const stations: Station[] = [
  { id: "baixa-chiado", name: "Baixa-Chiado", areaKey: "area.baixaChiado", lines: ["blue", "green"] },
  { id: "campo-grande", name: "Campo Grande", areaKey: "area.alvalade", lines: ["green", "yellow"] },
  { id: "marques-pombal", name: "Marques de Pombal", areaKey: "area.avenida", lines: ["blue", "yellow"] },
  { id: "oriente", name: "Oriente", areaKey: "area.parqueNacoes", lines: ["red"] },
  { id: "saldanha", name: "Saldanha", areaKey: "area.avenidasNovas", lines: ["red", "yellow"] },
  { id: "sao-sebastiao", name: "Sao Sebastiao", areaKey: "area.campolide", lines: ["blue", "red"] },
];

export const arrivalsByStation: Record<string, Arrival[]> = {
  "baixa-chiado": [
    { id: "arr-1", directionKey: "direction.reboleira", destination: "Reboleira", lineId: "blue", minutes: 3, platform: "1" },
    { id: "arr-2", directionKey: "direction.caisSodre", destination: "Cais do Sodre", lineId: "green", minutes: 6, platform: "2" },
    { id: "arr-13", directionKey: "direction.santaApolonia", destination: "Santa Apolonia", lineId: "blue", minutes: 9, platform: "2" },
  ],
  "campo-grande": [
    { id: "arr-3", directionKey: "direction.telheiras", destination: "Telheiras", lineId: "green", minutes: 2, platform: "1" },
    { id: "arr-4", directionKey: "direction.odivelas", destination: "Odivelas", lineId: "yellow", minutes: 8, platform: "3" },
    { id: "arr-14", directionKey: "direction.caisSodre", destination: "Cais do Sodre", lineId: "green", minutes: 12, platform: "2" },
  ],
  "marques-pombal": [
    { id: "arr-5", directionKey: "direction.santaApolonia", destination: "Santa Apolonia", lineId: "blue", minutes: 4, platform: "2" },
    { id: "arr-6", directionKey: "direction.rato", destination: "Rato", lineId: "yellow", minutes: 7, platform: "1" },
    { id: "arr-15", directionKey: "direction.reboleira", destination: "Reboleira", lineId: "blue", minutes: 11, platform: "1" },
  ],
  oriente: [
    { id: "arr-7", directionKey: "direction.aeroporto", destination: "Aeroporto", lineId: "red", minutes: 5, platform: "1" },
    { id: "arr-8", directionKey: "direction.saoSebastiao", destination: "Sao Sebastiao", lineId: "red", minutes: 11, platform: "2" },
  ],
  saldanha: [
    { id: "arr-9", directionKey: "direction.aeroporto", destination: "Aeroporto", lineId: "red", minutes: 1, platform: "1" },
    { id: "arr-10", directionKey: "direction.odivelas", destination: "Odivelas", lineId: "yellow", minutes: 9, platform: "2" },
    { id: "arr-16", directionKey: "direction.saoSebastiao", destination: "Sao Sebastiao", lineId: "red", minutes: 13, platform: "2" },
  ],
  "sao-sebastiao": [
    { id: "arr-11", directionKey: "direction.aeroporto", destination: "Aeroporto", lineId: "red", minutes: 4, platform: "1" },
    { id: "arr-12", directionKey: "direction.reboleira", destination: "Reboleira", lineId: "blue", minutes: 10, platform: "2" },
    { id: "arr-17", directionKey: "direction.santaApolonia", destination: "Santa Apolonia", lineId: "blue", minutes: 14, platform: "1" },
  ],
};

export const alerts: Alert[] = [
  {
    id: "alert-1",
    severity: "warning",
    titleKey: "alert.yellow.title",
    messageKey: "alert.yellow.message",
    affectedLines: ["yellow"],
  },
  {
    id: "alert-2",
    severity: "info",
    titleKey: "alert.maintenance.title",
    messageKey: "alert.maintenance.message",
    affectedLines: ["blue", "green"],
  },
  {
    id: "alert-3",
    severity: "critical",
    titleKey: "alert.lift.title",
    messageKey: "alert.lift.message",
    affectedLines: ["red"],
  },
];
