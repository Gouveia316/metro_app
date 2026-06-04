import { Link, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  fetchOfficialLineStatus,
  fetchOfficialStationArrivals,
  fetchOfficialStations,
} from "@/api/client";
import type { StationArrivalsResult } from "@/api/client";
import { LineBadge } from "@/components/LineBadge";
import { Screen } from "@/components/Screen";
import {
  arrivalsByStation,
  getStationLineIds,
  lineById,
  lines as fallbackLines,
  stations as fallbackStations,
} from "@/data/mockData";
import type { Arrival, LineStatus, MetroLine, Station } from "@/data/mockData";
import { useFavoriteStation } from "@/favorites/useFavoriteStation";
import type { TranslationKey } from "@/i18n/translations";
import { useNearestStations } from "@/location/useNearestStations";
import type { NearestStation } from "@/location/useNearestStations";
import { useAppPreferences } from "@/state/AppPreferences";
import { radius, spacing, typography } from "@/styles/theme";
import type { AppTheme } from "@/styles/theme";

type Translate = ReturnType<typeof useAppPreferences>["t"];
type ServiceSeverity = "normal" | "warning" | "critical" | "unknown";
type ArrivalDataMode = "live" | "mocked";
type ArrivalState = StationArrivalsResult["state"];
type ArrivalEmptyReason = StationArrivalsResult["emptyReason"];

type ArrivalPreviewItem = {
  destination: string;
  id: string;
  lineId?: string;
  minutes: number;
  platform: string;
  trainId?: string;
};

type ArrivalPreviewState = {
  dataMode: ArrivalDataMode | null;
  emptyReason: ArrivalEmptyReason;
  hasError: boolean;
  isLoading: boolean;
  items: ArrivalPreviewItem[];
  state: ArrivalState | null;
  updatedAt: string | null;
};

type ServiceSummary = {
  affectedLines: MetroLine[];
  message: string;
  severity: ServiceSeverity;
  shouldShowCriticalAlert: boolean;
  title: string;
};

const emptyArrivalPreview: ArrivalPreviewState = {
  dataMode: null,
  emptyReason: null,
  hasError: false,
  isLoading: false,
  items: [],
  state: null,
  updatedAt: null,
};

// Local development visual preview override for the nearest-station card. Keep null for normal use.
const DEBUG_NEAREST_STATION_ID: string | null = null;

const DEBUG_NEAREST_STATIONS: Record<string, Station> = {
  AM: { id: "AM", name: "Alameda", lineIds: ["green", "red"], lines: ["green", "red"] },
  AP: { id: "AP", name: "Aeroporto", lineIds: ["red"], lines: ["red"] },
  BC: { id: "BC", name: "Baixa/Chiado", lineIds: ["blue", "green"], lines: ["blue", "green"] },
  CG: { id: "CG", name: "Campo Grande", lineIds: ["yellow", "green"], lines: ["yellow", "green"] },
  JZ: { id: "JZ", name: "Jardim Zoológico", lineIds: ["blue"], lines: ["blue"] },
  SA: { id: "SA", name: "Saldanha", lineIds: ["yellow", "red"], lines: ["yellow", "red"] },
  SS: { id: "SS", name: "São Sebastião", lineIds: ["blue", "red"], lines: ["blue", "red"] },
};

function getHomeStatusStyles(status: LineStatus, colors: AppTheme["colors"]) {
  if (status === "good_service") {
    return {
      backgroundColor: colors.successSoft,
      color: colors.success,
    };
  }

  if (status === "minor_delays" || status === "disrupted") {
    return {
      backgroundColor: colors.warningSoft,
      color: colors.warning,
    };
  }

  if (status === "unknown") {
    return {
      backgroundColor: colors.unknownSoft,
      color: colors.unknown,
    };
  }

  return {
    backgroundColor: colors.criticalSoft,
    color: colors.critical,
  };
}

function getLineSeverity(status: LineStatus): ServiceSeverity {
  if (status === "good_service") {
    return "normal";
  }

  if (status === "minor_delays" || status === "disrupted") {
    return "warning";
  }

  if (status === "unknown") {
    return "unknown";
  }

  return "critical";
}

