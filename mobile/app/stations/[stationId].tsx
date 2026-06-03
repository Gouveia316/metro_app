import { useLocalSearchParams } from "expo-router";
import { Pressable, SectionList, StyleSheet, Text, View } from "react-native";

import { getCachedOfficialStation } from "@/api/client";
import { LineBadge } from "@/components/LineBadge";
import { Screen } from "@/components/Screen";
import { arrivalsByStation, getStationLineIds, stations } from "@/data/mockData";
import type { Arrival, Station } from "@/data/mockData";
import type { TranslationKey } from "@/i18n/translations";
import { useAppPreferences } from "@/state/AppPreferences";
import { radius, spacing, typography } from "@/styles/theme";
import type { AppTheme } from "@/styles/theme";

type ArrivalSection = {
  titleKey: TranslationKey;
  data: Arrival[];
};

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

function groupArrivalsByDirection(arrivals: Arrival[]): ArrivalSection[] {
  const grouped = arrivals.reduce<Record<string, Arrival[]>>((acc, arrival) => {
    acc[arrival.directionKey] = [...(acc[arrival.directionKey] ?? []), arrival];
    return acc;
  }, {});

  return Object.entries(grouped).map(([titleKey, data]) => ({
    titleKey: titleKey as TranslationKey,
    data,
  }));
}

export default function StationDetailScreen() {
  const params = useLocalSearchParams<StationRouteParams>();
  const stationId = getParamValue(params.stationId);
  const { t, theme } = useAppPreferences();
  const styles = createStyles(theme.colors);
  const station =
    stations.find((item) => item.id === stationId) ??
    (stationId ? getCachedOfficialStation(stationId) : undefined) ??
    stationFromRouteParams(params);

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

  const arrivals = arrivalsByStation[station.id] ?? [];
  const arrivalSections = groupArrivalsByDirection(arrivals);

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
            <Text style={styles.sectionIntro}>{t("station.arrivalsByDirection")}</Text>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.directionHeader}>
            <Text style={styles.directionTitle}>{t(section.titleKey)}</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.arrivalTime}>
              <Text style={styles.minutes}>{item.minutes}</Text>
              <Text style={styles.minuteLabel}>{t("station.minute")}</Text>
            </View>
            <View style={styles.arrivalBody}>
              <Text style={styles.destination}>{item.destination}</Text>
              <View style={styles.arrivalMeta}>
                <LineBadge lineId={item.lineId} />
                <Text style={styles.platform}>{t("station.platform", { platform: item.platform })}</Text>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>{t("station.empty")}</Text>}
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
