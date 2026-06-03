import { useState } from "react";
import type { LayoutChangeEvent } from "react-native";
import { StyleSheet, Text, View } from "react-native";

import type { LineStatus, MetroLine } from "@/data/mockData";
import { useAppPreferences } from "@/state/AppPreferences";
import { lineColors, radius, spacing, typography } from "@/styles/theme";
import type { AppTheme } from "@/styles/theme";

type LineId = "blue" | "yellow" | "green" | "red";

type SchematicStation = {
  id: string;
  label?: string;
  labelPosition?: "top" | "right" | "bottom" | "left";
  x: number;
  y: number;
};

type LineVisual = {
  color: string;
  opacity: number;
};

type Size = {
  height: number;
  width: number;
};

type Props = {
  lines: MetroLine[];
};

const MAP_HEIGHT = 284;
const LINE_WIDTH = 11;
const DOT_SIZE = 7;
const INTERCHANGE_SIZE = 15;
const CLOSED_LINE_COLOR = "#8B96A3";

const lineOrder: LineId[] = ["blue", "yellow", "green", "red"];

const networkLines: Record<LineId, SchematicStation[]> = {
  blue: [
    { id: "reboleira", label: "Reboleira", labelPosition: "right", x: 6, y: 13 },
    { id: "colegio-militar-luz", x: 12, y: 20 },
    { id: "alto-dos-moinhos", x: 18, y: 28 },
    { id: "laranjeiras", x: 23, y: 35 },
    { id: "jardim-zoologico", x: 29, y: 43 },
    { id: "praca-de-espanha", x: 34, y: 50 },
    { id: "sao-sebastiao", label: "S. Sebastião", labelPosition: "left", x: 38, y: 57 },
    { id: "parque", x: 43, y: 65 },
    { id: "marques-de-pombal", label: "Marquês", labelPosition: "left", x: 45, y: 80 },
    { id: "avenida", x: 52, y: 86 },
    { id: "restauradores", x: 57, y: 90 },
    { id: "baixa-chiado", label: "Baixa-Chiado", labelPosition: "right", x: 65, y: 93 },
    { id: "terreiro-do-paco", x: 78, y: 93 },
    { id: "santa-apolonia", label: "Santa Apolónia", labelPosition: "top", x: 91, y: 93 },
  ],
  yellow: [
    { id: "odivelas", x: 45, y: 5 },
    { id: "senhor-roubado", x: 45, y: 12 },
    { id: "ameixoeira", x: 45, y: 18 },
    { id: "lumiar", x: 45, y: 24 },
    { id: "quinta-das-conchas", x: 45, y: 30 },
    { id: "campo-grande", label: "Campo Grande", labelPosition: "right", x: 45, y: 37 },
    { id: "cidade-universitaria", x: 45, y: 46 },
    { id: "entre-campos", x: 45, y: 53 },
    { id: "campo-pequeno", x: 45, y: 59 },
    { id: "saldanha", label: "Saldanha", labelPosition: "top", x: 45, y: 65 },
    { id: "picoas", x: 45, y: 72 },
    { id: "marques-de-pombal", x: 45, y: 80 },
    { id: "rato", label: "Rato", labelPosition: "left", x: 38, y: 90 },
  ],
  green: [
    { id: "telheiras", x: 27, y: 37 },
    { id: "campo-grande", x: 45, y: 37 },
    { id: "alvalade", x: 60, y: 42 },
    { id: "roma", x: 62, y: 50 },
    { id: "areeiro", x: 62, y: 58 },
    { id: "alameda", label: "Alameda", labelPosition: "right", x: 62, y: 65 },
    { id: "arroios", x: 62, y: 72 },
    { id: "anjos", x: 62, y: 78 },
    { id: "intendente", x: 62, y: 84 },
    { id: "martim-moniz", x: 62, y: 89 },
    { id: "rossio", x: 61, y: 94 },
    { id: "baixa-chiado", x: 65, y: 93 },
    { id: "cais-do-sodre", label: "Cais do Sodré", labelPosition: "bottom", x: 54, y: 96 },
  ],
  red: [
    { id: "aeroporto", label: "Aeroporto", labelPosition: "bottom", x: 63, y: 8 },
    { id: "encarnacao", x: 74, y: 8 },
    { id: "moscavide", x: 86, y: 8 },
    { id: "oriente", label: "Oriente", labelPosition: "right", x: 94, y: 24 },
    { id: "cabo-ruivo", x: 87, y: 36 },
    { id: "olivais", x: 80, y: 48 },
    { id: "chelas", x: 74, y: 57 },
    { id: "bela-vista", x: 69, y: 63 },
    { id: "olaias", x: 65, y: 65 },
    { id: "alameda", x: 62, y: 65 },
    { id: "saldanha", x: 45, y: 65 },
    { id: "sao-sebastiao", x: 38, y: 57 },
  ],
};

