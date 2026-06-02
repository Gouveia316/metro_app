import { StyleSheet, Text, View } from "react-native";

import { lineById } from "@/data/mockData";
import { colors, spacing, typography } from "@/styles/theme";

type Props = {
  lineId: string;
};

export function LineBadge({ lineId }: Props) {
  const line = lineById[lineId];

  if (!line) {
    return null;
  }

  return (
    <View style={styles.badge}>
      <View style={[styles.dot, { backgroundColor: line.color }]} />
      <Text style={styles.label}>{line.name.replace(" Line", "")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.soft,
    borderRadius: 8,
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  dot: {
    borderRadius: 999,
    height: 8,
    width: 8,
  },
  label: {
    color: colors.text,
    fontSize: typography.small,
    fontWeight: "800",
  },
});

