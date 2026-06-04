import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

const FAVORITE_STATION_STORAGE_KEY = "metro.favoriteStationId";

type FavoriteStationState = {
  error: string | null;
  favoriteStationId: string | null;
  isLoading: boolean;
};

const initialState: FavoriteStationState = {
  error: null,
  favoriteStationId: null,
  isLoading: true,
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown favorite station storage error";
}

export function useFavoriteStation() {
  const [state, setState] = useState<FavoriteStationState>(initialState);

  const reloadFavoriteStation = useCallback(async () => {
    setState((currentState) => ({ ...currentState, isLoading: true }));

    try {
      const storedStationId = await AsyncStorage.getItem(FAVORITE_STATION_STORAGE_KEY);

      setState({
        error: null,
        favoriteStationId: storedStationId?.trim() || null,
        isLoading: false,
      });
    } catch (error) {
      setState((currentState) => ({
        ...currentState,
        error: getErrorMessage(error),
        isLoading: false,
      }));
    }
  }, []);

  const saveFavoriteStation = useCallback(async (stationId: string) => {
    const nextStationId = stationId.trim();

    if (!nextStationId) {
      return;
    }

    setState((currentState) => ({ ...currentState, isLoading: true }));

    try {
      await AsyncStorage.setItem(FAVORITE_STATION_STORAGE_KEY, nextStationId);

      setState({
        error: null,
        favoriteStationId: nextStationId,
        isLoading: false,
      });
    } catch (error) {
      setState((currentState) => ({
        ...currentState,
        error: getErrorMessage(error),
        isLoading: false,
      }));
    }
  }, []);

  const clearFavoriteStation = useCallback(async () => {
    setState((currentState) => ({ ...currentState, isLoading: true }));

    try {
      await AsyncStorage.removeItem(FAVORITE_STATION_STORAGE_KEY);

      setState({
        error: null,
        favoriteStationId: null,
        isLoading: false,
      });
    } catch (error) {
      setState((currentState) => ({
        ...currentState,
        error: getErrorMessage(error),
        isLoading: false,
      }));
    }
  }, []);

  useEffect(() => {
    void reloadFavoriteStation();
  }, [reloadFavoriteStation]);

  return {
    ...state,
    clearFavoriteStation,
    reloadFavoriteStation,
    saveFavoriteStation,
  };
}
