import { FlatList, StyleSheet, Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { lines } from "@/data/mockData";
import { colors, spacing, typography } from "@/styles/theme";

export default function LinesScreen() {
  return (
    <Screen>
      <FlatList
        data={lines}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Lines status</Text>
            <Text style={styles.subtitle}>Mocked service state for the core MVP.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={[styles.lineStrip, { backgroundColor: item.color }]} />
            <View style={styles.cardBody}>
              <View style={styles.row}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.status}>{item.statusLabel}</Text>
              </View>
              <Text style={styles.note}>{item.note}</Text>
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
    flexDirection: "row",
    marginBottom: spacing.sm,
    overflow: "hidden",
  },
  lineStrip: {
    width: 6,
  },
  cardBody: {
    flex: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  row: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  name: {
    color: colors.text,
    flex: 1,
    fontSize: typography.body,
    fontWeight: "800",
  },
  status: {
    color: colors.accent,
    fontSize: typography.small,
    fontWeight: "800",
  },
  note: {
    color: colors.muted,
    fontSize: typography.body,
    lineHeight: 22,
  },
});

