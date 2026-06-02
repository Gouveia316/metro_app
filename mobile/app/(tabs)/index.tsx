import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { LineBadge } from "@/components/LineBadge";
import { Screen } from "@/components/Screen";
import { lines, stations } from "@/data/mockData";
import { colors, spacing, typography } from "@/styles/theme";

const favoriteStation = stations[0];
const delayedLines = lines.filter((line) => line.status !== "good_service");

export default function HomeScreen() {
  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Lisbon Metro</Text>
        <Text style={styles.title}>Today&apos;s network</Text>
      </View>

      <View style={styles.panel}>
        <Text style={styles.sectionTitle}>Favorite station</Text>
        <Text style={styles.stationName}>{favoriteStation.name}</Text>
        <View style={styles.badgeRow}>
          {favoriteStation.lines.map((lineId) => (
            <LineBadge key={lineId} lineId={lineId} />
          ))}
        </View>
        <Link
          href={{ pathname: "/stations/[stationId]", params: { stationId: favoriteStation.id } }}
          style={styles.link}
        >
          View next mocked trains
        </Link>
      </View>

      <View style={styles.panel}>
        <Text style={styles.sectionTitle}>Service snapshot</Text>
        <Text style={styles.body}>
          {delayedLines.length === 0
            ? "All mocked lines are currently showing good service."
            : `${delayedLines.length} mocked line needs attention today.`}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  eyebrow: {
    color: colors.muted,
    fontSize: typography.small,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  title: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: "800",
  },
  panel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.sm,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  sectionTitle: {
    color: colors.muted,
    fontSize: typography.small,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  stationName: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: "800",
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  body: {
    color: colors.text,
    fontSize: typography.body,
    lineHeight: 22,
  },
  link: {
    color: colors.accent,
    fontSize: typography.body,
    fontWeight: "700",
    marginTop: spacing.xs,
  },
});
