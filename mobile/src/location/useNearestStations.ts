import * as Location from "expo-location";
import { useCallback, useState } from "react";

import { fetchOfficialStations } from "@/api/client";
import type { Station } from "@/data/mockData";
import { calculateHaversineDistanceMeters, hasValidCoordinates } from "@/location/distance";

export type NearestStation = Station & {
  distanceMeters: number;
};

type NearestStationStatus =
  | "idle"
  | "loading"
  | "success"
  | "permission_denied"
  | "location_unavailable"
  | "stations_unavailable"
  | "no_station_coordinates";

type NearestStationsState = {
  error: string | null;
  stations: NearestStation[];
  status: NearestStationStatus;
};

const initialState: NearestStationsState = {
  error: null,
  stations: [],
  status: "idle",
};

function sortStationsByDistance(stations: Station[], userLocation: Location.LocationObject["coords"]) {
  return stations
    .filter((station) => hasValidCoordinates(station))
    .map((station) => ({
      ...station,
      distanceMeters: calculateHaversineDistanceMeters(
        {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
        },
        {
          latitude: station.latitude,
          longitude: station.longitude,
        },
      ),
    }))
    .sort((firstStation, secondStation) => firstStation.distanceMeters - secondStation.distanceMeters);
}

export function useNearestStations() {
  const [state, setState] = useState<NearestStationsState>(initialState);

  const findNearestStations = useCallback(async () => {
    setState({ error: null, stations: [], status: "loading" });

    let permission: Location.LocationPermissionResponse;

    try {
      permission = await Location.requestForegroundPermissionsAsync();
    } catch (error) {
      setState({
        error: error instanceof Error ? error.message : null,
        stations: [],
        status: "location_unavailable",
      });
      return;
    }

    if (permission.status !== "granted") {
      setState({ error: null, stations: [], status: "permission_denied" });
      return;
    }

    let userLocation: Location.LocationObject;

    try {
      userLocation = await Location.getCurrentPositionAsync({});
    } catch (error) {
      setState({
        error: error instanceof Error ? error.message : null,
        stations: [],
        status: "location_unavailable",
      });
      return;
    }

    let stations: Station[];

    try {
      const result = await fetchOfficialStations();
      stations = result.stations;
    } catch (error) {
      setState({
        error: error instanceof Error ? error.message : null,
        stations: [],
        status: "stations_unavailable",
      });
      return;
    }

    const nearestStations = sortStationsByDistance(stations, userLocation.coords);

    setState({
      error: null,
      stations: nearestStations,
      status: nearestStations.length > 0 ? "success" : "no_station_coordinates",
    });
  }, []);

  return {
    ...state,
    findNearestStations,
    nearestStation: state.stations[0],
  };
}
