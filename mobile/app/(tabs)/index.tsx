import { Link } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { LineBadge } from "@/components/LineBadge";
import { Screen } from "@/components/Screen";
import { alerts, getStationLineIds, lines, stations } from "@/data/mockData";
import { useAppPreferences } from "@/state/AppPreferences";
import { radius, spacing, typography } from "@/styles/theme";
import type { AppTheme } from "@/styles/theme";

const favoriteStation = stations[0];
const delayedLines = lines.filter((line) => line.status !== "good_service");
const goodServiceCount = lines.length - delayedLines.length;
const urgentAlerts = alerts.filter((alert) => alert.severity !== "info").length;

export default function HomeScreen() {
  const { language, setLanguage, t, theme, themeName, toggleTheme } = useAppPreferences();
  const styles = createStyles(theme.colors);
  const favoriteStationArea = favoriteStation.areaKey
    ? t(favoriteStation.areaKey)
    : t("stations.zoneUnknown");

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>{t("home.eyebrow")}</Text>
        <Text style={styles.title}>{t("home.title")}</Text>
        <Text style={styles.subtitle}>{t("home.subtitle")}</Text>
      </View>

      <View style={styles.controlsCard}>
        <PreferenceRow label={t("app.language")} styles={styles}>
          <SegmentButton
            active={language === "en"}
            label={t("app.language.en")}
            onPress={() => setLanguage("en")}
            styles={styles}
          />
          <SegmentButton
            active={language === "pt"}
            label={t("app.language.pt")}
            onPress={() => setLanguage("pt")}
            styles={styles}
          />
        </PreferenceRow>
        <PreferenceRow label={t("app.theme")} styles={styles}>
          <SegmentButton
            active={themeName === "light"}
            label={t("app.theme.light")}
            onPress={themeName === "light" ? undefined : toggleTheme}
            styles={styles}
          />
          <SegmentButton
            active={themeName === "dark"}
            label={t("app.theme.dark")}
            onPress={themeName === "dark" ? undefined : toggleTheme}
            styles={styles}
          />
        </PreferenceRow>
      </View>

      <View style={styles.summaryGrid}>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{goodServiceCount}</Text>
          <Text style={styles.metricLabel}>{t("home.goodServiceMetric")}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{urgentAlerts}</Text>
          <Text style={styles.metricLabel}>{t("home.alertsMetric")}</Text>
        </View>
      </View>

      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <View>
            <Text style={styles.sectionTitle}>{t("home.favoriteStation")}</Text>
            <Text style={styles.stationName}>{favoriteStation.name}</Text>
            <Text style={styles.stationArea}>{favoriteStationArea}</Text>
          </View>
          <View style={styles.favoriteMark}>
            <Text style={styles.favoriteMarkText}>{t("home.saved")}</Text>
          </View>
        </View>
        <View style={styles.badgeRow}>
          {getStationLineIds(favoriteStation).map((lineId) => (
            <LineBadge key={lineId} lineId={lineId} />
          ))}
        </View>
        <Link href={{ pathname: "/stations/[stationId]", params: { stationId: favoriteStation.id } }} asChild>
          <Pressable style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{t("home.viewNextTrains")}</Text>
          </Pressable>
        </Link>
      </View>

      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <Text style={styles.sectionTitle}>{t("home.serviceSnapshot")}</Text>
          <Text style={styles.timestamp}>{t("home.mockedNow")}</Text>
        </View>
        {lines.map((line) => (
          <View key={line.id} style={styles.serviceRow}>
            <View style={[styles.serviceDot, { backgroundColor: line.color }]} />
            <View style={styles.serviceCopy}>
              <Text style={styles.serviceName}>{t(line.nameKey)}</Text>
              <Text style={styles.serviceNote}>{t(line.noteKey)}</Text>
            </View>
            <Text
              style={[
                styles.statusPill,
                line.status === "good_service" ? styles.goodPill : styles.warningPill,
              ]}
            >
              {t(line.statusLabelKey)}
            </Text>
          </View>
        ))}
      </View>

      <Text style={styles.disclaimer}>{t("app.disclaimer")}</Text>
    </Screen>
  );
}

function PreferenceRow({
  children,
  label,
  styles,
}: {
  children: ReactNode;
  label: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.preferenceRow}>
      <Text style={styles.preferenceLabel}>{label}</Text>
      <View style={styles.segmentGroup}>{children}</View>
    </View>
  );
}

function SegmentButton({
  active,
  label,
  onPress,
  styles,
}: {
  active: boolean;
  label: string;
  onPress?: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={active}
      onPress={onPress}
      style={[styles.segmentButton, active && styles.segmentButtonActive]}
    >
      <Text style={[styles.segmentButtonText, active && styles.segmentButtonTextActive]}>{label}</Text>
    </Pressable>
  );
}