function getServiceSummary(t: Translate, displayLines: MetroLine[]): ServiceSummary {
  const affectedLines = displayLines.filter((line) => line.status !== "good_service");
  const criticalLines = affectedLines.filter((line) => getLineSeverity(line.status) === "critical");
  const warningLines = affectedLines.filter((line) => getLineSeverity(line.status) === "warning");
  const unknownLines = affectedLines.filter((line) => getLineSeverity(line.status) === "unknown");
  const allLinesClosed = displayLines.every((line) => line.status === "closed" || line.status === "suspended");
  const relevantLine = criticalLines[0] ?? warningLines[0] ?? unknownLines[0];
  const relevantMessage = relevantLine ? relevantLine.note ?? t(relevantLine.noteKey) : "";
  const hasStrikeClosure =
    affectedLines.some((line) => line.statusReason === "strike") || /greve|strike/i.test(relevantMessage);

  if (allLinesClosed) {
    return {
      affectedLines,
      message: hasStrikeClosure ? t("home.serviceClosedStrike") : relevantMessage || t("home.serviceClosed"),
      severity: "critical",
      shouldShowCriticalAlert: true,
      title: t("home.serviceClosed"),
    };
  }

  if (criticalLines.length > 0) {
    return {
      affectedLines,
      message: hasStrikeClosure ? t("home.serviceClosedStrike") : relevantMessage || t("home.serviceDisrupted"),
      severity: "critical",
      shouldShowCriticalAlert: hasStrikeClosure,
      title: t("home.serviceDisrupted"),
    };
  }

  if (warningLines.length > 0) {
    return {
      affectedLines,
      message: relevantMessage || t("home.serviceAffectedLines", { count: affectedLines.length }),
      severity: "warning",
      shouldShowCriticalAlert: false,
      title: t("home.serviceDisrupted"),
    };
  }

  if (unknownLines.length > 0) {
    return {
      affectedLines,
      message: t("home.serviceAffectedLines", { count: affectedLines.length }),
      severity: "unknown",
      shouldShowCriticalAlert: false,
      title: t("home.serviceUnknown"),
    };
  }

  return {
    affectedLines: [],
    message: t("home.serviceNormalDetail"),
    severity: "normal",
    shouldShowCriticalAlert: false,
    title: t("home.serviceNormal"),
  };
}

function normalizeStationName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function getMockArrivalsForStation(station?: Station) {
  if (!station) {
    return [];
  }

  const directArrivals = arrivalsByStation[station.id];

  if (directArrivals) {
    return directArrivals;
  }

  const matchingMockStation = fallbackStations.find(
    (mockStation) => normalizeStationName(mockStation.name) === normalizeStationName(station.name),
  );

  return matchingMockStation ? arrivalsByStation[matchingMockStation.id] ?? [] : [];
}

function mapMockArrivalPreview(arrivals: Arrival[]): ArrivalPreviewItem[] {
  return arrivals
    .map((arrival) => ({
      destination: arrival.destination,
      id: arrival.id,
      lineId: arrival.lineId,
      minutes: arrival.minutes,
      platform: arrival.platform,
    }))
    .sort((firstArrival, secondArrival) => firstArrival.minutes - secondArrival.minutes)
    .slice(0, 3);
}

function mapLiveArrivalPreview(result: StationArrivalsResult, t: Translate): ArrivalPreviewItem[] {
  return result.platforms
    .flatMap((platform) =>
      platform.outOfService
        ? []
        : platform.arrivals.map((arrival) => ({
            destination: platform.destinationName ?? t("station.destinationCode", { code: platform.destinationCode || "-" }),
            id: `${platform.platformId}-${arrival.id}`,
            minutes: arrival.minutes,
            platform: platform.platformId,
            trainId: arrival.trainId,
          })),
    )
    .sort((firstArrival, secondArrival) => firstArrival.minutes - secondArrival.minutes)
    .slice(0, 3);
}

function getStationRouteParams(station: Station) {
  return {
    latitude: station.latitude == null ? "" : String(station.latitude),
    lineIds: getStationLineIds(station).join(","),
    longitude: station.longitude == null ? "" : String(station.longitude),
    name: station.name,
    stationId: station.id,
    zone: station.zone ?? "",
  };
}

function getStationAccentColors(station: Station | undefined, fallbackColor: string) {
  if (!station) {
    return [fallbackColor];
  }

  const lineColors = getStationLineIds(station)
    .map((lineId) => lineById[lineId]?.color)
    .filter((lineColor): lineColor is string => Boolean(lineColor));

  return lineColors.length > 0 ? lineColors : [fallbackColor];
}

function getDebugNearestStation(distanceMeters = 0): NearestStation | undefined {
  if (!DEBUG_NEAREST_STATION_ID) {
    return undefined;
  }

  const station =
    DEBUG_NEAREST_STATIONS[DEBUG_NEAREST_STATION_ID] ??
    fallbackStations.find((fallbackStation) => fallbackStation.id === DEBUG_NEAREST_STATION_ID);

  return station ? { ...station, distanceMeters } : undefined;
}

