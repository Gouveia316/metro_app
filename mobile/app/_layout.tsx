import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { AppPreferencesProvider, useAppPreferences } from "@/state/AppPreferences";

export default function RootLayout() {
  return (
    <AppPreferencesProvider>
      <RootNavigator />
    </AppPreferencesProvider>
  );
}

function RootNavigator() {
  const { t, theme, themeName } = useAppPreferences();
  const { colors } = theme;

  return (
    <>
      <StatusBar style={themeName === "light" ? "dark" : "light"} />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.background },
          headerTitleStyle: { color: colors.text },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="stations/[stationId]"
          options={{
            title: t("nav.station"),
            presentation: "card",
          }}
        />
      </Stack>
    </>
  );
}