function createStyles(colors: AppTheme["colors"]) {
  return StyleSheet.create({
    header: {
      gap: spacing.sm,
      marginBottom: spacing.lg,
    },
    eyebrow: {
      color: colors.accent,
      fontSize: typography.small,
      fontWeight: "800",
      letterSpacing: 0,
      textTransform: "uppercase",
    },
    title: {
      color: colors.text,
      fontSize: typography.title,
      fontWeight: "900",
      lineHeight: 36,
    },
    subtitle: {
      color: colors.muted,
      fontSize: typography.body,
      lineHeight: 23,
    },
    controlsCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: radius.md,
      borderWidth: 1,
      gap: spacing.md,
      marginBottom: spacing.md,
      padding: spacing.md,
    },
    preferenceRow: {
      gap: spacing.xs,
    },
    preferenceLabel: {
      color: colors.muted,
      fontSize: typography.small,
      fontWeight: "900",
      textTransform: "uppercase",
    },
    segmentGroup: {
      flexDirection: "row",
      gap: spacing.xs,
    },
    segmentButton: {
      alignItems: "center",
      backgroundColor: colors.soft,
      borderColor: colors.border,
      borderRadius: radius.sm,
      borderWidth: 1,
      flex: 1,
      minHeight: 40,
      justifyContent: "center",
      paddingHorizontal: spacing.sm,
    },
    segmentButtonActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    segmentButtonText: {
      color: colors.text,
      fontSize: typography.caption,
      fontWeight: "900",
    },
    segmentButtonTextActive: {
      color: colors.surface,
    },
    summaryGrid: {
      flexDirection: "row",
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    metricCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: radius.md,
      borderWidth: 1,
      flex: 1,
      minHeight: 112,
      padding: spacing.md,
    },
    metricValue: {
      color: colors.text,
      fontSize: typography.display,
      fontWeight: "900",
      marginBottom: spacing.xs,
    },
    metricLabel: {
      color: colors.muted,
      fontSize: typography.caption,
      fontWeight: "700",
      lineHeight: 18,
    },
    panel: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: radius.md,
      borderWidth: 1,
      gap: spacing.sm,
      marginBottom: spacing.md,
      padding: spacing.md,
    },
    panelHeader: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: spacing.md,
      justifyContent: "space-between",
    },
    sectionTitle: {
      color: colors.muted,
      fontSize: typography.small,
      fontWeight: "800",
      letterSpacing: 0,
      textTransform: "uppercase",
    },
    stationName: {
      color: colors.text,
      fontSize: typography.heading,
      fontWeight: "900",
      marginTop: spacing.xs,
    },
    stationArea: {
      color: colors.muted,
      fontSize: typography.caption,
      fontWeight: "700",
      marginTop: 2,
    },
    favoriteMark: {
      backgroundColor: colors.accentSoft,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
    },
    favoriteMarkText: {
      color: colors.accent,
      fontSize: typography.small,
      fontWeight: "800",
    },
    badgeRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.xs,
    },
    primaryButton: {
      alignItems: "center",
      backgroundColor: colors.accent,
      borderRadius: radius.sm,
      minHeight: 48,
      justifyContent: "center",
      marginTop: spacing.xs,
      paddingHorizontal: spacing.md,
    },
    primaryButtonText: {
      color: colors.surface,
      fontSize: typography.body,
      fontWeight: "900",
    },
    timestamp: {
      color: colors.muted,
      fontSize: typography.small,
      fontWeight: "700",
    },
    serviceRow: {
      alignItems: "center",
      borderTopColor: colors.border,
      borderTopWidth: 1,
      flexDirection: "row",
      gap: spacing.sm,
      paddingTop: spacing.sm,
    },
    serviceDot: {
      borderRadius: 999,
      height: 12,
      width: 12,
    },
    serviceCopy: {
      flex: 1,
      gap: 2,
    },
    serviceName: {
      color: colors.text,
      fontSize: typography.caption,
      fontWeight: "900",
    },
    serviceNote: {
      color: colors.muted,
      fontSize: typography.small,
      lineHeight: 17,
    },
    statusPill: {
      borderRadius: radius.sm,
      fontSize: typography.small,
      fontWeight: "900",
      overflow: "hidden",
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
    },
    goodPill: {
      backgroundColor: colors.successSoft,
      color: colors.success,
    },
    warningPill: {
      backgroundColor: colors.warningSoft,
      color: colors.warning,
    },
    disclaimer: {
      color: colors.muted,
      fontSize: typography.small,
      lineHeight: 17,
      marginBottom: spacing.xl,
      marginTop: spacing.xs,
      textAlign: "center",
    },
  });
}
