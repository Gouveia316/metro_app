import { Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Pressable, SectionList, StyleSheet, Text, View } from "react-native";

import {
  fetchStationArrivalsCached,
  getCachedStationArrivals,
  isStationArrivalsFresh,
} from "@/api/arrivalCache";
import { getCachedOfficialStation } from "@/api/client";
import type { OfficialWaitTime, StationArrivalsResult } from "@/api/client";
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

type DirectionArrivalGroup = {
  arrivals: DisplayArrival[];
  destination: string;
  id: string;
  lineId?: string;
};

type ArrivalSection = {
  lineId?: string;
  title: string;
  data: DirectionArrivalGroup[];
};

type CountdownArrivalItem = {
  displayMinutes?: number;
  id: string;
  minutes?: number;
  responseUpdatedAt?: string;
  secondsUntilArrival?: number;
};

type LoadStationArrivalsOptions = {
  forceRefresh?: boolean;
  showLoading?: boolean;
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

const EXIT_ANIMATION_MS = 180;
const AUTO_REFRESH_INTERVAL_MS = 15_000;

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

function formatUpdatedAtTime(updatedAt: string) {
  const updatedAtDate = new Date(updatedAt);

  if (Number.isNaN(updatedAtDate.getTime())) {
    return null;
  }

  return updatedAtDate.toLocaleTimeString(undefined, {
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
  });
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

function getReliableArrivalLineId(destination: string, station: Station, destinationCode?: string | null) {
  const stationLineIds = getStationLineIds(station);
  const normalizedDestination = normalizeStationName(destination);

  if (
    station.id === "MP" &&
    (normalizedDestination === normalizeStationName("Campo Grande") || destinationCode?.trim() === "45")
  ) {
    return "yellow";
  }

  if (stationLineIds.length === 1) {
    return stationLineIds[0];
  }

  const destinationLineIds = destinationLineIdsByName[normalizedDestination] ?? [];
  const knownLineId = destinationLineIds.length === 1 ? destinationLineIds[0] : undefined;

  return knownLineId && stationLineIds.includes(knownLineId) ? knownLineId : undefined;
}

function groupArrivalsByLineAndDestination(arrivals: DisplayArrival[], t: Translate): ArrivalSection[] {
  const groupedSections = arrivals.reduce<Record<string, ArrivalSection>>((acc, arrival) => {
    const sectionKey = arrival.lineId
      ? `line-${arrival.lineId}`
      : `destination-${normalizeStationName(arrival.destination)}`;
    const sectionTitle =
      arrival.lineId && lineById[arrival.lineId] ? t(lineById[arrival.lineId].nameKey) : arrival.destination;
    const currentSection = acc[sectionKey] ?? {
      data: [],
      lineId: arrival.lineId,
      title: sectionTitle,
    };
    const destinationKey = normalizeStationName(arrival.destination);
    const destinationGroupId = `${sectionKey}-${destinationKey}`;
    const currentDestinationGroup = currentSection.data.find((group) => group.id === destinationGroupId);
    const nextDestinationGroup: DirectionArrivalGroup = {
      arrivals: [...(currentDestinationGroup?.arrivals ?? []), arrival]
        .sort((firstArrival, secondArrival) => firstArrival.minutes - secondArrival.minutes)
        .slice(0, 3),
      destination: arrival.destination,
      id: destinationGroupId,
      lineId: arrival.lineId,
    };

    return {
      ...acc,
      [sectionKey]: {
        ...currentSection,
        data: currentDestinationGroup
          ? currentSection.data.map((group) => (group.id === destinationGroupId ? nextDestinationGroup : group))
          : [...currentSection.data, nextDestinationGroup],
      },
    };
  }, {});

  return Object.values(groupedSections).filter((section) => section.data.length > 0);
}

function groupMockArrivalsByLineAndDestination(arrivals: Arrival[], t: Translate): ArrivalSection[] {
  return groupArrivalsByLineAndDestination(
    arrivals.map((arrival) => ({
      destination: arrival.destination,
      id: arrival.id,
      lineId: arrival.lineId,
      minutes: arrival.minutes,
      platform: arrival.platform,
    })),
    t,
  );
}

function groupLiveArrivalsByPublicSection(
  waitTimes: OfficialWaitTime[],
  station: Station,
  t: Translate,
): ArrivalSection[] {
  const arrivals = waitTimes.flatMap((waitTime) => {
    if (waitTime.outOfService) {
      return [];
    }

    const destination = getPublicDestination(waitTime);
    const lineId = getReliableArrivalLineId(destination, station, waitTime.destinationCode);

    return waitTime.arrivals.map((arrival) => ({
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
  });

  return groupArrivalsByLineAndDestination(arrivals, t);
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

function hasLiveCountdown(arrival: CountdownArrivalItem) {
  return typeof arrival.secondsUntilArrival === "number" && Boolean(arrival.responseUpdatedAt);
}

function useArrivalExitAnimation(
  arrivals: CountdownArrivalItem[],
  now: number,
  arrivingLabel: string,
  minuteLabel: string,
) {
  const [removedArrivalIds, setRemovedArrivalIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const currentArrivalIds = new Set(arrivals.map((arrival) => arrival.id));

    setRemovedArrivalIds((currentRemovedIds) => {
      let nextRemovedIds = currentRemovedIds;

      currentRemovedIds.forEach((arrivalId) => {
        if (!currentArrivalIds.has(arrivalId)) {
          nextRemovedIds = nextRemovedIds === currentRemovedIds ? new Set(currentRemovedIds) : nextRemovedIds;
          nextRemovedIds.delete(arrivalId);
        }
      });

      arrivals.forEach((arrival) => {
        const countdownLabel = formatArrivalCountdown(arrival, now, arrivingLabel, minuteLabel);

        if (countdownLabel !== null && nextRemovedIds.has(arrival.id)) {
          nextRemovedIds = nextRemovedIds === currentRemovedIds ? new Set(currentRemovedIds) : nextRemovedIds;
          nextRemovedIds.delete(arrival.id);
        }
      });

      return nextRemovedIds;
    });
  }, [arrivals, arrivingLabel, minuteLabel, now]);

  const markArrivalExited = useCallback((arrivalId: string) => {
    setRemovedArrivalIds((currentRemovedIds) => {
      if (currentRemovedIds.has(arrivalId)) {
        return currentRemovedIds;
      }

      return new Set(currentRemovedIds).add(arrivalId);
    });
  }, []);

  return { markArrivalExited, removedArrivalIds };
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
  const isFocusedRef = useRef(true);
  const isMountedRef = useRef(false);
  const isRefreshingArrivalsRef = useRef(false);
  const lastAutoRefreshAtRef = useRef(0);
  const styles = createStyles(theme.colors);
  const station =
    stations.find((item) => item.id === stationId) ??
    (stationId ? getCachedOfficialStation(stationId) : undefined) ??
    stationFromRouteParams(params);

  useFocusEffect(
    useCallback(() => {
      isFocusedRef.current = true;

      return () => {
        isFocusedRef.current = false;
      };
    }, []),
  );

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const applyStationArrivalsResult = useCallback((result: StationArrivalsResult, hasResultError = false) => {
    setPlatforms(result.platforms);
    setArrivalState(result.state);
    setEmptyReason(result.emptyReason);
    setDataMode("live");
    setUpdatedAt(result.updatedAt);
    setHasError(hasResultError);
  }, []);

  const loadStationArrivals = useCallback(
    async ({ forceRefresh = false, showLoading = true }: LoadStationArrivalsOptions = {}) => {
      if (!stationId) {
        setIsLoading(false);
        return null;
      }

      const cachedResult = getCachedStationArrivals(stationId);

      if (cachedResult && !forceRefresh) {
        applyStationArrivalsResult(cachedResult);
        setIsLoading(false);

        if (isStationArrivalsFresh(stationId)) {
          return cachedResult;
        }
      } else if (showLoading) {
        setIsLoading(true);
      }

      try {
        const result = await fetchStationArrivalsCached(stationId, { forceRefresh });

        if (!isMountedRef.current) {
          return result;
        }

        applyStationArrivalsResult(result);
        return result;
      } catch {
        if (!isMountedRef.current) {
          return null;
        }

        if (cachedResult) {
          applyStationArrivalsResult(cachedResult, true);
          return cachedResult;
        }

        setPlatforms([]);
        setArrivalState(null);
        setEmptyReason(null);
        setDataMode("mocked");
        setUpdatedAt(null);
        setHasError(true);
      } finally {
        if (isMountedRef.current && showLoading) {
          setIsLoading(false);
        }
      }
      return null;
    },
    [applyStationArrivalsResult, stationId],
  );

  useEffect(() => {
    void loadStationArrivals();
  }, [loadStationArrivals]);

  const arrivingLabel = t("station.arriving");
  const minuteLabel = t("station.minutes");
  const arrivals = station ? getMockArrivalsForStation(station) : [];
  const arrivalSections = station
    ? dataMode === "live"
      ? groupLiveArrivalsByPublicSection(platforms, station, t)
      : groupMockArrivalsByLineAndDestination(arrivals, t)
    : [];
  const allArrivalItems = arrivalSections.flatMap((section) =>
    section.data.flatMap((directionGroup) => directionGroup.arrivals),
  );
  const { markArrivalExited, removedArrivalIds } = useArrivalExitAnimation(
    allArrivalItems,
    countdownNow,
    arrivingLabel,
    minuteLabel,
  );
  const visibleArrivalSections = arrivalSections
    .map((section) => ({
      ...section,
      data: section.data
        .map((directionGroup) => ({
          ...directionGroup,
          arrivals: directionGroup.arrivals.filter((arrival) => {
            const countdownLabel = formatArrivalCountdown(arrival, countdownNow, arrivingLabel, minuteLabel);

            return (
              !removedArrivalIds.has(arrival.id) &&
              (countdownLabel !== null || hasLiveCountdown(arrival))
            );
          }),
        }))
        .filter((directionGroup) => directionGroup.arrivals.length > 0),
    }))
    .filter((section) => section.data.length > 0);
  const hasLivePlatforms = platforms.length > 0;
  const emptyMessage = getEmptyArrivalMessage(dataMode, arrivalState, emptyReason, hasLivePlatforms, t);
  const isFavoriteStation = station ? favoriteStationId === station.id : false;
  const updatedAtTime = updatedAt ? formatUpdatedAtTime(updatedAt) : null;
  const shouldAutoRefreshArrivals = visibleArrivalSections.some((section) =>
    section.data.some((visibleGroup) => {
      const sourceGroup = arrivalSections
        .find((sourceSection) => sourceSection.title === section.title && sourceSection.lineId === section.lineId)
        ?.data.find((group) => group.id === visibleGroup.id);

      return (
        visibleGroup.arrivals.length > 0 &&
        visibleGroup.arrivals.length < 3 &&
        (sourceGroup?.arrivals.length ?? 0) >= 3
      );
    }),
  );

  useEffect(() => {
    if (!stationId || !shouldAutoRefreshArrivals || isLoading || !isFocusedRef.current) {
      return;
    }

    const nowMs = Date.now();

    if (
      isRefreshingArrivalsRef.current ||
      nowMs - lastAutoRefreshAtRef.current < AUTO_REFRESH_INTERVAL_MS
    ) {
      return;
    }

    lastAutoRefreshAtRef.current = nowMs;
    isRefreshingArrivalsRef.current = true;

    void loadStationArrivals({ forceRefresh: true, showLoading: false }).finally(() => {
      isRefreshingArrivalsRef.current = false;
    });
  }, [isLoading, loadStationArrivals, shouldAutoRefreshArrivals, stationId]);

  if (!station) {
    return (
      <>
        <Stack.Screen options={{ headerBackTitle: t("app.back"), title: t("nav.station") }} />
        <Screen>
          <View style={styles.missingCard}>
            <Text style={styles.title}>{t("station.notFoundTitle")}</Text>
            <Text style={styles.subtitle}>{t("station.notFoundBody")}</Text>
          </View>
        </Screen>
      </>
    );
  }

  return (
    <>
    <Stack.Screen options={{ headerBackTitle: t("app.back"), title: station.name }} />
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
                <Text style={styles.statusPanelTitle}>{t("station.realTimeData")}</Text>
                {updatedAtTime ? (
                  <Text numberOfLines={1} style={styles.updatedAt}>
                    {t("station.updatedAtTime", { time: updatedAtTime })}
                  </Text>
                ) : null}
              </View>
              {isLoading ? <Text style={styles.loadingText}>{t("station.arrivalsLoading")}</Text> : null}
              {hasError ? <Text style={styles.errorText}>{t("stations.error")}</Text> : null}
            </View>
            <Text style={styles.innerSectionTitle}>{t("station.nextTrains")}</Text>
          </View>
        }
        renderSectionHeader={({ section }) =>
          section.lineId ? (
            <View style={styles.directionHeader}>
              <LineSectionChip lineId={section.lineId} title={section.title} styles={styles} />
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.arrivalBody}>
              <View style={styles.destinationRow}>
                {item.lineId ? <ArrivalLineIndicator lineId={item.lineId} styles={styles} /> : null}
                <Text style={styles.destination}>{item.destination}</Text>
              </View>
              <View style={styles.arrivalTimes}>
                {item.arrivals.map((arrival) => {
                  const countdownLabel = formatArrivalCountdown(arrival, countdownNow, arrivingLabel, minuteLabel);
                  const isExiting = countdownLabel === null || !isArrivalVisible(arrival, countdownNow);

                  return (
                    <AnimatedArrivalTimePill
                      key={arrival.id}
                      arrivalId={arrival.id}
                      isExiting={isExiting}
                      label={countdownLabel ?? arrivingLabel}
                      onExited={markArrivalExited}
                      styles={styles}
                    />
                  );
                })}
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={
          isLoading ? null : <Text style={styles.empty}>{emptyMessage}</Text>
        }
      />
    </Screen>
    </>
  );
}

function ArrivalLineIndicator({
  lineId,
  styles,
}: {
  lineId: string;
  styles: ReturnType<typeof createStyles>;
}) {
  const lineColor = lineById[lineId]?.color;

  return lineColor ? <View style={[styles.arrivalLineIndicator, { backgroundColor: lineColor }]} /> : null;
}

function LineSectionChip({
  lineId,
  styles,
  title,
}: {
  lineId: string;
  styles: ReturnType<typeof createStyles>;
  title: string;
}) {
  const lineColor = lineById[lineId]?.color;
  const isYellowLine = lineId === "yellow";

  return (
    <View style={[styles.lineSectionChip, lineColor ? { backgroundColor: lineColor, borderColor: lineColor } : null]}>
      <Text style={[styles.lineSectionChipText, isYellowLine ? styles.lineSectionChipTextDark : styles.lineSectionChipTextLight]}>
        {title}
      </Text>
    </View>
  );
}

function AnimatedArrivalTimePill({
  arrivalId,
  isExiting,
  label,
  onExited,
  styles,
}: {
  arrivalId: string;
  isExiting: boolean;
  label: string;
  onExited: (arrivalId: string) => void;
  styles: ReturnType<typeof createStyles>;
}) {
  const opacity = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        duration: isExiting ? EXIT_ANIMATION_MS : 120,
        toValue: isExiting ? 0 : 1,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        duration: isExiting ? EXIT_ANIMATION_MS : 120,
        toValue: isExiting ? -4 : 0,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished && isExiting) {
        onExited(arrivalId);
      }
    });
  }, [arrivalId, isExiting, onExited, opacity, translateY]);

  return (
    <Animated.View style={[styles.arrivalTimeWrapper, { opacity, transform: [{ translateY }] }]}>
      <ArrivalTimePill label={label} styles={styles} />
    </Animated.View>
  );
}

