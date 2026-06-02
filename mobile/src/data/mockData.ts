export type LineStatus = "good_service" | "minor_delays" | "suspended";
export type AlertSeverity = "info" | "warning" | "critical";

export type MetroLine = {
  id: string;
  name: string;
  color: string;
  status: LineStatus;
  statusLabel: string;
  note: string;
};

export type Station = {
  id: string;
  name: string;
  lines: string[];
};

export type Arrival = {
  id: string;
  destination: string;
  lineId: string;
  minutes: number;
  platform: string;
};

export type Alert = {
  id: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  affectedLines: string[];
};

// TODO: Replace local mocked data with calls to the FastAPI backend.
export const lines: MetroLine[] = [
  {
    id: "blue",
    name: "Blue Line",
    color: "#2563EB",
    status: "good_service",
    statusLabel: "Good service",
    note: "Trains are running normally.",
  },
  {
    id: "yellow",
    name: "Yellow Line",
    color: "#EAB308",
    status: "minor_delays",
    statusLabel: "Minor delays",
    note: "Slight delays near Campo Grande.",
  },
  {
    id: "green",
    name: "Green Line",
    color: "#16A34A",
    status: "good_service",
    statusLabel: "Good service",
    note: "Trains are running normally.",
  },
  {
    id: "red",
    name: "Red Line",
    color: "#DC2626",
    status: "good_service",
    statusLabel: "Good service",
    note: "Trains are running normally.",
  },
];

export const lineById: Record<string, MetroLine> = Object.fromEntries(
  lines.map((line) => [line.id, line]),
);

export const stations: Station[] = [
  { id: "baixa-chiado", name: "Baixa-Chiado", lines: ["blue", "green"] },
  { id: "campo-grande", name: "Campo Grande", lines: ["green", "yellow"] },
  { id: "marques-pombal", name: "Marques de Pombal", lines: ["blue", "yellow"] },
  { id: "oriente", name: "Oriente", lines: ["red"] },
  { id: "saldanha", name: "Saldanha", lines: ["red", "yellow"] },
  { id: "sao-sebastiao", name: "Sao Sebastiao", lines: ["blue", "red"] },
];

export const arrivalsByStation: Record<string, Arrival[]> = {
  "baixa-chiado": [
    { id: "arr-1", destination: "Reboleira", lineId: "blue", minutes: 3, platform: "1" },
    { id: "arr-2", destination: "Cais do Sodre", lineId: "green", minutes: 6, platform: "2" },
  ],
  "campo-grande": [
    { id: "arr-3", destination: "Telheiras", lineId: "green", minutes: 2, platform: "1" },
    { id: "arr-4", destination: "Odivelas", lineId: "yellow", minutes: 8, platform: "3" },
  ],
  "marques-pombal": [
    { id: "arr-5", destination: "Santa Apolonia", lineId: "blue", minutes: 4, platform: "2" },
    { id: "arr-6", destination: "Rato", lineId: "yellow", minutes: 7, platform: "1" },
  ],
  oriente: [
    { id: "arr-7", destination: "Aeroporto", lineId: "red", minutes: 5, platform: "1" },
    { id: "arr-8", destination: "Sao Sebastiao", lineId: "red", minutes: 11, platform: "2" },
  ],
  saldanha: [
    { id: "arr-9", destination: "Aeroporto", lineId: "red", minutes: 1, platform: "1" },
    { id: "arr-10", destination: "Odivelas", lineId: "yellow", minutes: 9, platform: "2" },
  ],
  "sao-sebastiao": [
    { id: "arr-11", destination: "Aeroporto", lineId: "red", minutes: 4, platform: "1" },
    { id: "arr-12", destination: "Reboleira", lineId: "blue", minutes: 10, platform: "2" },
  ],
};

export const alerts: Alert[] = [
  {
    id: "alert-1",
    severity: "warning",
    title: "Minor delays on Yellow Line",
    message: "Mocked alert: allow extra travel time near Campo Grande.",
    affectedLines: ["yellow"],
  },
  {
    id: "alert-2",
    severity: "info",
    title: "Planned maintenance reminder",
    message: "Mocked notice: maintenance windows may affect late evening service.",
    affectedLines: ["blue", "green"],
  },
];
