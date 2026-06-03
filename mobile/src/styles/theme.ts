const sharedColors = {
  accent: "#DC6441",
  blue: "#0072CE",
  green: "#00843D",
  red: "#E30613",
  yellow: "#FFD200",
};

export const lightTheme = {
  name: "light",
  colors: {
    ...sharedColors,
    accentSoft: "#FCEDE7",
    background: "#F8F7F4",
    border: "#E5E7EB",
    critical: "#E30613",
    criticalSoft: "#FDECEC",
    info: "#0072CE",
    infoSoft: "#EAF4FC",
    muted: "#6B7280",
    soft: "#F3F4F6",
    success: "#00843D",
    successSoft: "#EAF6EF",
    surface: "#FFFFFF",
    text: "#1F2933",
    warning: "#B77900",
    warningSoft: "#FFF7D6",
  },
} as const;

export const darkTheme = {
  name: "dark",
  colors: {
    ...sharedColors,
    accentSoft: "#3A2119",
    background: "#111827",
    border: "#374151",
    critical: "#FF6B6B",
    criticalSoft: "#3D1F23",
    info: "#60A5FA",
    infoSoft: "#172B47",
    muted: "#A7B0BE",
    soft: "#1F2937",
    success: "#34D399",
    successSoft: "#17352A",
    surface: "#18212F",
    text: "#F3F4F6",
    warning: "#FBBF24",
    warningSoft: "#3A2D13",
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
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
};

export const typography = {
  small: 12,
  caption: 13,
  body: 16,
  heading: 20,
  display: 26,
  title: 30,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
};