function getNearestStationMessageKey(status: ReturnType<typeof useNearestStations>["status"]): TranslationKey {
  if (status === "loading") {
    return "home.findingYourLocation";
  }

  if (status === "permission_denied") {
    return "home.locationPermissionDenied";
  }

  if (status === "location_unavailable") {
    return "home.locationUnavailable";
  }

  if (status === "stations_unavailable") {
    return "home.stationsUnavailable";
  }

  if (status === "no_station_coordinates") {
    return "home.noStationsWithCoordinates";
  }

  return "home.findNearestStation";
}

function formatDistance(t: Translate, distanceMeters: number) {
  if (distanceMeters < 1000) {
    return t("home.distanceMeters", { distance: Math.max(0, Math.round(distanceMeters)) });
  }

  return t("home.distanceKilometers", { distance: (distanceMeters / 1000).toFixed(1) });
}

function getArrivalEmptyMessage(preview: ArrivalPreviewState, t: Translate) {
  if (preview.hasError && preview.dataMode !== "mocked") {
    return t("home.arrivalsLoadError");
  }

  if (preview.state === "service_closed") {
    return preview.emptyReason === "strike" ? t("home.serviceClosedStrike") : t("home.serviceClosed");
  }

  return t("home.noArrivalsAvailable");
}

function getLocalArrivalPreview(station?: Station): ArrivalPreviewState {
  const items = mapMockArrivalPreview(getMockArrivalsForStation(station));

  return {
    dataMode: items.length > 0 ? "mocked" : null,
    emptyReason: null,
    hasError: false,
    isLoading: false,
    items,
    state: null,
    updatedAt: null,
  };
}

function useStationArrivalPreview(station?: Station): ArrivalPreviewState {
  const { t } = useAppPreferences();
  const stationId = station?.id;
  const [preview, setPreview] = useState<ArrivalPreviewState>(emptyArrivalPreview);

  useEffect(() => {
    let isMounted = true;

    async function loadArrivals() {
      if (!stationId) {
        setPreview(emptyArrivalPreview);
        return;
      }

      setPreview((currentPreview) => ({
        ...currentPreview,
        hasError: false,
        isLoading: true,
      }));

      try {
        const result = await fetchOfficialStationArrivals(stationId);

        if (!isMounted) {
          return;
        }

        setPreview({
          dataMode: "live",
          emptyReason: result.emptyReason,
          hasError: false,
          isLoading: false,
          items: mapLiveArrivalPreview(result, t),
          state: result.state,
          updatedAt: result.updatedAt,
        });
      } catch {
        if (!isMounted) {
          return;
        }

        const mockedItems = mapMockArrivalPreview(getMockArrivalsForStation(station));

        setPreview({
          dataMode: mockedItems.length > 0 ? "mocked" : null,
          emptyReason: null,
          hasError: mockedItems.length === 0,
          isLoading: false,
          items: mockedItems,
          state: null,
          updatedAt: null,
        });
      }
    }

    void loadArrivals();

    return () => {
      isMounted = false;
    };
  }, [station, stationId, t]);

  return preview;
}