const interchangeStations = new Set([
  "baixa-chiado",
  "campo-grande",
  "marques-de-pombal",
  "saldanha",
  "sao-sebastiao",
  "alameda",
]);

const warningMarkerPosition: Record<LineId, { x: number; y: number }> = {
  blue: { x: 47, y: 75 },
  yellow: { x: 48, y: 62 },
  green: { x: 66, y: 62 },
  red: { x: 72, y: 58 },
};

function getFallbackLineColor(lineId: LineId) {
  return lineColors[lineId];
}

function getLineVisual(lineId: LineId, line: MetroLine | undefined): LineVisual {
  const status = line?.status ?? "unknown";
  const color = line?.color ?? getFallbackLineColor(lineId);

  if (status === "good_service") {
    return { color, opacity: 1 };
  }

  if (status === "minor_delays" || status === "disrupted") {
    return { color, opacity: 0.72 };
  }

  if (status === "suspended") {
    return { color, opacity: 0.42 };
  }

  if (status === "closed") {
    return { color: CLOSED_LINE_COLOR, opacity: 0.58 };
  }

  return { color: CLOSED_LINE_COLOR, opacity: 0.46 };
}

function isWarningStatus(status: LineStatus | undefined) {
  return status === "minor_delays" || status === "disrupted" || status === "suspended";
}

function getStationCoordinate(station: SchematicStation, size: Size) {
  return {
    x: (station.x / 100) * size.width,
    y: (station.y / 100) * size.height,
  };
}

function LineSegment({
  color,
  from,
  opacity,
  size,
  to,
}: {
  color: string;
  from: SchematicStation;
  opacity: number;
  size: Size;
  to: SchematicStation;
}) {
  const start = getStationCoordinate(from, size);
  const end = getStationCoordinate(to, size);
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

  return (
    <View
      style={[
        styles.lineSegment,
        {
          backgroundColor: color,
          height: LINE_WIDTH,
          left: start.x + deltaX / 2 - length / 2,
          opacity,
          top: start.y + deltaY / 2 - LINE_WIDTH / 2,
          transform: [{ rotate: `${angle}deg` }],
          width: length,
        },
      ]}
    />
  );
}

function StationDot({
  isInterchange,
  size,
  station,
}: {
  isInterchange: boolean;
  size: Size;
  station: SchematicStation;
}) {
  const dotSize = isInterchange ? INTERCHANGE_SIZE : DOT_SIZE;
  const coordinate = getStationCoordinate(station, size);

  return (
    <View
      style={[
        styles.stationDot,
        isInterchange && styles.interchangeDot,
        {
          height: dotSize,
          left: coordinate.x - dotSize / 2,
          top: coordinate.y - dotSize / 2,
          width: dotSize,
        },
      ]}
    />
  );
}

function StationLabel({ color, station }: { color: string; station: SchematicStation }) {
  if (!station.label) {
    return null;
  }

  const position = station.labelPosition ?? "right";

  return (
    <Text
      numberOfLines={2}
      style={[
        styles.stationLabel,
        {
          color,
          left: `${station.x}%`,
          top: `${station.y}%`,
        },
        position === "top" && styles.stationLabelTop,
        position === "right" && styles.stationLabelRight,
        position === "bottom" && styles.stationLabelBottom,
        position === "left" && styles.stationLabelLeft,
      ]}
    >
      {station.label}
    </Text>
  );
}

function WarningMarker({
  colors,
  point,
  size,
}: {
  colors: AppTheme["colors"];
  point: { x: number; y: number };
  size: Size;
}) {
  const markerSize = 17;

  return (
    <View
      style={[
        styles.warningMarker,
        {
          backgroundColor: colors.warningSoft,
          borderColor: colors.warning,
          left: (point.x / 100) * size.width - markerSize / 2,
          top: (point.y / 100) * size.height - markerSize / 2,
        },
      ]}
    >
      <Text style={[styles.warningMarkerText, { color: colors.warning }]}>!</Text>
    </View>
  );
}

