import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, SectionList, StyleSheet, Text, View } from "react-native";

import { fetchOfficialStationArrivals, getCachedOfficialStation } from "@/api/client";
import type { OfficialWaitTime } from "@/api/client";
import { LineBadge } from "@/components/LineBadge";
import { Screen } from "@/components/Screen";
import { arrivalsByStation, getStationLineIds, stations } from "@/data/mockData";
import type { Arrival, Station } from "@/data/mockData";
import { useAppPreferences } from "@/state/AppPreferences";
import { radius, spacing, typography } from "@/styles/theme";
import type { AppTheme } from "@/styles/theme";

type DisplayArrival = {
  destination: string;
  id: string;
  lineId?: string;
  minutes: number;
  platform: string;
  trainId?: string;
};

type ArrivalSection = {
  title: string;
  data: DisplayArrival[];
};

type ArrivalState = "arrivals_available" | "service_closed" | "no_arrivals_available" | "no_live_data";
type ArrivalEmptyReason = "strike" | "closed" | "all_arrivals_unavailable" | "station_not_found_in_wait_times";

type StationRouteParams = {
  latitude?: string;
  lineIds?: string;
  longitude?: string;
  name?: string;
  stationId?: string;
  zone?: string;
};

type Translate = ReturnType<typeof useAppPreferences>["t"];

function getParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseRouteCoordinate(value: string | undefined) {
  const coordinate = Number.parseFloat(value ?? "");
  return Number.isFinite(coordinate) ? coordinate : undefined;
}

function stationFromRouteParams(params: StationRouteParams): Station | undefined {
  const id = getParamValue(params.stationId)?.trim();
  const name = getParamValue(params.name)?.trim();

  if (!id || !name) {
    return undefined;
  }

  const lineIds = (getParamValue(params.lineIds) ?? "")
    .split(",")
    .map((lineId) => lineId.trim())
    .filter(Boolean);

  return {
    id,
    name,
    latitude: parseRouteCoordinate(getParamValue(params.latitude)),
    lineIds,
    lines: lineIds,
    longitude: parseRouteCoordinate(getParamValue(params.longitude)),
    zone: getParamValue(params.zone)?.trim() || undefined,
  };
}

function getStationAreaText(station: Station, t: Translate) {
  if (station.areaKey) {
    return t(station.areaKey);
  }

  if (station.zone) {
    return t("stations.zone", { zone: station.zone });
  }

  return t("stations.zoneUnknown");
}

function normalizeStationName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function getMockArrivalsForStation(station: Station) {
  const directArrivals = arrivalsByStation[station.id];

  if (directArrivals) {
    return directArrivals;
  }

  const matchingMockStation = stations.find(
    (mockStation) => normalizeStationName(mockStation.name) === normalizeStationName(station.name),
  );

  return matchingMockStation ? arrivalsByStation[matchingMockStation.id] ?? [] : [];
}

function groupMockArrivalsByDirection(arrivals: Arrival[], t: Translate): ArrivalSection[] {
  const grouped = arrivals.reduce<Record<string, Arrival[]>>((acc, arrival) => {
    acc[arrival.directionKey] = [...(acc[arrival.directionKey] ?? []), arrival];
    return acc;
  }, {});

  return Object.entries(grouped).map(([titleKey, data]) => ({
    title: t(titleKey as Parameters<Translate>[0]),
    data: data.map((arrival) => ({
      destination: arrival.destination,
      id: arrival.id,
      lineId: arrival.lineId,
      minutes: arrival.minutes,
      platform: arrival.platform,
    })),
  }));
}

function groupLiveArrivalsByPlatform(waitTimes: OfficialWaitTime[], t: Translate): ArrivalSection[] {
  const grouped = waitTimes.reduce<Record<string, DisplayArrival[]>>((acc, waitTime) => {
    const arrivals = waitTime.arrivals.slice(0, 3).map((arrival) => ({
      destination: t("station.destinationCode", { code: waitTime.destinationCode || "-" }),
      id: `${waitTime.platformId}-${arrival.id}`,
      minutes: arrival.minutes,
      platform: waitTime.platformId,
      trainId: arrival.trainId,
    }));

    acc[waitTime.platformId] = [...(acc[waitTime.platformId] ?? []), ...arrivals].slice(0, 3);
    return acc;
  }, {});

  return Object.entries(grouped)
    .filter(([, data]) => data.length > 0)
    .map(([platform, data]) => ({
      title: t("station.platform", { platform }),
      data,
    }));
}

