import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { PropsWithChildren } from "react";

import { translations } from "@/i18n/translations";
import type { Language, TranslationKey } from "@/i18n/translations";
import { darkTheme, lightTheme } from "@/styles/theme";
import type { AppTheme, AppThemeName } from "@/styles/theme";

type TranslationParams = Record<string, string | number>;

type AppPreferencesValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  theme: AppTheme;
  themeName: AppThemeName;
  toggleTheme: () => void;
  t: (key: TranslationKey, params?: TranslationParams) => string;
};

const AppPreferencesContext = createContext<AppPreferencesValue | null>(null);

function interpolate(template: string, params?: TranslationParams) {
  if (!params) {
    return template;
  }

  return Object.entries(params).reduce(
    (result, [key, value]) => result.replace(`{${key}}`, String(value)),
    template,
  );
}

export function AppPreferencesProvider({ children }: PropsWithChildren) {
  const [language, setLanguage] = useState<Language>("pt");
  const [themeName, setThemeName] = useState<AppThemeName>("light");

  const theme = themeName === "light" ? lightTheme : darkTheme;

  const toggleTheme = useCallback(() => {
    setThemeName((currentTheme) => (currentTheme === "light" ? "dark" : "light"));
  }, []);

  const t = useCallback(
    (key: TranslationKey, params?: TranslationParams) => interpolate(translations[language][key], params),
    [language],
  );

  // A tiny provider keeps language and theme shared by navigation and screens without persistence yet.
  const value = useMemo(
    () => ({
      language,
      setLanguage,
      theme,
      themeName,
      toggleTheme,
      t,
    }),
    [language, t, theme, themeName, toggleTheme],
  );

  return <AppPreferencesContext.Provider value={value}>{children}</AppPreferencesContext.Provider>;
}

export function useAppPreferences() {
  const context = useContext(AppPreferencesContext);

  if (!context) {
    throw new Error("useAppPreferences must be used inside AppPreferencesProvider");
  }

  return context;
}
