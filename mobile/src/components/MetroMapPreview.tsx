import { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  type StyleProp,
  useWindowDimensions,
  View,
  type ViewStyle,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import MetroDiagramSvg from "@/components/metro-map/MetroDiagramSvg";
import { useAppPreferences } from "@/state/AppPreferences";
import { radius, spacing, typography } from "@/styles/theme";
import type { AppTheme } from "@/styles/theme";

export type MetroDiagramLineStatus = "normal" | "disrupted" | "interrupted" | "closed" | "unknown";
export type MetroDiagramLineStatuses = Partial<
  Record<"blue" | "yellow" | "green" | "red", MetroDiagramLineStatus>
>;

const MAP_ASPECT_RATIO = 1024 / 768;
const PREVIEW_VIEW_BOX = "20 70 960 670";
const FULLSCREEN_VIEW_BOX = "-100 -100 1300 975";
const NON_NORMAL_STATUSES: Exclude<MetroDiagramLineStatus, "normal">[] = [
  "disrupted",
  "interrupted",
  "closed",
  "unknown",
];
const LEGEND_LABEL_KEYS: Record<
  Exclude<MetroDiagramLineStatus, "normal">,
  | "lines.map.legend.disrupted"
  | "lines.map.legend.interrupted"
  | "lines.map.legend.closed"
  | "lines.map.legend.unknown"
> = {
  disrupted: "lines.map.legend.disrupted",
  interrupted: "lines.map.legend.interrupted",
  closed: "lines.map.legend.closed",
  unknown: "lines.map.legend.unknown",
};

type Props = {
  lineStatuses?: MetroDiagramLineStatuses;
};

type MetroMapSvgProps = Props & {
  labelColor: string;
  preserveAspectRatio?: string;
  showLabels: boolean;
  viewBox: string;
};

function MetroMapSvg({
  labelColor,
  lineStatuses,
  preserveAspectRatio = "xMidYMid meet",
  showLabels,
  viewBox,
}: MetroMapSvgProps) {
  return (
    <MetroDiagramSvg
      height="100%"
      labelColor={labelColor}
      lineStatuses={lineStatuses}
      preserveAspectRatio={preserveAspectRatio}
      showLabels={showLabels}
      showStationDots
      viewBox={viewBox}
      width="100%"
    />
  );
}

export function MetroMapPreview({ lineStatuses }: Props) {
  const { t, theme } = useAppPreferences();
  const [isOpen, setIsOpen] = useState(false);
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const styles = createStyles(theme.colors);
  const labelColor = theme.name === "dark" ? "#F8FAFC" : "#1F2933";
  const fullscreenMapHeight = Math.max(screenHeight - insets.top - insets.bottom - 132, 360);
  const fullscreenMapWidth = Math.max(screenWidth - spacing.md * 2, fullscreenMapHeight * MAP_ASPECT_RATIO);
  const activeLegendStatuses = useMemo(
    () =>
      NON_NORMAL_STATUSES.filter((status) =>
        Object.values(lineStatuses ?? {}).some((lineStatus) => lineStatus === status),
      ),
    [lineStatuses],
  );
  const shouldShowLegend = activeLegendStatuses.length > 0;
  const previewAccessibilityLabel = useMemo(
    () => `${t("lines.map.title")}. ${t("lines.map.open")}`,
    [t],
  );
  const getLegendLineStyle = (status: Exclude<MetroDiagramLineStatus, "normal">) => {
    if (status === "disrupted") {
      return styles.legendLineDisrupted;
    }

    if (status === "interrupted") {
      return styles.legendLineInterrupted;
    }

    if (status === "unknown") {
      return styles.legendLineUnknown;
    }

    return styles.legendLineClosed;
  };
  const isWarningMarkerStatus = (status: Exclude<MetroDiagramLineStatus, "normal">) =>
    status === "disrupted" || status === "interrupted";
  const renderLegend = (containerStyle: StyleProp<ViewStyle>) =>
    shouldShowLegend ? (
      <View pointerEvents="none" style={[styles.legend, containerStyle]}>
        {activeLegendStatuses.map((status) => (
          <View key={status} style={styles.legendItem}>
            {isWarningMarkerStatus(status) ? (
              <View style={[styles.legendMarker, getLegendLineStyle(status)]}>
                <Text style={styles.legendMarkerText}>!</Text>
              </View>
            ) : (
              <View style={[styles.legendLine, getLegendLineStyle(status)]} />
            )}
            <Text style={styles.legendText}>{t(LEGEND_LABEL_KEYS[status])}</Text>
          </View>
        ))}
      </View>
    ) : null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{t("lines.map.title")}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => setIsOpen(true)}
          style={({ pressed }) => [styles.openButton, pressed && styles.pressed]}
        >
          <Text style={styles.openButtonText}>{t("lines.map.open")}</Text>
        </Pressable>
      </View>
      <Pressable
        accessibilityLabel={previewAccessibilityLabel}
        accessibilityRole="imagebutton"
        onPress={() => setIsOpen(true)}
        style={({ pressed }) => [styles.previewFrame, pressed && styles.pressed]}
      >
        <MetroMapSvg
          labelColor={labelColor}
          lineStatuses={lineStatuses}
          preserveAspectRatio="xMidYMid slice"
          showLabels={false}
          viewBox={PREVIEW_VIEW_BOX}
        />
        {renderLegend(styles.previewLegend)}
      </Pressable>

      <Modal animationType="slide" onRequestClose={() => setIsOpen(false)} visible={isOpen}>
        <SafeAreaView edges={["bottom", "left", "right"]} style={styles.modal}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + spacing.md }]}>
            <Text style={styles.modalTitle}>{t("lines.map.title")}</Text>
            <Pressable
              accessibilityRole="button"
              hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
              onPress={() => setIsOpen(false)}
              style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
            >
              <Text style={styles.closeButtonText}>{t("lines.map.close")}</Text>
            </Pressable>
          </View>
          <ScrollView
            bouncesZoom
            centerContent
            horizontal
            maximumZoomScale={3}
            minimumZoomScale={1}
            showsHorizontalScrollIndicator={false}
            style={styles.mapScroller}
            contentContainerStyle={[styles.mapScrollerContent, { minHeight: fullscreenMapHeight }]}
          >
            <View
              style={[
                styles.fullscreenMapFrame,
                {
                  height: fullscreenMapHeight,
                  width: fullscreenMapWidth,
                },
              ]}
            >
              <MetroMapSvg
                labelColor={labelColor}
                lineStatuses={lineStatuses}
                showLabels
                viewBox={FULLSCREEN_VIEW_BOX}
              />
            </View>
          </ScrollView>
          {renderLegend(styles.fullscreenLegend)}
        </SafeAreaView>
      </Modal>
    </View>
  );
}

