import { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";

import { fetchOfficialLineStatus } from "@/api/client";
import { MetroNetworkMap } from "@/components/MetroNetworkMap";
import { Screen } from "@/components/Screen";
import { lines } from "@/data/mockData";
import type { LineStatus, MetroLine } from "@/data/mockData";
import { useAppPreferences } from "@/state/AppPreferences";
import { radius, spacing, typography } from "@/styles/theme";
import type { AppTheme } from "@/styles/theme";

type LineId = "blue" | "yellow" | "green" | "red";
type DebugLineStatus = "normal" | "disrupted" | "interrupted" | "closed" | "unknown";

const SHOW_DEBUG_NETWORK_MAP = true;

// Local visual preview only. Keep null for normal use.
// Example: { blue: "normal", yellow: "disrupted", green: "interrupted", red: "closed" }
const DEBUG_LINE_STATUS_OVERRIDES: Partial<Record<LineId, DebugLineStatus>> | null = {
  blue: "normal",
  yellow: "disrupted",
  green: "interrupted",
  red: "closed",
};

function getStatusStyles(status: LineStatus, colors: AppTheme["colors"]) {
  if (status === "good_service") {
    return {
      backgroundColor: colors.successSoft,
      color: colors.success,
    };
  }

  if (status === "minor_delays" || status === "disrupted") {
    return {
      backgroundColor: colors.warningSoft,
      color: colors.warning,
    };
  }

  if (status === "unknown") {
    return {
      backgroundColor: colors.unknownSoft,
      color: colors.unknown,
    };
  }

  return {
    backgroundColor: colors.criticalSoft,
    color: colors.critical,
  };
}

function getDebugStatusUpdate(status: DebugLineStatus): Pick<MetroLine, "status" | "statusLabelKey"> {
  if (status === "normal") {
    return {
      status: "good_service",
      statusLabelKey: "line.status.good",
    };
  }

  if (status === "interrupted") {
    return {
      status: "suspended",
      statusLabelKey: "line.status.suspended",
    };
  }

  if (status === "closed") {
    return {
      status: "closed",
      statusLabelKey: "line.status.closed",
    };
  }

  if (status === "unknown") {
    return {
      status: "unknown",
      statusLabelKey: "line.status.unknown",
    };
  }

  return {
    status: "disrupted",
    statusLabelKey: "line.status.disrupted",
  };
}

function applyDebugLineStatusOverrides(displayLines: MetroLine[]) {
  if (!DEBUG_LINE_STATUS_OVERRIDES) {
    return displayLines;
  }

  return displayLines.map((line) => {
    const override = DEBUG_LINE_STATUS_OVERRIDES[line.id as LineId];

    return override ? { ...line, ...getDebugStatusUpdate(override) } : line;
  });
}

export default function LinesScreen() {
  const { t, theme } = useAppPreferences();
  const [displayLines, setDisplayLines] = useState<MetroLine[]>(lines);
  const [dataMode, setDataMode] = useState<"live" | "mocked">("mocked");
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const styles = createStyles(theme.colors);
  const visibleLines = applyDebugLineStatusOverrides(displayLines);

  useEffect(() => {
    let isMounted = true;

    async function loadOfficialLines() {
      try {
        const result = await fetchOfficialLineStatus();

        if (!isMounted) {
          return;
        }

        setDisplayLines(result.lines);
        setDataMode("live");
        setUpdatedAt(result.updatedAt);
        setHasError(false);
      } catch {
        if (!isMounted) {
          return;
        }

        setDisplayLines(lines);
        setDataMode("mocked");
        setUpdatedAt(null);
        setHasError(true);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadOfficialLines();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <Screen>
      <FlatList
        data={visibleLines}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>{t("lines.title")}</Text>
            <Text style={styles.subtitle}>{t("lines.subtitle")}</Text>
            {SHOW_DEBUG_NETWORK_MAP ? <MetroNetworkMap lines={visibleLines} /> : null}
            <View style={styles.statusPanel}>
              <View style={styles.statusPanelHeader}>
                <Text
                  style={[
                    styles.dataLabel,
                    dataMode === "live" ? styles.liveDataLabel : styles.mockedDataLabel,
                  ]}
                >
                  {dataMode === "live" ? t("lines.data.live") : t("lines.data.mockedFallback")}
                </Text>
                {updatedAt ? (
                  <Text style={styles.updatedAt}>
                    {t("lines.updatedAt", { time: new Date(updatedAt).toLocaleString() })}
                  </Text>
                ) : null}
              </View>
              {isLoading ? <Text style={styles.loadingText}>{t("lines.loading")}</Text> : null}
              {hasError ? <Text style={styles.errorText}>{t("lines.error")}</Text> : null}
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.card, { borderLeftColor: item.color }]}>
            <View style={styles.cardHeader}>
              <View style={styles.lineIdentity}>
                <View style={[styles.lineSymbol, { backgroundColor: item.color }]} />
                <View>
                  <Text style={styles.name}>{t(item.nameKey)}</Text>
                  <Text style={styles.routeHint}>{t("lines.operatingStatus")}</Text>
                </View>
              </View>
              <Text style={[styles.status, getStatusStyles(item.status, theme.colors)]}>
                {t(item.statusLabelKey)}
              </Text>
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.note}>{item.note ?? t(item.noteKey)}</Text>
              <View style={styles.track}>
                <View style={[styles.trackFill, { backgroundColor: item.color }]} />
              </View>
            </View>
          </View>
        )}
      />
    </Screen>
  );
}

