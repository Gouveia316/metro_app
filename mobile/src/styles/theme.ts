const sharedColors = {
  accent: "#E43C2F",
  blue: "#0072CE",
  green: "#00843D",
  red: "#E30613",
  yellow: "#FFD200",
};

export const lightTheme = {
  name: "light",
  colors: {
    ...sharedColors,
    accentSoft: "#FDE7E3",
    background: "#F8F6F2",
    border: "#E3E0DA",
    critical: "#E30613",
    criticalSoft: "#FDE8EA",
    info: "#0072CE",
    infoSoft: "#EAF4FC",
    muted: "#606A75",
    shadow: "#1F2933",
    soft: "#F1EEE9",
    success: "#00843D",
    successSoft: "#E5F4EC",
    surface: "#FFFFFF",
    surfaceRaised: "#FFFCFA",
    text: "#17212B",
    unknown: "#69727D",
    unknownSoft: "#EEF0F2",
    warning: "#A86900",
    warningSoft: "#FFF3C4",
  },
} as const;

export const darkTheme = {
  name: "dark",
  colors: {
    ...sharedColors,
    accentSoft: "#43201D",
    background: "#10171D",
    border: "#304050",
    critical: "#FF6B6B",
    criticalSoft: "#3B1D23",
    info: "#60A5FA",
    infoSoft: "#142943",
    muted: "#AEB8C2",
    shadow: "#000000",
    soft: "#1B2934",
    success: "#34D399",
    successSoft: "#143528",
    surface: "#172331",
    surfaceRaised: "#1B2B3A",
    text: "#F7FAFC",
    unknown: "#AEB8C2",
    unknownSoft: "#263544",
    warning: "#FBBF24",
    warningSoft: "#3A2C10",
  },
} as const;

export type AppTheme = typeof lightTheme | typeof darkTheme;
export type AppThemeName = AppTheme["name"];

export const colors = lightTheme.colors;

export const lineColors = {
  blue: sharedColors.blue,
  green: sharedColors.green,
  red: sharedColors.red,
  yellow: sharedColors.yellow,
};

export const spacing = {
  xxs: 4,
  xs: 6,
  sm: 10,
  md: 16,
  lg: 22,
  xl: 32,
  xxl: 44,
};

export const typography = {
  small: 12,
  caption: 13,
  body: 16,
  heading: 20,
  display: 26,
  title: 30,
  hero: 34,
};

export const radius = {
  xs: 6,
  sm: 8,
  md: 14,
  lg: 18,
  xl: 24,
};
