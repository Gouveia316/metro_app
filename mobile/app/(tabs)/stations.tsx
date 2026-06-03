import { Link } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { LineBadge } from "@/components/LineBadge";
import { Screen } from "@/components/Screen";
import { lineById, stations } from "@/data/mockData";
import { useAppPreferences } from "@/state/AppPreferences";
import { radius, spacing, typography } from "@/styles/theme";
import type { AppTheme } from "@/styles/theme";

export default function StationsScreen() {
  const [query, setQuery] = useState("");
  const { t, theme } = useAppPreferences();
  const styles = createStyles(theme.colors);

  const filteredStations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return stations;
    }

    return stations.filter((station) => {
      const lineNames = station.lines.map((lineId) => t(lineById[lineId]?.nameKey ?? "nav.lines")).join(" ");
      const searchableText = `${station.name} ${t(station.areaKey)} ${lineNames}`.toLowerCase();

      return searchableText.includes(normalizedQuery);
    });
  }, [query, t]);

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
            <Text style={styles.resultCount}>{t("stations.results", { count: filteredStations.length })}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Link href={{ pathname: "/stations/[stationId]", params: { stationId: item.id } }} asChild>
            <Pressable style={styles.card}>
              <View style={styles.stationCopy}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.area}>{t(item.areaKey)}</Text>
                <View style={styles.badgeRow}>
                  {item.lines.map((lineId) => (
                    <LineBadge key={lineId} lineId={lineId} />
                  ))}
                </View>
              </View>
              <Text style={styles.cardAction}>{t("stations.view")}</Text>
            </Pressable>
          </Link>
        )}
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