function ArrivalTimePill({
  label,
  styles,
}: {
  label: string;
  styles: ReturnType<typeof createStyles>;
}) {
  const timeMatch = label.match(/^\d+:\d{2}$/);
  const numericMatch = label.match(/^(\d+)\s+(.+)$/);

  if (timeMatch) {
    return (
      <View style={[styles.arrivalTime, styles.arrivalTimeCountdown]}>
        <Text style={styles.arrivalTimeCountdownText}>{label}</Text>
      </View>
    );
  }

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
      fontSize: typography.body,
      fontWeight: "900",
      lineHeight: 22,
    },
    innerSectionTitle: {
      color: colors.accent,
      fontSize: typography.small,
      fontWeight: "900",
      letterSpacing: 0,
      lineHeight: 16,
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
    lineSectionChip: {
      alignItems: "center",
      alignSelf: "flex-start",
      backgroundColor: colors.accent,
      borderColor: colors.border,
      borderRadius: 999,
      borderWidth: 1,
      flexDirection: "row",
      minHeight: 32,
      overflow: "hidden",
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
    },
    lineSectionChipText: {
      fontSize: typography.caption,
      fontWeight: "900",
      lineHeight: 18,
    },
    lineSectionChipTextDark: {
      color: colors.text,
    },
    lineSectionChipTextLight: {
      color: colors.surface,
    },
    directionTitle: {
      color: colors.text,
      fontSize: typography.body,
      fontWeight: "900",
    },
    card: {
      alignItems: "stretch",
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: radius.lg,
      borderWidth: 1,
      gap: spacing.sm,
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
      flexShrink: 0,
      justifyContent: "center",
      minHeight: 58,
      minWidth: 72,
      paddingHorizontal: spacing.xs,
      paddingVertical: spacing.xs,
      width: 72,
    },
    arrivalTimeWrapper: {
      flexShrink: 0,
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
    arrivalTimeCountdown: {
      width: 76,
    },
    arrivalTimeCountdownText: {
      color: colors.accent,
      fontSize: 16,
      fontWeight: "900",
      lineHeight: 20,
      textAlign: "center",
    },
    arrivalTimeArriving: {
      minHeight: 58,
      minWidth: 72,
      width: 72,
    },
    arrivingText: {
      color: colors.accent,
      fontSize: 12,
      fontWeight: "900",
      lineHeight: 14,
      textAlign: "center",
      width: 60,
    },
    arrivalBody: {
      flex: 1,
      gap: spacing.sm,
    },
    arrivalTimes: {
      alignItems: "center",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.xs,
    },
    destination: {
      color: colors.text,
      fontSize: typography.heading,
      fontWeight: "900",
    },
    destinationRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: spacing.xs,
    },
    arrivalLineIndicator: {
      borderRadius: 999,
      height: 10,
      width: 10,
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