export default function HomeScreen() {
  const { language, setLanguage, t, theme, themeName, toggleTheme } = useAppPreferences();
  const {
    error: favoriteError,
    favoriteStationId,
    isLoading: isFavoriteLoading,
    reloadFavoriteStation,
  } = useFavoriteStation();
  const {
    findNearestStations,
    nearestStation,
    refreshNearestStationsIfGranted,
    status: nearestStationStatus,
  } = useNearestStations();
  const [displayLines, setDisplayLines] = useState<MetroLine[]>(fallbackLines);
  const [lineDataMode, setLineDataMode] = useState<ArrivalDataMode>("mocked");
  const [lineUpdatedAt, setLineUpdatedAt] = useState<string | null>(null);
  const [favoriteStationOptions, setFavoriteStationOptions] = useState<Station[]>(fallbackStations);
  const [isFavoriteStationLoading, setIsFavoriteStationLoading] = useState(false);
  const styles = createStyles(theme.colors);
  const resolvedFavoriteStation = favoriteStationId
    ? favoriteStationOptions.find((station) => station.id === favoriteStationId)
    : undefined;
  const serviceSummary = getServiceSummary(t, displayLines);
  const debugNearestStation = getDebugNearestStation(nearestStation?.distanceMeters);
  const displayedNearestStation = debugNearestStation ?? nearestStation;
  const displayedNearestStationStatus = debugNearestStation ? "success" : nearestStationStatus;
  const liveNearestArrivalPreview = useStationArrivalPreview(debugNearestStation ? undefined : nearestStation);
  const nearestArrivalPreview = debugNearestStation
    ? getLocalArrivalPreview(debugNearestStation)
    : liveNearestArrivalPreview;
  const favoriteArrivalPreview = useStationArrivalPreview(resolvedFavoriteStation);

  const loadOfficialLines = useCallback(async () => {
    try {
      const result = await fetchOfficialLineStatus();

      setDisplayLines(result.lines);
      setLineDataMode("live");
      setLineUpdatedAt(result.updatedAt);
    } catch {
      setDisplayLines(fallbackLines);
      setLineDataMode("mocked");
      setLineUpdatedAt(null);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reloadFavoriteStation();
      void refreshNearestStationsIfGranted();
      void loadOfficialLines();
    }, [loadOfficialLines, refreshNearestStationsIfGranted, reloadFavoriteStation]),
  );

  useEffect(() => {
    let isMounted = true;

    async function loadFavoriteStationOptions() {
      if (!favoriteStationId) {
        setFavoriteStationOptions(fallbackStations);
        setIsFavoriteStationLoading(false);
        return;
      }

      setIsFavoriteStationLoading(true);

      try {
        const result = await fetchOfficialStations();

        if (isMounted) {
          setFavoriteStationOptions(result.stations);
        }
      } catch {
        if (isMounted) {
          setFavoriteStationOptions(fallbackStations);
        }
      } finally {
        if (isMounted) {
          setIsFavoriteStationLoading(false);
        }
      }
    }

    void loadFavoriteStationOptions();

    return () => {
      isMounted = false;
    };
  }, [favoriteStationId]);

  return (
    <Screen scroll>
      <View style={styles.header}>
        <View style={styles.brandLockup}>
          <View style={styles.brandMark}>
            <Text style={styles.brandMarkText}>M</Text>
          </View>
          <View style={styles.brandCopy}>
            <Text style={styles.title}>{t("home.title")}</Text>
            <Text style={styles.subtitle}>{t("home.subtitle")}</Text>
          </View>
        </View>
      </View>

      {serviceSummary.shouldShowCriticalAlert ? (
        <CriticalServiceAlert serviceSummary={serviceSummary} styles={styles} />
      ) : null}

      <View style={styles.mainStack}>
        <NearestStationPanel
          arrivalPreview={nearestArrivalPreview}
          colors={theme.colors}
          nearestStation={displayedNearestStation}
          onFindNearestStation={findNearestStations}
          status={displayedNearestStationStatus}
          styles={styles}
          t={t}
        />

        <FavoriteStationPanel
          arrivalPreview={favoriteArrivalPreview}
          favoriteStation={resolvedFavoriteStation}
          favoriteStationId={favoriteStationId}
          hasStorageError={Boolean(favoriteError)}
          isLoading={isFavoriteLoading || isFavoriteStationLoading}
          styles={styles}
          t={t}
        />
      </View>

      <LineSummary
        colors={theme.colors}
        dataMode={lineDataMode}
        displayLines={displayLines}
        styles={styles}
        t={t}
        updatedAt={lineUpdatedAt}
      />

      {!favoriteStationId ? <SaveFavoriteStationAction styles={styles} t={t} /> : null}

      <View style={styles.controlsCard}>
        <PreferenceRow label={t("app.language")} styles={styles}>
          <SegmentButton
            active={language === "pt"}
            label={t("app.language.pt")}
            onPress={() => setLanguage("pt")}
            styles={styles}
          />
          <SegmentButton
            active={language === "en"}
            label={t("app.language.en")}
            onPress={() => setLanguage("en")}
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

      <Text style={styles.disclaimer}>{t("app.disclaimer")}</Text>
    </Screen>
  );
}

function CriticalServiceAlert({
  serviceSummary,
  styles,
}: {
  serviceSummary: ServiceSummary;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.criticalAlert}>
      <View style={styles.criticalAlertDot} />
      <View style={styles.criticalAlertCopy}>
        <Text style={styles.criticalAlertTitle}>{serviceSummary.title}</Text>
        <Text style={styles.criticalAlertMessage}>{serviceSummary.message}</Text>
      </View>
    </View>
  );
}