function createStyles(colors: AppTheme["colors"]) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surfaceRaised,
      borderRadius: 28,
      gap: spacing.xs,
      marginTop: spacing.sm,
      overflow: "hidden",
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.05,
      shadowRadius: 18,
      elevation: 2,
    },
    header: {
      alignItems: "center",
      flexDirection: "row",
      gap: spacing.md,
      justifyContent: "space-between",
      paddingBottom: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
    },
    title: {
      color: colors.text,
      flex: 1,
      fontSize: typography.heading,
      fontWeight: "900",
    },
    openButton: {
      backgroundColor: colors.accent,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    openButtonText: {
      color: "#FFFFFF",
      fontSize: typography.small,
      fontWeight: "900",
    },
    previewFrame: {
      backgroundColor: colors.surfaceRaised,
      height: 360,
      overflow: "hidden",
      position: "relative",
      width: "100%",
    },
    legend: {
      alignItems: "center",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.xs,
    },
    previewLegend: {
      bottom: spacing.sm,
      left: spacing.sm,
      position: "absolute",
      right: spacing.sm,
    },
    legendItem: {
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 999,
      flexDirection: "row",
      gap: spacing.xxs,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
    },
    legendLine: {
      borderRadius: 999,
      height: 3,
      width: 22,
    },
    legendMarker: {
      alignItems: "center",
      borderRadius: 999,
      borderColor: "#FFFFFF",
      borderWidth: 1.5,
      height: 13,
      justifyContent: "center",
      width: 13,
    },
    legendMarkerText: {
      color: "#FFFFFF",
      fontSize: 8,
      fontWeight: "900",
      lineHeight: 10,
    },
    legendLineDisrupted: {
      backgroundColor: "#F59E0B",
    },
    legendLineInterrupted: {
      backgroundColor: "#EF4444",
    },
    legendLineClosed: {
      backgroundColor: "#6B7280",
    },
    legendLineUnknown: {
      backgroundColor: "#94A3B8",
    },
    legendText: {
      color: colors.muted,
      fontSize: 10,
      fontWeight: "800",
    },
    fullscreenLegend: {
      paddingHorizontal: spacing.xs,
      paddingTop: spacing.xs,
    },
    modal: {
      backgroundColor: colors.background,
      flex: 1,
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
    },
    modalHeader: {
      alignItems: "center",
      flexDirection: "row",
      gap: spacing.md,
      justifyContent: "space-between",
      minHeight: 72,
      zIndex: 2,
      elevation: 2,
    },
    modalTitle: {
      color: colors.text,
      flex: 1,
      fontSize: typography.heading,
      fontWeight: "900",
    },
    closeButton: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: radius.md,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 44,
      minWidth: 68,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    closeButtonText: {
      color: colors.text,
      fontSize: typography.small,
      fontWeight: "900",
    },
    mapScroller: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: radius.xl,
      borderWidth: 1,
      flex: 1,
      overflow: "hidden",
    },
    mapScrollerContent: {
      alignItems: "center",
      justifyContent: "center",
    },
    fullscreenMapFrame: {
      backgroundColor: "transparent",
    },
    pressed: {
      opacity: 0.82,
    },
  });
}
