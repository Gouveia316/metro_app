import { Link } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { fetchOfficialStations } from "@/api/client";
import { LineBadge } from "@/components/LineBadge";
import { Screen } from "@/components/Screen";
import { getStationLineIds, lineById, stations } from "@/data/mockData";
import type { Station } from "@/data/mockData";
import { useAppPreferences } from "@/state/AppPreferences";
import { radius, spacing, typography } from "@/styles/theme";
import type { AppTheme } from "@/styles/theme";

type Translate = ReturnType<typeof useAppPreferences>["t"];

function getStationAreaText(station: Station, t: Translate) {
  if (station.areaKey) {
    return t(station.areaKey);
  }

  if (station.zone) {
    return t("stations.zone", { zone: station.zone });
  }

  return t("stations.zoneUnknown");
}

export default function StationsScreen() {
  const [query, setQuery] = useState("");
  const [displayStations, setDisplayStations] = useState<Station[]>(stations);
  const [dataMode, setDataMode] = useState<"live" | "mocked">("mocked");
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const { t, theme } = useAppPreferences();
  const styles = createStyles(theme.colors);

  useEffect(() => {
    let isMounted = true;

    async function loadOfficialStations() {
      try {
        const result = await fetchOfficialStations();

        if (!isMounted) {
          return;
        }

        setDisplayStations(result.stations);
        setDataMode("live");
        setUpdatedAt(result.updatedAt);
        setHasError(false);
      } catch {
        if (!isMounted) {
          return;
        }

        setDisplayStations(stations);
        setDataMode("mocked");
        setUpdatedAt(null);
        setHasError(true);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadOfficialStations();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredStations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return displayStations;
    }

    return displayStations.filter((station) => {
      const lineNames = getStationLineIds(station)
        .map((lineId) => t(lineById[lineId]?.nameKey ?? "nav.lines"))
        .join(" ");
      const searchableText = `${station.name} ${getStationAreaText(station, t)} ${lineNames}`.toLowerCase();

      return searchableText.includes(normalizedQuery);
    });
  }, [displayStations, query, t]);

  return (
    <Screen>
      <FlatList
        data={filteredStations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>{t("stations.title")}</Text>
              <Text style={styles.subtitle}>{t("stations.subtitle")}</Text>
            </View>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t("stations.searchPlaceholder")}
              placeholderTextColor={theme.colors.muted}
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
              style={styles.input}
            />
            <View style={styles.statusPanel}>
              <View style={styles.statusPanelHeader}>
                <Text
                  style={[
                    styles.dataLabel,
                    dataMode === "live" ? styles.liveDataLabel : styles.mockedDataLabel,
                  ]}
                >
                  {dataMode === "live" ? t("stations.data.live") : t("stations.data.mockedFallback")}
                </Text>
                {updatedAt ? (
                  <Text style={styles.updatedAt}>
                    {t("stations.updatedAt", { time: new Date(updatedAt).toLocaleString() })}
                  </Text>
                ) : null}
              </View>
              {isLoading ? <Text style={styles.loadingText}>{t("stations.loading")}</Text> : null}
              {hasError ? <Text style={styles.errorText}>{t("stations.error")}</Text> : null}
            </View>
            <Text style={styles.resultCount}>{t("stations.results", { count: filteredStations.length })}</Text>
          </View>
        }
        renderItem={({ item }) => {
          const lineIds = getStationLineIds(item);

          return (
            <Link
              href={{
                pathname: "/stations/[stationId]",
                params: {
                  stationId: item.id,
                  latitude: item.latitude == null ? "" : String(item.latitude),
                  lineIds: lineIds.join(","),
                  longitude: item.longitude == null ? "" : String(item.longitude),
                  name: item.name,
                  zone: item.zone ?? "",
                },
              }}
              asChild
            >
              <Pressable style={styles.card}>
                <View style={styles.stationCopy}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.area}>{getStationAreaText(item, t)}</Text>
                  <View style={styles.badgeRow}>
                    {lineIds.map((lineId) => (
                      <LineBadge key={lineId} lineId={lineId} />
                    ))}
                  </View>
                </View>
                <Text style={styles.cardAction}>{t("stations.view")}</Text>
              </Pressable>
            </Link>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>{t("stations.empty")}</Text>}
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
    headerCopy: {
      gap: spacing.sm,
    },
    title: {
      color: colors.text,
      fontSize: typography.title,
      fontWeight: "900",
    },
    subtitle: {
      color: colors.muted,
      fontSize: typography.body,
      lineHeight: 22,
    },
    input: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: radius.md,
      borderWidth: 1,
      color: colors.text,
      fontSize: typography.body,
      minHeight: 48,
      paddingHorizontal: spacing.md,
    },
    resultCount: {
      color: colors.muted,
      fontSize: typography.small,
      fontWeight: "700",
      textTransform: "uppercase",
    },
    statusPanel: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: radius.md,
      borderWidth: 1,
      gap: spacing.xs,
      padding: spacing.sm,
    },
    statusPanelHeader: {
      alignItems: "center",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.xs,
      justifyContent: "space-between",
    },
    dataLabel: {
      borderRadius: radius.sm,
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
      alignItems: "center",
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: radius.md,
      borderWidth: 1,
      flexDirection: "row",
      gap: spacing.md,
      justifyContent: "space-between",
      marginBottom: spacing.sm,
      padding: spacing.md,
    },
    stationCopy: {
      flex: 1,
      gap: spacing.xs,
    },
    name: {
      color: colors.text,
      fontSize: typography.heading,
      fontWeight: "900",
    },
    area: {
      color: colors.muted,
      fontSize: typography.caption,
      fontWeight: "700",
    },
    badgeRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.xs,
      marginTop: spacing.xs,
    },
    cardAction: {
      color: colors.accent,
      fontSize: typography.caption,
      fontWeight: "900",
    },
    empty: {
      color: colors.muted,
      fontSize: typography.body,
      paddingVertical: spacing.lg,
      textAlign: "center",
    },
  });
}
