import { Link, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { fetchOfficialStations } from "@/api/client";
import { LineBadge } from "@/components/LineBadge";
import { Screen } from "@/components/Screen";
import { getStationLineIds, lineById, stations } from "@/data/mockData";
import type { Station } from "@/data/mockData";
import { useFavoriteStation } from "@/favorites/useFavoriteStation";
import { useAppPreferences } from "@/state/AppPreferences";
import { radius, spacing, typography } from "@/styles/theme";
import type { AppTheme } from "@/styles/theme";

type Translate = ReturnType<typeof useAppPreferences>["t"];
type StationLineFilter = "all" | "blue" | "yellow" | "green" | "red";
type StationAliasConfig = {
  displayAliases?: string[];
  displayAliasesEn?: string[];
  searchAliases: string[];
};

const lineFilters: StationLineFilter[] = ["all", "blue", "yellow", "green", "red"];

const stationAliasesByName: Record<string, StationAliasConfig> = {
  aeroporto: {
    displayAliasesEn: ["Airport", "Lisbon Airport"],
    searchAliases: ["Airport", "Lisbon Airport"],
  },
  baixachiado: {
    displayAliases: ["Chiado", "Baixa"],
    searchAliases: ["Baixa Chiado", "Chiado", "Baixa"],
  },
  caisdosodre: {
    searchAliases: ["Cais", "Sodre"],
  },
  cidadeuniversitaria: {
    searchAliases: ["Cidade Universitaria", "Universidade"],
  },
  colegiomilitarluz: {
    displayAliases: ["Colombo", "Luz"],
    searchAliases: ["Colombo", "Colegio Militar", "Luz"],
  },
  entrecampos: {
    searchAliases: ["Entrecampos", "Entre-Campos"],
  },
  jardimzoologico: {
    displayAliases: ["Sete Rios"],
    searchAliases: ["Sete Rios"],
  },
  marquesdepombal: {
    displayAliases: ["Rotunda"],
    searchAliases: ["Marques", "Marques de Pombal", "Rotunda"],
  },
  oriente: {
    displayAliases: ["Gare do Oriente"],
    displayAliasesEn: ["Gare do Oriente", "Oriente Station"],
    searchAliases: ["Gare do Oriente", "Oriente Station"],
  },
  pracadeespanha: {
    searchAliases: ["Praca de Espanha"],
  },
  santapolonia: {
    searchAliases: ["Santa Apolonia", "Apolonia"],
  },
  saosebastiao: {
    searchAliases: ["Sao Sebastiao", "S. Sebastiao", "S Sebastiao"],
  },
  terreirodopaco: {
    displayAliases: ["Praca do Comercio"],
    searchAliases: ["Terreiro", "Praca do Comercio"],
  },
};

function normalizeSearchText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSearchKey(value: string) {
  return normalizeSearchText(value).replace(/\s+/g, "");
}

function getStationAliasConfig(station: Station) {
  return stationAliasesByName[normalizeSearchKey(station.name)];
}

function getStationSearchAliases(station: Station) {
  return getStationAliasConfig(station)?.searchAliases ?? [];
}

function getStationDisplayAliases(station: Station, language: string) {
  const config = getStationAliasConfig(station);

  if (!config) {
    return [];
  }

  return language === "en"
    ? [...(config.displayAliases ?? []), ...(config.displayAliasesEn ?? [])]
    : config.displayAliases ?? [];
}

function getFuzzyThreshold(query: string) {
  if (query.length <= 3) {
    return 0;
  }

  if (query.length <= 6) {
    return 1;
  }

  return 2;
}

function levenshteinDistance(firstValue: string, secondValue: string) {
  const distances = Array.from({ length: firstValue.length + 1 }, (_, index) => index);

  for (let secondIndex = 1; secondIndex <= secondValue.length; secondIndex += 1) {
    let previousDistance = distances[0];
    distances[0] = secondIndex;

    for (let firstIndex = 1; firstIndex <= firstValue.length; firstIndex += 1) {
      const savedDistance = distances[firstIndex];
      const cost = firstValue[firstIndex - 1] === secondValue[secondIndex - 1] ? 0 : 1;

      distances[firstIndex] = Math.min(
        distances[firstIndex] + 1,
        distances[firstIndex - 1] + 1,
        previousDistance + cost,
      );
      previousDistance = savedDistance;
    }
  }

  return distances[firstValue.length];
}

function getSearchTokens(value: string) {
  return normalizeSearchText(value)
    .split(" ")
    .filter((token) => token.length > 0);
}

function isFuzzyMatch(query: string, candidates: string[]) {
  const threshold = getFuzzyThreshold(query);

  if (threshold === 0) {
    return false;
  }

  return candidates.some((candidate) => {
    if (Math.abs(candidate.length - query.length) > threshold) {
      return false;
    }

    return levenshteinDistance(query, candidate) <= threshold;
  });
}

function getStationSearchRank(station: Station, query: string) {
  if (!query) {
    return 0;
  }

  const normalizedName = normalizeSearchText(station.name);
  const normalizedAliases = getStationSearchAliases(station).map(normalizeSearchText);

  if (normalizedName === query) {
    return 1;
  }

  if (normalizedName.startsWith(query)) {
    return 2;
  }

  if (normalizedAliases.some((alias) => alias === query)) {
    return 3;
  }

  if (normalizedName.includes(query)) {
    return 4;
  }

  if (normalizedAliases.some((alias) => alias.includes(query))) {
    return 5;
  }

  const fuzzyCandidates = [
    normalizedName,
    ...normalizedAliases,
    ...getSearchTokens(normalizedName),
    ...normalizedAliases.flatMap(getSearchTokens),
  ];

  return isFuzzyMatch(query, fuzzyCandidates) ? 6 : null;
}

function getLineFilterLabel(filter: StationLineFilter, t: Translate) {
  if (filter === "all") {
    return t("stations.filter.all");
  }

  return t(lineById[filter].nameKey).replace(" Line", "").replace("Linha ", "");
}

export default function StationsScreen() {
  const [query, setQuery] = useState("");
  const [activeLineFilter, setActiveLineFilter] = useState<StationLineFilter>("all");
  const [displayStations, setDisplayStations] = useState<Station[]>(stations);
  const { language, t, theme } = useAppPreferences();
  const { favoriteStationId, reloadFavoriteStation } = useFavoriteStation();
  const styles = createStyles(theme.colors);

  useFocusEffect(
    useCallback(() => {
      void reloadFavoriteStation();
    }, [reloadFavoriteStation]),
  );

  useEffect(() => {
    let isMounted = true;

    async function loadOfficialStations() {
      try {
        const result = await fetchOfficialStations();

        if (!isMounted) {
          return;
        }

        setDisplayStations(result.stations);
      } catch {
        if (!isMounted) {
          return;
        }

        setDisplayStations(stations);
      }
    }

    loadOfficialStations();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredStations = useMemo(() => {
    const normalizedQuery = normalizeSearchText(query);

    return displayStations
      .filter((station) => {
        const lineIds = getStationLineIds(station);

        return activeLineFilter === "all" || lineIds.includes(activeLineFilter);
      })
      .map((station) => ({
        rank: getStationSearchRank(station, normalizedQuery),
        station,
      }))
      .filter((result) => {
        return normalizedQuery ? result.rank !== null : true;
      })
      .sort((firstResult, secondResult) => {
        const firstRank = firstResult.rank ?? 0;
        const secondRank = secondResult.rank ?? 0;

        if (firstRank !== secondRank) {
          return firstRank - secondRank;
        }

        return firstResult.station.name.localeCompare(secondResult.station.name);
      })
      .map((result) => result.station);
  }, [activeLineFilter, displayStations, query]);

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
              placeholder={t("stations.searchByStationOrNickname")}
              placeholderTextColor={theme.colors.muted}
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
              style={styles.input}
            />
            <View style={styles.filterRow}>
              {lineFilters.map((filter) => {
                const isActive = activeLineFilter === filter;
                const filterColor = filter === "all" ? theme.colors.accent : lineById[filter].color;
                const activeTextColor = filter === "yellow" ? theme.colors.text : theme.colors.surface;
                const markerColor = isActive && filter !== "yellow" ? activeTextColor : filterColor;

                return (
                  <Pressable
                    key={filter}
                    accessibilityRole="button"
                    onPress={() => setActiveLineFilter(filter)}
                    style={[
                      styles.filterButton,
                      {
                        backgroundColor: isActive ? filterColor : theme.colors.surfaceRaised,
                        borderColor: isActive || filter !== "all" ? filterColor : theme.colors.border,
                      },
                    ]}
                  >
                    <View style={[styles.filterMarker, { backgroundColor: markerColor }]} />
                    <Text style={[styles.filterButtonText, { color: isActive ? activeTextColor : theme.colors.text }]}>
                      {getLineFilterLabel(filter, t)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.resultCount}>
              {t("stations.results", { count: filteredStations.length })}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const lineIds = getStationLineIds(item);
          const aliases = getStationDisplayAliases(item, language);
          const isFavoriteStation = item.id === favoriteStationId;

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
                  <View style={styles.stationNameRow}>
                    <Text style={styles.name}>{item.name}</Text>
                    {isFavoriteStation ? (
                      <View accessibilityLabel={t("station.savedAsFavorite")} style={styles.favoriteIndicator}>
                        <Text style={styles.favoriteIndicatorText}>{"\u2605"}</Text>
                      </View>
                    ) : null}
                  </View>
                  {aliases.length > 0 ? (
                    <Text style={styles.aliases}>
                      {t("stations.knownAs")}: {aliases.join(", ")}
                    </Text>
                  ) : null}
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
      lineHeight: 36,
    },
    subtitle: {
      color: colors.muted,
      fontSize: typography.body,
      lineHeight: 22,
    },
    input: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: radius.lg,
      borderWidth: 1,
      color: colors.text,
      fontSize: typography.body,
      minHeight: 52,
      paddingHorizontal: spacing.md,
    },
    resultCount: {
      color: colors.muted,
      fontSize: typography.small,
      fontWeight: "700",
      textTransform: "uppercase",
    },
    filterRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.xs,
    },
    filterButton: {
      alignItems: "center",
      borderRadius: 999,
      borderWidth: 1,
      flexDirection: "row",
      gap: spacing.xs,
      minHeight: 36,
      justifyContent: "center",
      paddingHorizontal: spacing.sm,
    },
    filterMarker: {
      borderRadius: 999,
      height: 8,
      width: 8,
    },
    filterButtonText: {
      fontSize: typography.caption,
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
      justifyContent: "space-between",
      marginBottom: spacing.sm,
      padding: spacing.md,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 10,
      elevation: 1,
    },
    stationCopy: {
      flex: 1,
      gap: spacing.xs,
    },
    stationNameRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: spacing.xs,
    },
    name: {
      color: colors.text,
      flexShrink: 1,
      fontSize: typography.heading,
      fontWeight: "900",
    },
    favoriteIndicator: {
      alignItems: "center",
      backgroundColor: colors.accentSoft,
      borderRadius: 999,
      height: 22,
      justifyContent: "center",
      width: 22,
    },
    favoriteIndicatorText: {
      color: colors.accent,
      fontSize: typography.small,
      fontWeight: "900",
      lineHeight: 16,
    },
    aliases: {
      color: colors.muted,
      fontSize: typography.caption,
      fontWeight: "700",
      lineHeight: 18,
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
