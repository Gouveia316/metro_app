import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { colors } from "@/styles/theme";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
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
            title: "Station",
            presentation: "card",
          }}
        />
      </Stack>
    </>
  );
}

