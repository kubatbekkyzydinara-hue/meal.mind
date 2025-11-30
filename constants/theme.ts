import { Platform } from "react-native";

const primaryOrange = "#FF6B35";
const primaryOrangeDark = "#FF8555";

export const Colors = {
  light: {
    primary: primaryOrange,
    text: "#212529",
    textSecondary: "#6C757D",
    buttonText: "#FFFFFF",
    tabIconDefault: "#6C757D",
    tabIconSelected: primaryOrange,
    link: primaryOrange,
    backgroundRoot: "#FFFFFF",
    backgroundDefault: "#F8F9FA",
    backgroundSecondary: "#F2F2F2",
    backgroundTertiary: "#E9ECEF",
    border: "#E9ECEF",
    borderFocus: primaryOrange,
    placeholder: "#ADB5BD",
    statusGreen: "#28A745",
    statusYellow: "#FFC107",
    statusRed: "#DC3545",
    ratingGold: "#FFC107",
    overlay: "rgba(0, 0, 0, 0.4)",
    cardShadow: "rgba(0, 0, 0, 0.05)",
  },
  dark: {
    primary: primaryOrangeDark,
    text: "#ECEDEE",
    textSecondary: "#9BA1A6",
    buttonText: "#FFFFFF",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: primaryOrangeDark,
    link: primaryOrangeDark,
    backgroundRoot: "#1F2123",
    backgroundDefault: "#2A2C2E",
    backgroundSecondary: "#353739",
    backgroundTertiary: "#404244",
    border: "#404244",
    borderFocus: primaryOrangeDark,
    placeholder: "#6C757D",
    statusGreen: "#34CE57",
    statusYellow: "#FFD43B",
    statusRed: "#FF6B6B",
    ratingGold: "#FFD43B",
    overlay: "rgba(0, 0, 0, 0.6)",
    cardShadow: "rgba(0, 0, 0, 0.2)",
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  inputHeight: 48,
  buttonHeight: 52,
  fabSize: 56,
  iconSmall: 20,
  iconMedium: 24,
  iconLarge: 28,
  avatarSmall: 40,
  avatarMedium: 64,
  avatarLarge: 80,
  thumbnailSize: 64,
  cardImageHeight: 180,
};

export const BorderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  full: 9999,
};

export const Typography = {
  h1: {
    fontSize: 28,
    fontWeight: "700" as const,
  },
  h2: {
    fontSize: 22,
    fontWeight: "600" as const,
  },
  h3: {
    fontSize: 18,
    fontWeight: "600" as const,
  },
  h4: {
    fontSize: 16,
    fontWeight: "600" as const,
  },
  body: {
    fontSize: 16,
    fontWeight: "400" as const,
  },
  small: {
    fontSize: 14,
    fontWeight: "400" as const,
  },
  caption: {
    fontSize: 12,
    fontWeight: "400" as const,
  },
  link: {
    fontSize: 16,
    fontWeight: "500" as const,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

export const Shadows = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  elevated: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  fab: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
};