function NearestStationPanel({
  arrivalPreview,
  colors,
  nearestStation,
  onFindNearestStation,
  status,
  styles,
  t,
}: {
  arrivalPreview: ArrivalPreviewState;
  colors: AppTheme["colors"];
  nearestStation?: NearestStation;
  onFindNearestStation: () => void;
  status: ReturnType<typeof useNearestStations>["status"];
  styles: ReturnType<typeof createStyles>;
  t: Translate;
}) {
  const isLoading = status === "loading";
  const hasNearestStation = status === "success" && nearestStation;
  const accentColors = getStationAccentColors(hasNearestStation ? nearestStation : undefined, colors.accent);

  return (
    <View style={styles.heroPanel}>
      <SegmentedLineAccent lineColors={accentColors} styles={styles} />
      <View style={styles.panelHeader}>
        <Text style={styles.sectionTitle}>{t("home.nearestStation")}</Text>
        {hasNearestStation ? (
          <Pressable
            accessibilityRole="button"
            disabled={isLoading}
            onPress={onFindNearestStation}
            style={styles.inlineButton}
          >
            <Text style={styles.inlineButtonText}>{t("home.refreshLocation")}</Text>
          </Pressable>
        ) : null}
      </View>

      {hasNearestStation ? (
        <>
          <View style={styles.stationHeaderBlock}>
            <Text style={styles.heroStationName}>{nearestStation.name}</Text>
            <Text style={styles.distanceText}>{formatDistance(t, nearestStation.distanceMeters)}</Text>
          </View>
          <View style={styles.badgeRow}>
            {getStationLineIds(nearestStation).map((lineId) => (
              <LineBadge key={lineId} lineId={lineId} />
            ))}
          </View>
          <StationArrivalsPreview preview={arrivalPreview} styles={styles} t={t} />
          <Text style={styles.privacyNote}>{t("home.locationPrivacyNote")}</Text>
          <Link href={{ pathname: "/stations/[stationId]", params: getStationRouteParams(nearestStation) }} asChild>
            <Pressable style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>{t("home.openStation")}</Text>
            </Pressable>
          </Link>
        </>
      ) : (
        <>
          <Text style={styles.stateTitle}>{t(getNearestStationMessageKey(status))}</Text>
          <Text style={styles.privacyNote}>{t("home.locationPrivacyNote")}</Text>
          <Pressable
            accessibilityRole="button"
            disabled={isLoading}
            onPress={onFindNearestStation}
            style={[styles.primaryButton, isLoading && styles.primaryButtonDisabled]}
          >
            <Text style={styles.primaryButtonText}>
              {isLoading ? t("home.findingYourLocation") : t("home.useLocation")}
            </Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

function SegmentedLineAccent({
  lineColors,
  styles,
}: {
  lineColors: string[];
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.stationAccentBar}>
      {lineColors.map((lineColor, index) => (
        <View key={`${lineColor}-${index}`} style={[styles.stationAccentSegment, { backgroundColor: lineColor }]} />
      ))}
    </View>
  );
}

function FavoriteStationPanel({
  arrivalPreview,
  favoriteStation,
  favoriteStationId,
  hasStorageError,
  isLoading,
  styles,
  t,
}: {
  arrivalPreview: ArrivalPreviewState;
  favoriteStation?: Station;
  favoriteStationId: string | null;
  hasStorageError: boolean;
  isLoading: boolean;
  styles: ReturnType<typeof createStyles>;
  t: Translate;
}) {
  if (!favoriteStationId) {
    return null;
  }

  if (isLoading) {
    return (
      <View style={styles.compactNotice}>
        <Text style={styles.sectionTitle}>{t("home.favoriteStation")}</Text>
        <Text style={styles.stateText}>{t("stations.loading")}</Text>
      </View>
    );
  }

  if (hasStorageError) {
    return (
      <View style={styles.compactNotice}>
        <Text style={styles.sectionTitle}>{t("home.favoriteStation")}</Text>
        <Text style={styles.stateText}>{t("home.favoriteStationLoadError")}</Text>
      </View>
    );
  }

  if (!favoriteStation) {
    return (
      <View style={styles.compactNotice}>
        <Text style={styles.sectionTitle}>{t("home.favoriteStation")}</Text>
        <Text style={styles.stateText}>{t("home.favoriteStationUnavailable")}</Text>
      </View>
    );
  }

  return (
    <View style={styles.panel}>
      <View style={styles.panelHeader}>
        <View style={styles.stationHeaderBlock}>
          <Text style={styles.sectionTitle}>{t("home.favoriteStation")}</Text>
          <Text style={styles.stationName}>{favoriteStation.name}</Text>
        </View>
      </View>
      <View style={styles.badgeRow}>
        {getStationLineIds(favoriteStation).map((lineId) => (
          <LineBadge key={lineId} lineId={lineId} />
        ))}
      </View>
      <StationArrivalsPreview preview={arrivalPreview} styles={styles} t={t} />
      <Link
        href={{
          pathname: "/stations/[stationId]",
          params: getStationRouteParams(favoriteStation),
        }}
        asChild
      >
        <Pressable style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>{t("home.openStation")}</Text>
        </Pressable>
      </Link>
      <Link href="/stations" asChild>
        <Pressable style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>{t("home.changeFavorite")}</Text>
        </Pressable>
      </Link>
    </View>
  );
}

function SaveFavoriteStationAction({
  styles,
  t,
}: {
  styles: ReturnType<typeof createStyles>;
  t: Translate;
}) {
  return (
    <Link href="/stations" asChild>
      <Pressable style={styles.saveFavoriteAction}>
        <Text style={styles.saveFavoriteActionText}>{t("home.saveFavoriteStation")}</Text>
      </Pressable>
    </Link>
  );
}

function StationArrivalsPreview({
  preview,
  styles,
  t,
}: {
  preview: ArrivalPreviewState;
  styles: ReturnType<typeof createStyles>;
  t: Translate;
}) {
  return (
    <View style={styles.arrivalsBlock}>
      <View style={styles.arrivalsHeader}>
        <Text style={styles.arrivalsTitle}>{t("home.nextTrainsTitle")}</Text>
        {preview.dataMode ? (
          <Text
            style={[
              styles.dataPill,
              preview.dataMode === "live" ? styles.liveDataPill : styles.mockedDataPill,
            ]}
          >
            {preview.dataMode === "live" ? t("home.liveData") : t("home.mockedData")}
          </Text>
        ) : null}
      </View>
      {preview.isLoading ? <Text style={styles.stateText}>{t("station.arrivalsLoading")}</Text> : null}
      {!preview.isLoading && preview.items.length === 0 ? (
        <Text style={styles.emptyArrivalText}>{getArrivalEmptyMessage(preview, t)}</Text>
      ) : null}
      {!preview.isLoading
        ? preview.items.map((arrival) => (
            <View key={arrival.id} style={styles.arrivalRow}>
              <View style={styles.arrivalMinutes}>
                <Text style={styles.arrivalMinutesValue}>{arrival.minutes}</Text>
                <Text style={styles.arrivalMinutesLabel}>{t("station.minutes")}</Text>
              </View>
              <View style={styles.arrivalCopy}>
                <Text style={styles.arrivalDestination}>{arrival.destination}</Text>
                <View style={styles.arrivalMeta}>
                  {arrival.lineId ? <LineBadge lineId={arrival.lineId} /> : null}
                  {arrival.trainId ? <Text style={styles.arrivalMetaText}>{t("station.train", { trainId: arrival.trainId })}</Text> : null}
                  <Text style={styles.arrivalMetaText}>{t("station.platform", { platform: arrival.platform })}</Text>
                </View>
              </View>
            </View>
          ))
        : null}
    </View>
  );
}

function LineSummary({
  colors,
  dataMode,
  displayLines,
  styles,
  t,
  updatedAt,
}: {
  colors: AppTheme["colors"];
  dataMode: ArrivalDataMode;
  displayLines: MetroLine[];
  styles: ReturnType<typeof createStyles>;
  t: Translate;
  updatedAt: string | null;
}) {
  return (
    <View style={styles.lineSummaryPanel}>
      <View style={styles.panelHeader}>
        <View>
          <Text style={styles.sectionTitle}>{t("home.quickLines")}</Text>
          {updatedAt ? (
            <Text style={styles.updatedAt}>{t("stations.updatedAt", { time: new Date(updatedAt).toLocaleString() })}</Text>
          ) : null}
        </View>
        <Link href="/lines" asChild>
          <Pressable>
            <Text style={styles.inlineAction}>{t("home.viewLines")}</Text>
          </Pressable>
        </Link>
      </View>
      <Text style={[styles.dataPill, dataMode === "live" ? styles.liveDataPill : styles.mockedDataPill]}>
        {dataMode === "live" ? t("home.liveData") : t("home.mockedData")}
      </Text>
      <View style={styles.lineChipGrid}>
        {displayLines.map((line) => (
          <View key={line.id} style={styles.lineChip}>
            <View style={[styles.lineChipStripe, { backgroundColor: line.color }]} />
            <View style={styles.lineChipCopy}>
              <Text style={styles.lineChipName}>{t(line.nameKey)}</Text>
              <Text style={[styles.lineChipStatus, getHomeStatusStyles(line.status, colors)]}>
                {t(line.statusLabelKey)}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
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
      marginBottom: spacing.md,
      paddingTop: spacing.xs,
    },
    brandLockup: {
      alignItems: "center",
      flexDirection: "row",
      gap: spacing.md,
    },
    brandMark: {
      alignItems: "center",
      backgroundColor: colors.accent,
      borderRadius: radius.md,
      height: 52,
      justifyContent: "center",
      width: 52,
    },
    brandMarkText: {
      color: colors.surface,
      fontSize: typography.heading,
      fontWeight: "900",
    },
    brandCopy: {
      flex: 1,
      gap: spacing.xxs,
    },
    title: {
      color: colors.text,
      fontSize: typography.title,
      fontWeight: "900",
      lineHeight: 35,
    },
    subtitle: {
      color: colors.muted,
      fontSize: typography.body,
      lineHeight: 23,
    },
    criticalAlert: {
      alignItems: "flex-start",
      backgroundColor: colors.criticalSoft,
      borderColor: colors.critical,
      borderRadius: radius.lg,
      borderWidth: 1,
      flexDirection: "row",
      gap: spacing.sm,
      marginBottom: spacing.md,
      padding: spacing.md,
    },
    criticalAlertDot: {
      backgroundColor: colors.critical,
      borderRadius: 999,
      height: 12,
      marginTop: 4,
      width: 12,
    },
    criticalAlertCopy: {
      flex: 1,
      gap: spacing.xxs,
    },
    criticalAlertTitle: {
      color: colors.critical,
      fontSize: typography.caption,
      fontWeight: "900",
      textTransform: "uppercase",
    },
    criticalAlertMessage: {
      color: colors.text,
      fontSize: typography.body,
      fontWeight: "800",
      lineHeight: 22,
    },
    mainStack: {
      gap: spacing.md,
      marginBottom: spacing.md,
    },
    heroPanel: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: radius.xl,
      borderWidth: 1,
      gap: spacing.md,
      overflow: "hidden",
      padding: spacing.lg,
      paddingLeft: spacing.lg + spacing.sm,
      position: "relative",
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 10,
      elevation: 1,
    },
    stationAccentBar: {
      bottom: 0,
      flexDirection: "column",
      left: 0,
      overflow: "hidden",
      position: "absolute",
      top: 0,
      width: 8,
    },
    stationAccentSegment: {
      flex: 1,
    },
    panel: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: radius.lg,
      borderWidth: 1,
      gap: spacing.md,
      padding: spacing.md,
    },
    compactNotice: {
      backgroundColor: colors.surfaceRaised,
      borderColor: colors.border,
      borderRadius: radius.md,
      borderWidth: 1,
      gap: spacing.xs,
      padding: spacing.md,
    },
    panelHeader: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: spacing.md,
      justifyContent: "space-between",
    },
    sectionTitle: {
      color: colors.accent,
      fontSize: typography.small,
      fontWeight: "900",
      letterSpacing: 0,
      textTransform: "uppercase",
    },
    stationHeaderBlock: {
      flex: 1,
      gap: spacing.xs,
    },
    heroStationName: {
      color: colors.text,
      fontSize: typography.hero,
      fontWeight: "900",
      lineHeight: 39,
    },
    stationName: {
      color: colors.text,
      fontSize: typography.heading,
      fontWeight: "900",
      lineHeight: 25,
    },
    distanceText: {
      color: colors.accent,
      fontSize: typography.body,
      fontWeight: "900",
    },
    badgeRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.xs,
    },
    arrivalsBlock: {
      backgroundColor: colors.surfaceRaised,
      borderColor: colors.border,
      borderRadius: radius.md,
      borderWidth: 1,
      gap: spacing.sm,
      padding: spacing.sm,
    },
    arrivalsHeader: {
      alignItems: "center",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.xs,
      justifyContent: "space-between",
    },
    arrivalsTitle: {
      color: colors.text,
      fontSize: typography.caption,
      fontWeight: "900",
      textTransform: "uppercase",
    },
    dataPill: {
      alignSelf: "flex-start",
      borderRadius: 999,
      fontSize: typography.small,
      fontWeight: "900",
      overflow: "hidden",
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
    },
    liveDataPill: {
      backgroundColor: colors.successSoft,
      color: colors.success,
    },
    mockedDataPill: {
      backgroundColor: colors.warningSoft,
      color: colors.warning,
    },
    arrivalRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: spacing.sm,
    },
    arrivalMinutes: {
      alignItems: "center",
      backgroundColor: colors.accentSoft,
      borderRadius: radius.sm,
      minWidth: 54,
      paddingVertical: spacing.xs,
    },
    arrivalMinutesValue: {
      color: colors.accent,
      fontSize: typography.heading,
      fontWeight: "900",
    },
    arrivalMinutesLabel: {
      color: colors.muted,
      fontSize: typography.small,
      fontWeight: "800",
    },
    arrivalCopy: {
      flex: 1,
      gap: spacing.xs,
    },
    arrivalDestination: {
      color: colors.text,
      fontSize: typography.body,
      fontWeight: "900",
    },
    arrivalMeta: {
      alignItems: "center",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.xs,
    },
    arrivalMetaText: {
      color: colors.muted,
      fontSize: typography.small,
      fontWeight: "800",
    },
    emptyArrivalText: {
      color: colors.muted,
      fontSize: typography.caption,
      fontWeight: "800",
      lineHeight: 19,
    },
    privacyNote: {
      color: colors.muted,
      fontSize: typography.small,
      lineHeight: 17,
    },
    stateTitle: {
      color: colors.text,
      fontSize: typography.heading,
      fontWeight: "900",
      lineHeight: 25,
    },
    stateText: {
      color: colors.text,
      fontSize: typography.body,
      fontWeight: "800",
      lineHeight: 22,
    },
    primaryButton: {
      alignItems: "center",
      backgroundColor: colors.accent,
      borderRadius: radius.md,
      minHeight: 48,
      justifyContent: "center",
      paddingHorizontal: spacing.md,
      shadowColor: colors.accent,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.18,
      shadowRadius: 8,
      elevation: 2,
    },
    primaryButtonDisabled: {
      opacity: 0.7,
    },
    primaryButtonText: {
      color: colors.surface,
      fontSize: typography.body,
      fontWeight: "900",
    },
    secondaryButton: {
      alignItems: "center",
      backgroundColor: colors.soft,
      borderColor: colors.border,
      borderRadius: radius.md,
      borderWidth: 1,
      minHeight: 44,
      justifyContent: "center",
      paddingHorizontal: spacing.md,
    },
    secondaryButtonText: {
      color: colors.text,
      fontSize: typography.caption,
      fontWeight: "900",
    },
    secondaryStrongButton: {
      alignItems: "center",
      backgroundColor: colors.accentSoft,
      borderColor: colors.accent,
      borderRadius: radius.md,
      borderWidth: 1,
      minHeight: 46,
      justifyContent: "center",
      paddingHorizontal: spacing.md,
    },
    secondaryStrongButtonText: {
      color: colors.accent,
      fontSize: typography.body,
      fontWeight: "900",
    },
    saveFavoriteAction: {
      alignItems: "center",
      alignSelf: "stretch",
      backgroundColor: colors.surfaceRaised,
      borderColor: colors.border,
      borderRadius: radius.md,
      borderWidth: 1,
      justifyContent: "center",
      marginBottom: spacing.md,
      minHeight: 44,
      paddingHorizontal: spacing.md,
    },
    saveFavoriteActionText: {
      color: colors.accent,
      fontSize: typography.caption,
      fontWeight: "900",
    },
    inlineButton: {
      backgroundColor: colors.accentSoft,
      borderRadius: 999,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
    },
    inlineButtonText: {
      color: colors.accent,
      fontSize: typography.small,
      fontWeight: "900",
    },
    lineSummaryPanel: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: radius.lg,
      borderWidth: 1,
      gap: spacing.sm,
      marginBottom: spacing.md,
      padding: spacing.md,
    },
    inlineAction: {
      color: colors.accent,
      fontSize: typography.caption,
      fontWeight: "900",
    },
    updatedAt: {
      color: colors.muted,
      fontSize: typography.small,
      fontWeight: "700",
      marginTop: spacing.xxs,
    },
    lineChipGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
    },
    lineChip: {
      backgroundColor: colors.surfaceRaised,
      borderColor: colors.border,
      borderRadius: radius.md,
      borderWidth: 1,
      flexBasis: "48%",
      flexDirection: "row",
      flexGrow: 1,
      gap: spacing.sm,
      minHeight: 68,
      overflow: "hidden",
      padding: spacing.sm,
    },
    lineChipStripe: {
      borderRadius: 999,
      width: 5,
    },
    lineChipCopy: {
      flex: 1,
      gap: spacing.xs,
    },
    lineChipName: {
      color: colors.text,
      fontSize: typography.caption,
      fontWeight: "900",
    },
    lineChipStatus: {
      alignSelf: "flex-start",
      borderRadius: 999,
      fontSize: typography.small,
      fontWeight: "900",
      overflow: "hidden",
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xxs,
    },
    controlsCard: {
      backgroundColor: colors.surfaceRaised,
      borderColor: colors.border,
      borderRadius: radius.lg,
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
      borderRadius: 999,
      borderWidth: 1,
      flex: 1,
      minHeight: 42,
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
