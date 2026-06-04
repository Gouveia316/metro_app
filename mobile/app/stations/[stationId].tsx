import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, SectionList, StyleSheet, Text, View } from "react-native";

import { fetchOfficialStationArrivals, getCachedOfficialStation } from "@/api/client";
import type { OfficialWaitTime } from "@/api/client";
import { LineBadge } from "@/components/LineBadge";
import { Screen } from "@/components/Screen";
import { arrivalsByStation, getStationLineIds, lineById, stations } from "@/data/mockData";
import { formatArrivalCountdown, isArrivalVisible } from "@/api/arrivalCountdown";
import type { Arrival, Station } from "@/data/mockData";
import { useFavoriteStation } from "@/favorites/useFavoriteStation";
import { useAppPreferences } from "@/state/AppPreferences";
import { radius, spacing, typography } from "@/styles/theme";
import type { AppTheme } from "@/styles/theme";

type DisplayArrival = {
  destination: string;
  id: string;
  lineId?: string;
  displayMinutes?: number;
  minutes: number;
  responseUpdatedAt?: string;
  secondsUntilArrival?: number;
  platform?: string;
  trainId?: string;
};

type ArrivalSection = {
  lineId?: string;
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

const destinationLineIdsByName = Object.values(arrivalsByStation).reduce<Record<string, string[]>>(
  (acc, arrivals) => {
    arrivals.forEach((arrival) => {
      const destinationKey = normalizeStationName(arrival.destination);
      const existingLineIds = acc[destinationKey] ?? [];

      if (!existingLineIds.includes(arrival.lineId)) {
        acc[destinationKey] = [...existingLineIds, arrival.lineId];
      }
    });

    return acc;
  },
  {},
);

function getPublicDestination(waitTime: OfficialWaitTime) {
  return waitTime.destinationName?.trim() || waitTime.destinationCode.trim() || "-";
}

function getReliableArrivalLineId(destination: string, station: Station) {
  const stationLineIds = getStationLineIds(station);

  if (stationLineIds.length === 1) {
    return stationLineIds[0];
  }

  const destinationLineIds = destinationLineIdsByName[normalizeStationName(destination)] ?? [];
  const knownLineId = destinationLineIds.length === 1 ? destinationLineIds[0] : undefined;

  return knownLineId && stationLineIds.includes(knownLineId) ? knownLineId : undefined;
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

function groupLiveArrivalsByPublicSection(
  waitTimes: OfficialWaitTime[],
  station: Station,
  t: Translate,
): ArrivalSection[] {
  const grouped = waitTimes.reduce<Record<string, ArrivalSection>>((acc, waitTime) => {
    const destination = getPublicDestination(waitTime);
    const lineId = getReliableArrivalLineId(destination, station);
    const sectionKey = lineId ? `line-${lineId}` : `destination-${normalizeStationName(destination)}`;
    const title = lineId && lineById[lineId] ? t(lineById[lineId].nameKey) : destination;
    const arrivals = waitTime.arrivals.slice(0, 3).map((arrival) => ({
      destination,
      id: `${waitTime.platformId}-${arrival.id}`,
      lineId,
      displayMinutes: arrival.displayMinutes,
      minutes: arrival.displayMinutes ?? arrival.minutes,
      responseUpdatedAt: waitTime.responseUpdatedAt,
      secondsUntilArrival: arrival.secondsUntilArrival,
      platform: waitTime.platformId,
      trainId: arrival.trainId,
    }));

    const currentSection = acc[sectionKey] ?? { data: [], lineId, title };
    acc[sectionKey] = {
      ...currentSection,
      data: [...currentSection.data, ...arrivals]
        .sort((firstArrival, secondArrival) => firstArrival.minutes - secondArrival.minutes)
        .slice(0, 3),
    };

    return acc;
  }, {});

  return Object.values(grouped).filter((section) => section.data.length > 0);
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
  const {
    clearFavoriteStation,
    error: favoriteError,
    favoriteStationId,
    isLoading: isFavoriteLoading,
    saveFavoriteStation,
  } = useFavoriteStation();
  const [dataMode, setDataMode] = useState<"live" | "mocked">("mocked");
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [countdownNow, setCountdownNow] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCountdownNow(Date.now());
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);
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
      ? groupLiveArrivalsByPublicSection(platforms, station, t)
      : groupMockArrivalsByDirection(arrivals, t);
  const visibleArrivalSections = arrivalSections
    .map((section) => ({
      ...section,
      data: section.data.filter((arrival) => {
        const countdownLabel = formatArrivalCountdown(
          arrival,
          countdownNow,
          t("station.arriving"),
          t("station.minutes"),
        );

        return countdownLabel !== null && isArrivalVisible(arrival, countdownNow);
      }),
    }))
    .filter((section) => section.data.length > 0);
  const hasLivePlatforms = platforms.length > 0;
  const emptyMessage = getEmptyArrivalMessage(dataMode, arrivalState, emptyReason, hasLivePlatforms, t);
  const isFavoriteStation = favoriteStationId === station.id;

  return (
    <Screen>
      <SectionList
        sections={visibleArrivalSections}
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
            <Pressable
              accessibilityLabel={isFavoriteStation ? t("station.removeFavorite") : t("station.saveFavorite")}
              accessibilityRole="button"
              disabled={isFavoriteLoading}
              onPress={() => {
                void (isFavoriteStation ? clearFavoriteStation() : saveFavoriteStation(station.id));
              }}
              style={[styles.favoriteButton, isFavoriteStation && styles.favoriteButtonActive]}
            >
              <Text style={[styles.favoriteButtonText, isFavoriteStation && styles.favoriteButtonTextActive]}>
                {isFavoriteStation ? t("station.savedAsFavorite") : t("station.saveFavorite")}
              </Text>
            </Pressable>
            {favoriteError ? <Text style={styles.errorText}>{t("home.favoriteStationLoadError")}</Text> : null}
            <View style={styles.statusPanel}>
              <View style={styles.statusPanelHeader}>
                <Text style={styles.statusPanelTitle}>
                  {dataMode === "live" ? t("station.arrivalsLive") : t("station.arrivalsMocked")}
                </Text>
                {updatedAt ? (
                  <Text numberOfLines={1} style={styles.updatedAt}>
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
            {section.lineId ? <LineBadge lineId={section.lineId} /> : null}
            <Text style={styles.directionTitle}>{section.title}</Text>
          </View>
        )}
        renderItem={({ item }) => {
          const countdownLabel = formatArrivalCountdown(
            item,
            countdownNow,
            t("station.arriving"),
            t("station.minutes"),
          );

          if (!countdownLabel) {
            return null;
          }

          return (
            <View style={styles.card}>
              <ArrivalTimePill label={countdownLabel} styles={styles} />
              <View style={styles.arrivalBody}>
                <Text style={styles.destination}>{item.destination}</Text>
                {item.lineId ? (
                  <View style={styles.arrivalMeta}>
                    <LineBadge lineId={item.lineId} />
                  </View>
                ) : null}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          isLoading ? null : <Text style={styles.empty}>{emptyMessage}</Text>
        }
      />
    </Screen>
  );
}

function ArrivalTimePill({
  label,
  styles,
}: {
  label: string;
  styles: ReturnType<typeof createStyles>;
}) {
  const numericMatch = label.match(/^(\d+)\s+(.+)$/);

  if (numericMatch) {
    return (
      <View style={styles.arrivalTime}>
        <Text style={styles.minutesValue}>{numericMatch[1]}</Text>
        <Text style={styles.minutesLabel}>{numericMatch[2]}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.arrivalTime, styles.arrivalTimeArriving]}>
      <Text
        adjustsFontSizeToFit
        minimumFontScale={0.78}
        numberOfLines={2}
        style={styles.arrivingText}
      >
        {label}
      </Text>
    </View>
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
      borderRadius: radius.xl,
      borderWidth: 1,
      gap: spacing.sm,
      padding: spacing.lg,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.06,
      shadowRadius: 16,
      elevation: 2,
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
      borderRadius: radius.md,
      borderWidth: 1,
      minHeight: 48,
      justifyContent: "center",
      paddingHorizontal: spacing.md,
    },
    favoriteButtonActive: {
      backgroundColor: colors.successSoft,
      borderColor: colors.success,
    },
    favoriteButtonText: {
      color: colors.accent,
      fontSize: typography.body,
      fontWeight: "900",
    },
    favoriteButtonTextActive: {
      color: colors.success,
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
      borderRadius: radius.lg,
      borderWidth: 1,
      gap: spacing.xs,
      padding: spacing.md,
    },
    statusPanelHeader: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: spacing.sm,
      justifyContent: "space-between",
    },
    statusPanelTitle: {
      color: colors.text,
      flex: 1,
      fontSize: typography.caption,
      fontWeight: "900",
      lineHeight: 18,
      textTransform: "uppercase",
    },
    updatedAt: {
      color: colors.muted,
      flexShrink: 0,
      fontSize: typography.small,
      fontWeight: "700",
      lineHeight: 16,
      maxWidth: 150,
      textAlign: "right",
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
      alignItems: "center",
      flexDirection: "row",
      gap: spacing.xs,
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
      borderRadius: radius.lg,
      borderWidth: 1,
      flexDirection: "row",
      gap: spacing.md,
      marginBottom: spacing.sm,
      padding: spacing.md,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 10,
      elevation: 1,
    },
    arrivalTime: {
      alignItems: "center",
      backgroundColor: colors.accentSoft,
      borderRadius: radius.md,
      justifyContent: "center",
      minHeight: 58,
      minWidth: 72,
      paddingHorizontal: spacing.xs,
      paddingVertical: spacing.xs,
    },
    minutesValue: {
      color: colors.accent,
      fontSize: 24,
      fontWeight: "900",
      lineHeight: 26,
    },
    minutesLabel: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: "800",
      lineHeight: 13,
    },
    arrivalTimeArriving: {
      maxWidth: 82,
      minWidth: 82,
    },
    arrivingText: {
      color: colors.accent,
      fontSize: 13,
      fontWeight: "900",
      lineHeight: 16,
      textAlign: "center",
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
    empty: {
      color: colors.muted,
      fontSize: typography.body,
      paddingVertical: spacing.lg,
      textAlign: "center",
    },
    missingCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: radius.lg,
      borderWidth: 1,
      gap: spacing.sm,
      padding: spacing.md,
    },
  });
}
