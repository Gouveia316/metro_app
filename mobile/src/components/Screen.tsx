import type { PropsWithChildren } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppPreferences } from "@/state/AppPreferences";
import { spacing } from "@/styles/theme";

type Props = PropsWithChildren<{
  scroll?: boolean;
}>;

export function Screen({ children, scroll = false }: Props) {
  const { theme } = useAppPreferences();
  const { colors } = theme;
  const content = <View style={styles.content}>{children}</View>;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={["left", "right"]}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xl,
  },
});
