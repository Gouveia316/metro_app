import { StyleSheet, Text, View } from "react-native";

import { lineById } from "@/data/mockData";
import { useAppPreferences } from "@/state/AppPreferences";
import { radius, spacing, typography } from "@/styles/theme";

type Props = {
  lineId: string;
  variant?: "compact" | "full";
};

export function LineBadge({ lineId, variant = "compact" }: Props) {
  const { t } = useAppPreferences();
  const line = lineById[lineId];

  if (!line) {
    return null;
  }

  const isYellowLine = line.id === "yellow";
  const labelColor = isYellowLine ? "#17212B" : "#FFFFFF";
  const fullLabel = t(line.nameKey);
  const label = variant === "full" ? fullLabel : fullLabel.replace(" Line", "").replace("Linha ", "");

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: line.color,
          borderColor: isYellowLine ? "#C8A600" : line.color,
        },
      ]}
    >
      <View style={[styles.marker, { backgroundColor: labelColor }]} />
      <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1.5,
    flexDirection: "row",
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  marker: {
    borderRadius: 999,
    height: 6,
    opacity: 0.9,
    width: 6,
  },
  label: {
    fontSize: typography.caption,
    fontWeight: "900",
    lineHeight: 16,
  },
});