function getEmptyArrivalMessage(
  dataMode: "live" | "mocked",
  state: ArrivalState | null,
  emptyReason: ArrivalEmptyReason | null,
  hasLivePlatforms: boolean,
  t: Translate,
) {
  if (dataMode === "mocked") {
    return t("station.empty");
  }

  if (state === "service_closed") {
    return emptyReason === "strike" ? t("station.arrivalsServiceClosedStrike") : t("station.arrivalsServiceClosed");
  }

  if (state === "no_arrivals_available") {
    return t("station.arrivalsUnavailable");
  }

  if (state === "no_live_data" || !hasLivePlatforms) {
    return t("station.arrivalsNoLiveData");
  }

  return t("station.arrivalsUnavailable");
}

export default function StationDetailScreen() {
  const params = useLocalSearchParams<StationRouteParams>();
  const stationId = getParamValue(params.stationId);
  const { t, theme } = useAppPreferences();
  const [dataMode, setDataMode] = useState<"live" | "mocked">("mocked");
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [arrivalState, setArrivalState] = useState<ArrivalState | null>(null);
  const [emptyReason, setEmptyReason] = useState<ArrivalEmptyReason | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [platforms, setPlatforms] = useState<OfficialWaitTime[]>([]);
  const styles = createStyles(theme.colors);
  const station =
    stations.find((item) => item.id === stationId) ??
    (stationId ? getCachedOfficialStation(stationId) : undefined) ??
    stationFromRouteParams(params);

  useEffect(() => {
    let isMounted = true;

    async function loadStationArrivals() {
      if (!stationId) {
        setIsLoading(false);
        return;
      }

      try {
        const result = await fetchOfficialStationArrivals(stationId);

        if (!isMounted) {
          return;
        }

        setPlatforms(result.platforms);
        setArrivalState(result.state);
        setEmptyReason(result.emptyReason);
        setDataMode("live");
        setUpdatedAt(result.updatedAt);
        setHasError(false);
      } catch {
        if (!isMounted) {
          return;
        }

        setPlatforms([]);
        setArrivalState(null);
        setEmptyReason(null);
        setDataMode("mocked");
        setUpdatedAt(null);
        setHasError(true);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadStationArrivals();

    return () => {
      isMounted = false;
    };
  }, [stationId]);

  if (!station) {
    return (
      <Screen>
        <View style={styles.missingCard}>
          <Text style={styles.title}>{t("station.notFoundTitle")}</Text>
          <Text style={styles.subtitle}>{t("station.notFoundBody")}</Text>
        </View>
      </Screen>
    );
  }

  const arrivals = getMockArrivalsForStation(station);
  const arrivalSections =
    dataMode === "live"
      ? groupLiveArrivalsByPlatform(platforms, t)
      : groupMockArrivalsByDirection(arrivals, t);
  const hasLivePlatforms = platforms.length > 0;
  const emptyMessage = getEmptyArrivalMessage(dataMode, arrivalState, emptyReason, hasLivePlatforms, t);

  return (
    <Screen>
      <SectionList
        sections={arrivalSections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.stationHero}>
              <Text style={styles.eyebrow}>{t("station.eyebrow")}</Text>
              <Text style={styles.title}>{station.name}</Text>
              <Text style={styles.subtitle}>{getStationAreaText(station, t)}</Text>
              <View style={styles.badgeRow}>
                {getStationLineIds(station).map((lineId) => (
                  <LineBadge key={lineId} lineId={lineId} />
                ))}
              </View>
            </View>
            <Pressable accessibilityRole="button" style={styles.favoriteButton} onPress={() => {}}>
              <Text style={styles.favoriteButtonText}>{t("station.saveFavorite")}</Text>
            </Pressable>
            <View style={styles.statusPanel}>
              <View style={styles.statusPanelHeader}>
                <Text
                  style={[
                    styles.dataLabel,
                    dataMode === "live" ? styles.liveDataLabel : styles.mockedDataLabel,
                  ]}
                >
                  {dataMode === "live" ? t("station.arrivalsLive") : t("station.arrivalsMocked")}
                </Text>
                {updatedAt ? (
                  <Text style={styles.updatedAt}>
                    {t("stations.updatedAt", { time: new Date(updatedAt).toLocaleString() })}
                  </Text>
                ) : null}
              </View>
              {isLoading ? <Text style={styles.loadingText}>{t("station.arrivalsLoading")}</Text> : null}
              {hasError ? <Text style={styles.errorText}>{t("stations.error")}</Text> : null}
            </View>
            <Text style={styles.sectionIntro}>
              {dataMode === "live" ? t("station.arrivalsLive") : t("station.arrivalsByDirection")}
            </Text>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.directionHeader}>
            <Text style={styles.directionTitle}>{section.title}</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.arrivalTime}>
              <Text style={styles.minutes}>{item.minutes}</Text>
              <Text style={styles.minuteLabel}>{t("station.minutes")}</Text>
            </View>
            <View style={styles.arrivalBody}>
              <Text style={styles.destination}>{item.destination}</Text>
              <View style={styles.arrivalMeta}>
                {item.lineId ? <LineBadge lineId={item.lineId} /> : null}
                {item.trainId ? <Text style={styles.train}>{t("station.train", { trainId: item.trainId })}</Text> : null}
                <Text style={styles.platform}>{t("station.platform", { platform: item.platform })}</Text>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={
          isLoading ? null : <Text style={styles.empty}>{emptyMessage}</Text>
        }
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
      gap: spacing.md,
      marginBottom: spacing.sm,
    },
    stationHero: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: radius.md,
      borderWidth: 1,
      gap: spacing.sm,
      padding: spacing.md,
    },
    eyebrow: {
      color: colors.accent,
      fontSize: typography.small,
      fontWeight: "900",
      letterSpacing: 0,
      textTransform: "uppercase",
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
    badgeRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.xs,
      marginTop: spacing.xs,
    },
    favoriteButton: {
      alignItems: "center",
      backgroundColor: colors.accentSoft,
      borderColor: colors.accent,
      borderRadius: radius.sm,
      borderWidth: 1,
      minHeight: 48,
      justifyContent: "center",
      paddingHorizontal: spacing.md,
    },
    favoriteButtonText: {
      color: colors.accent,
      fontSize: typography.body,
      fontWeight: "900",
    },
    sectionIntro: {
      color: colors.muted,
      fontSize: typography.small,
      fontWeight: "900",
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
    directionHeader: {
      paddingBottom: spacing.xs,
      paddingTop: spacing.sm,
    },
    directionTitle: {
      color: colors.text,
      fontSize: typography.body,
      fontWeight: "900",
    },
    card: {
      alignItems: "center",
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: radius.md,
      borderWidth: 1,
      flexDirection: "row",
      gap: spacing.md,
      marginBottom: spacing.sm,
      padding: spacing.md,
    },
    arrivalTime: {
      alignItems: "center",
      backgroundColor: colors.accentSoft,
      borderRadius: radius.sm,
      minWidth: 66,
      paddingVertical: spacing.sm,
    },
    minutes: {
      color: colors.accent,
      fontSize: typography.display,
      fontWeight: "900",
    },
    minuteLabel: {
      color: colors.muted,
      fontSize: typography.small,
      fontWeight: "800",
    },
    arrivalBody: {
      flex: 1,
      gap: spacing.sm,
    },
    destination: {
      color: colors.text,
      fontSize: typography.heading,
      fontWeight: "900",
    },
    arrivalMeta: {
      alignItems: "center",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
    },
    platform: {
      color: colors.muted,
      fontSize: typography.caption,
      fontWeight: "800",
    },
    train: {
      color: colors.muted,
      fontSize: typography.caption,
      fontWeight: "800",
    },
    empty: {
      color: colors.muted,
      fontSize: typography.body,
      paddingVertical: spacing.lg,
      textAlign: "center",
    },
    missingCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: radius.md,
      borderWidth: 1,
      gap: spacing.sm,
      padding: spacing.md,
    },
  });
}
