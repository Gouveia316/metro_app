import { Link } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { LineBadge } from "@/components/LineBadge";
import { Screen } from "@/components/Screen";
import { stations } from "@/data/mockData";
import { colors, spacing, typography } from "@/styles/theme";

export default function StationsScreen() {
  const [query, setQuery] = useState("");

  const filteredStations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return stations;
    }

    return stations.filter((station) => station.name.toLowerCase().includes(normalizedQuery));
  }, [query]);

  return (
    <Screen>
      <FlatList
        data={filteredStations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Stations</Text>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search station"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              style={styles.input}
            />
          </View>
        }
        renderItem={({ item }) => (
          <Link href={{ pathname: "/stations/[stationId]", params: { stationId: item.id } }} asChild>
            <Pressable style={styles.card}>
              <Text style={styles.name}>{item.name}</Text>
              <View style={styles.badgeRow}>
                {item.lines.map((lineId) => (
                  <LineBadge key={lineId} lineId={lineId} />
                ))}
              </View>
            </Pressable>
          </Link>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No mocked stations found.</Text>}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingBottom: spacing.xl,
  },
  header: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: "800",
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.text,
    fontSize: typography.body,
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  name: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "800",
    marginBottom: spacing.sm,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  empty: {
    color: colors.muted,
    fontSize: typography.body,
    paddingVertical: spacing.lg,
    textAlign: "center",
  },
});
