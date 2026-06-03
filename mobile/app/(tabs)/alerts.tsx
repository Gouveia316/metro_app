import { FlatList, StyleSheet, Text, View } from "react-native";

import { LineBadge } from "@/components/LineBadge";
import { Screen } from "@/components/Screen";
import { alerts } from "@/data/mockData";
import type { AlertSeverity } from "@/data/mockData";
import type { TranslationKey } from "@/i18n/translations";
import { useAppPreferences } from "@/state/AppPreferences";
import { radius, spacing, typography } from "@/styles/theme";
import type { AppTheme } from "@/styles/theme";

function getSeverityStyles(severity: AlertSeverity, colors: AppTheme["colors"]) {
  if (severity === "critical") {
    return {
      backgroundColor: colors.criticalSoft,
      borderColor: colors.critical,
      color: colors.critical,
      labelKey: "alerts.severity.critical" as TranslationKey,
    };
  }

  if (severity === "warning") {
    return {
      backgroundColor: colors.warningSoft,
      borderColor: colors.warning,
      color: colors.warning,
      labelKey: "alerts.severity.warning" as TranslationKey,
    };
  }

  return {
    backgroundColor: colors.infoSoft,
    borderColor: colors.info,
    color: colors.info,
    labelKey: "alerts.severity.info" as TranslationKey,
  };
}

export default function AlertsScreen() {
  const { t, theme } = useAppPreferences();
  const styles = createStyles(theme.colors);

  return (
    <Screen>
      <FlatList
        data={alerts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>{t("alerts.title")}</Text>
            <Text style={styles.subtitle}>{t("alerts.subtitle")}</Text>
          </View>
        }
        renderItem={({ item }) => {
          const severity = getSeverityStyles(item.severity, theme.colors);

          return (
            <View style={[styles.card, { borderLeftColor: severity.borderColor }]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.severity, { backgroundColor: severity.backgroundColor, color: severity.color }]}>
                  {t(severity.labelKey)}
                </Text>
                <Text style={styles.mockedLabel}>{t("alerts.mockedNotice")}</Text>
              </View>
              <Text style={styles.alertTitle}>{t(item.titleKey)}</Text>
              <Text style={styles.message}>{t(item.messageKey)}</Text>
              <View style={styles.badgeRow}>
                {item.affectedLines.map((lineId) => (
                  <LineBadge key={lineId} lineId={lineId} />
                ))}
              </View>
            </View>
          );
        }}
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
      borderLeftWidth: 5,
      gap: spacing.sm,
      marginBottom: spacing.md,
      padding: spacing.md,
    },
    cardHeader: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
    },
    severity: {
      borderRadius: radius.sm,
      fontSize: typography.small,
      fontWeight: "900",
      overflow: "hidden",
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      textTransform: "uppercase",
    },
    mockedLabel: {
      color: colors.muted,
      fontSize: typography.small,
      fontWeight: "800",
    },
    alertTitle: {
      color: colors.text,
      fontSize: typography.heading,
      fontWeight: "900",
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
}
