import { FlatList, StyleSheet, Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { lines } from "@/data/mockData";
import type { LineStatus } from "@/data/mockData";
import { useAppPreferences } from "@/state/AppPreferences";
import { radius, spacing, typography } from "@/styles/theme";
import type { AppTheme } from "@/styles/theme";

function getStatusStyles(status: LineStatus, colors: AppTheme["colors"]) {
  if (status === "good_service") {
    return {
      backgroundColor: colors.successSoft,
      color: colors.success,
    };
  }

  if (status === "minor_delays") {
    return {
      backgroundColor: colors.warningSoft,
      color: colors.warning,
    };
  }

  return {
    backgroundColor: colors.criticalSoft,
    color: colors.critical,
  };
}

export default function LinesScreen() {
  const { t, theme } = useAppPreferences();
  const styles = createStyles(theme.colors);

  return (
    <Screen>
      <FlatList
        data={lines}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>{t("lines.title")}</Text>
            <Text style={styles.subtitle}>{t("lines.subtitle")}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.lineIdentity}>
                <View style={[styles.lineSymbol, { backgroundColor: item.color }]} />
                <View>
                  <Text style={styles.name}>{t(item.nameKey)}</Text>
                  <Text style={styles.routeHint}>{t("lines.operatingStatus")}</Text>
                </View>
              </View>
              <Text style={[styles.status, getStatusStyles(item.status, theme.colors)]}>
                {t(item.statusLabelKey)}
              </Text>
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.note}>{t(item.noteKey)}</Text>
              <View style={styles.track}>
                <View style={[styles.trackFill, { backgroundColor: item.color }]} />
              </View>
            </View>
          </View>
        )}
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
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: radius.md,
      borderWidth: 1,
      gap: spacing.md,
      marginBottom: spacing.md,
      overflow: "hidden",
      padding: spacing.md,
    },
    cardHeader: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: spacing.md,
      justifyContent: "space-between",
    },
    lineIdentity: {
      alignItems: "center",
      flex: 1,
      flexDirection: "row",
      gap: spacing.sm,
    },
    lineSymbol: {
      borderRadius: 999,
      height: 36,
      width: 36,
    },
    cardBody: {
      gap: spacing.xs,
    },
    name: {
      color: colors.text,
      fontSize: typography.body,
      fontWeight: "900",
    },
    routeHint: {
      color: colors.muted,
      fontSize: typography.small,
      fontWeight: "700",
      marginTop: 2,
    },
    status: {
      borderRadius: radius.sm,
      fontSize: typography.small,
      fontWeight: "900",
      overflow: "hidden",
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
    },
    note: {
      color: colors.muted,
      fontSize: typography.body,
      lineHeight: 22,
    },
    track: {
      backgroundColor: colors.soft,
      borderRadius: 999,
      height: 6,
      marginTop: spacing.sm,
      overflow: "hidden",
    },
    trackFill: {
      borderRadius: 999,
      height: 6,
      width: "72%",
    },
  });
}
