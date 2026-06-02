import { FlatList, StyleSheet, Text, View } from "react-native";

import { LineBadge } from "@/components/LineBadge";
import { Screen } from "@/components/Screen";
import { alerts } from "@/data/mockData";
import { colors, spacing, typography } from "@/styles/theme";

export default function AlertsScreen() {
  return (
    <Screen>
      <FlatList
        data={alerts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Alerts</Text>
            <Text style={styles.subtitle}>Important mocked service notices.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.severity}>{item.severity}</Text>
            <Text style={styles.alertTitle}>{item.title}</Text>
            <Text style={styles.message}>{item.message}</Text>
            <View style={styles.badgeRow}>
              {item.affectedLines.map((lineId) => (
                <LineBadge key={lineId} lineId={lineId} />
              ))}
            </View>
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingBottom: spacing.xl,
  },
  header: {
    gap: spacing.xs,
    marginBottom: spacing.md,
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
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.sm,
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  severity: {
    color: colors.accent,
    fontSize: typography.small,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  alertTitle: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: "800",
  },
  message: {
    color: colors.muted,
    fontSize: typography.body,
    lineHeight: 22,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
});

