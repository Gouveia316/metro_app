import { StyleSheet, Text, View } from "react-native";

import { lineById } from "@/data/mockData";
import { useAppPreferences } from "@/state/AppPreferences";
import { radius, spacing, typography } from "@/styles/theme";

type Props = {
  lineId: string;
};

export function LineBadge({ lineId }: Props) {
  const { t, theme } = useAppPreferences();
  const { colors } = theme;
  const line = lineById[lineId];

  if (!line) {
    return null;
  }

  return (
    <View style={[styles.badge, { backgroundColor: colors.surface, borderColor: line.color }]}>
      <View style={[styles.dot, { backgroundColor: line.color }]} />
      <Text style={[styles.label, { color: colors.text }]}>
        {t(line.nameKey).replace(" Line", "").replace("Linha ", "")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: radius.sm,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  dot: {
    borderRadius: 999,
    height: 9,
    width: 9,
  },
  label: {
    fontSize: typography.caption,
    fontWeight: "800",
  },
});
