import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

import { useAppPreferences } from "@/state/AppPreferences";

type TabIconName = keyof typeof Ionicons.glyphMap;

function tabIcon(name: TabIconName) {
  return ({ color, size }: { color: string; size: number }) => (
    <Ionicons name={name} color={color} size={size} />
  );
}

export default function TabLayout() {
  const { t, theme } = useAppPreferences();
  const { colors } = theme;

  return (
    <Tabs
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { color: colors.text, fontWeight: "900" },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "800",
        },
        tabBarStyle: {
          borderTopColor: colors.border,
          backgroundColor: colors.surface,
          borderTopWidth: 1,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("nav.home"),
          tabBarIcon: tabIcon("home-outline"),
        }}
      />
      <Tabs.Screen
        name="lines"
        options={{
          title: t("nav.lines"),
          tabBarIcon: tabIcon("git-branch-outline"),
        }}
      />
      <Tabs.Screen
        name="stations"
        options={{
          title: t("nav.stations"),
          tabBarIcon: tabIcon("search-outline"),
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: t("nav.alerts"),
          tabBarIcon: tabIcon("alert-circle-outline"),
        }}
      />
    </Tabs>
  );
}