export function MetroNetworkMap({ lines: metroLines }: Props) {
  const { t, theme } = useAppPreferences();
  const [size, setSize] = useState<Size>({ height: MAP_HEIGHT, width: 0 });
  const stylesWithTheme = createStyles(theme.colors);
  const lineById = new Map(metroLines.map((line) => [line.id, line]));
  const allStations = lineOrder.flatMap((lineId) => networkLines[lineId]);
  const uniqueStations = Array.from(
    new Map(allStations.map((station) => [station.id, station])).values(),
  );
  const labelledStations = uniqueStations.filter((station) => station.label);

  function handleCanvasLayout(event: LayoutChangeEvent) {
    setSize({
      height: MAP_HEIGHT,
      width: event.nativeEvent.layout.width,
    });
  }

  return (
    <View style={stylesWithTheme.card}>
      <View onLayout={handleCanvasLayout} style={stylesWithTheme.canvas}>
        {size.width > 0
          ? lineOrder.map((lineId) => {
              const visual = getLineVisual(lineId, lineById.get(lineId));
              const stations = networkLines[lineId];

              return stations.slice(0, -1).map((station, index) => (
                <LineSegment
                  key={`${lineId}-${station.id}`}
                  color={visual.color}
                  from={station}
                  opacity={visual.opacity}
                  size={size}
                  to={stations[index + 1]}
                />
              ));
            })
          : null}
        {size.width > 0
          ? allStations.map((station, index) => (
              <StationDot
                key={`${station.id}-${index}`}
                isInterchange={false}
                size={size}
                station={station}
              />
            ))
          : null}
        {size.width > 0
          ? uniqueStations
              .filter((station) => interchangeStations.has(station.id))
              .map((station) => (
                <StationDot key={`interchange-${station.id}`} isInterchange size={size} station={station} />
              ))
          : null}
        {labelledStations.map((station) => (
          <StationLabel key={`label-${station.id}`} color={theme.colors.text} station={station} />
        ))}
        {size.width > 0
          ? lineOrder.map((lineId) =>
              isWarningStatus(lineById.get(lineId)?.status) ? (
                <WarningMarker
                  key={`warning-${lineId}`}
                  colors={theme.colors}
                  point={warningMarkerPosition[lineId]}
                  size={size}
                />
              ) : null,
            )
          : null}
      </View>
      <View style={stylesWithTheme.legend}>
        <View style={stylesWithTheme.legendItem}>
          <View style={[stylesWithTheme.legendLine, { backgroundColor: lineColors.blue }]} />
          <Text style={stylesWithTheme.legendText}>{t("lines.map.fullColor")}</Text>
        </View>
        <View style={stylesWithTheme.legendItem}>
          <View style={[stylesWithTheme.legendLine, { backgroundColor: CLOSED_LINE_COLOR }]} />
          <Text style={stylesWithTheme.legendText}>{t("lines.map.grey")}</Text>
        </View>
        <View style={stylesWithTheme.legendItem}>
          <View style={[stylesWithTheme.legendWarning, { backgroundColor: theme.colors.warningSoft }]} />
          <Text style={stylesWithTheme.legendText}>{t("lines.map.warning")}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  lineSegment: {
    borderRadius: 999,
    position: "absolute",
  },
  stationDot: {
    backgroundColor: "#FFFFFF",
    borderColor: "#FFFFFF",
    borderRadius: 999,
    borderWidth: 1,
    position: "absolute",
  },
  interchangeDot: {
    borderColor: "#17212B",
    borderWidth: 2,
  },
  stationLabel: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 10,
    maxWidth: 78,
    position: "absolute",
    zIndex: 4,
  },
  stationLabelTop: {
    marginLeft: -38,
    marginTop: -25,
    textAlign: "center",
    width: 76,
  },
  stationLabelRight: {
    marginLeft: 10,
    marginTop: -8,
  },
  stationLabelBottom: {
    marginLeft: -38,
    marginTop: 10,
    textAlign: "center",
    width: 76,
  },
  stationLabelLeft: {
    marginLeft: -84,
    marginTop: -8,
    textAlign: "right",
    width: 78,
  },
  warningMarker: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    height: 17,
    justifyContent: "center",
    position: "absolute",
    width: 17,
    zIndex: 5,
  },
  warningMarkerText: {
    fontSize: 11,
    fontWeight: "900",
    lineHeight: 13,
  },
});

function createStyles(colors: AppTheme["colors"]) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: radius.lg,
      borderWidth: 1,
      gap: spacing.sm,
      marginTop: spacing.xs,
      overflow: "hidden",
      padding: spacing.sm,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.03,
      shadowRadius: 6,
      elevation: 1,
    },
    canvas: {
      backgroundColor: colors.surfaceRaised,
      borderRadius: radius.md,
      height: MAP_HEIGHT,
      overflow: "hidden",
      position: "relative",
    },
    legend: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.xs,
    },
    legendItem: {
      alignItems: "center",
      backgroundColor: colors.soft,
      borderRadius: 999,
      flexDirection: "row",
      gap: spacing.xs,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
    },
    legendLine: {
      borderRadius: 999,
      height: 4,
      width: 18,
    },
    legendText: {
      color: colors.muted,
      fontSize: typography.small,
      fontWeight: "800",
    },
    legendWarning: {
      borderColor: colors.warning,
      borderRadius: 999,
      borderWidth: 1,
      height: 10,
      width: 10,
    },
  });
}
