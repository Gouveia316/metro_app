import { useLocalSearchParams } from "expo-router";
import { FlatList, StyleSheet, Text, View } from "react-native";

import { LineBadge } from "@/components/LineBadge";
import { Screen } from "@/components/Screen";
import { arrivalsByStation, stations } from "@/data/mockData";
import { colors, spacing, typography } from "@/styles/theme";

export default function StationDetailScreen() {
  const { stationId } = useLocalSearchParams<{ stationId: string }>();
  const station = stations.find((item) => item.id === stationId);

  if (!station) {
    return (
      <Screen>
        <Text style={styles.title}>Station not found</Text>
        <Text style={styles.subtitle}>This mocked station does not exist yet.</Text>
      </Screen>
    );
  }

  const arrivals = arrivalsByStation[station.id] ?? [];

  return (
    <Screen>
      <FlatList
        data={arrivals}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>{station.name}</Text>
            <View style={styles.badgeRow}>
              {station.lines.map((lineId) => (
                <LineBadge key={lineId} lineId={lineId} />
              ))}
            </View>
            <Text style={styles.subtitle}>Mocked next trains</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.arrivalTime}>
              <Text style={styles.minutes}>{item.minutes}</Text>
              <Text style={styles.minuteLabel}>min</Text>
            </View>
            <View style={styles.arrivalBody}>
              <Text style={styles.destination}>{item.destination}</Text>
              <View style={styles.arrivalMeta}>
                <LineBadge lineId={item.lineId} />
                <Text style={styles.platform}>Platform {item.platform}</Text>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No mocked arrivals available.</Text>}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
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
    fontWeight: "800",
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
  },
  card: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  arrivalTime: {
    alignItems: "center",
    backgroundColor: colors.soft,
    borderRadius: 8,
    minWidth: 64,
    paddingVertical: spacing.sm,
  },
  minutes: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900",
  },
  minuteLabel: {
    color: colors.muted,
    fontSize: typography.small,
    fontWeight: "700",
  },
  arrivalBody: {
    flex: 1,
    gap: spacing.sm,
  },
  destination: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: "800",
  },
  arrivalMeta: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  platform: {
    color: colors.muted,
    fontSize: typography.small,
    fontWeight: "700",
  },
  empty: {
    color: colors.muted,
    fontSize: typography.body,
    paddingVertical: spacing.lg,
    textAlign: "center",
  },
});