function createStyles(colors: AppTheme["colors"]) {
  return StyleSheet.create({
    list: {
      paddingBottom: spacing.xl,
    },
    header: {
      gap: spacing.sm,
      marginBottom: spacing.lg,
    },
    title: {
      color: colors.text,
      fontSize: typography.title,
      fontWeight: "900",
      lineHeight: 36,
    },
    subtitle: {
      color: colors.muted,
      fontSize: typography.body,
      lineHeight: 22,
    },
    statusPanel: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: radius.lg,
      borderWidth: 1,
      gap: spacing.xs,
      marginTop: spacing.xs,
      padding: spacing.md,
    },
    statusPanelHeader: {
      alignItems: "center",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.xs,
      justifyContent: "space-between",
    },
    dataLabel: {
      borderRadius: 999,
      fontSize: typography.small,
      fontWeight: "900",
      overflow: "hidden",
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
    },
    liveDataLabel: {
      backgroundColor: colors.successSoft,
      color: colors.success,
    },
    mockedDataLabel: {
      backgroundColor: colors.warningSoft,
      color: colors.warning,
    },
    updatedAt: {
      color: colors.muted,
      fontSize: typography.small,
      fontWeight: "700",
    },
    loadingText: {
      color: colors.muted,
      fontSize: typography.caption,
      fontWeight: "700",
    },
    errorText: {
      color: colors.warning,
      fontSize: typography.caption,
      fontWeight: "800",
      lineHeight: 18,
    },
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderLeftWidth: 6,
      gap: spacing.md,
      marginBottom: spacing.md,
      overflow: "hidden",
      padding: spacing.md,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.03,
      shadowRadius: 6,
      elevation: 1,
    },
    cardHeader: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: spacing.md,
      justifyContent: "space-between",
    },
    lineIdentity: {
      alignItems: "center",
      flex: 1,
      flexDirection: "row",
      gap: spacing.sm,
    },
    lineSymbol: {
      borderColor: colors.surfaceRaised,
      borderWidth: 4,
      borderRadius: 999,
      height: 42,
      width: 42,
    },
    cardBody: {
      gap: spacing.xs,
    },
    name: {
      color: colors.text,
      fontSize: typography.body,
      fontWeight: "900",
    },
    routeHint: {
      color: colors.muted,
      fontSize: typography.small,
      fontWeight: "700",
      marginTop: 2,
    },
    status: {
      borderRadius: 999,
      fontSize: typography.small,
      fontWeight: "900",
      overflow: "hidden",
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
    },
    note: {
      color: colors.muted,
      fontSize: typography.body,
      lineHeight: 22,
    },
    track: {
      backgroundColor: colors.soft,
      borderRadius: 999,
      height: 8,
      marginTop: spacing.sm,
      overflow: "hidden",
    },
    trackFill: {
      borderRadius: 999,
      height: 8,
      width: "78%",
    },
  });
}
