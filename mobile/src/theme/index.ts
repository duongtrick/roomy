import { Platform } from "react-native";

/**
 * Design tokens.
 *
 * The palette is built from one blue ramp — deep / medium / soft — on white
 * and cool blue-grey neutrals. `primary` is the only colour that carries an
 * action; `primaryDeep` is for weight (headlines, dark panels) and
 * `primarySoft` for tinted surfaces, so the three never compete.
 */
export const colors = {
  /** Page ground: white with the faintest blue cast, so cards read as white. */
  background: "#F4F8FD",
  card: "#FFFFFF",
  foreground: "#0D1B2E",

  muted: "#EAF1FB",
  mutedForeground: "#5C6E88",

  /** Medium blue — buttons, links, active states. */
  primary: "#1A5FD0",
  primaryForeground: "#FFFFFF",
  /** Dark blue — display type, dark panels, the tab-bar selection. */
  primaryDeep: "#0A2E63",
  /** Light blue — chips, tinted rows, quiet fills. */
  primarySoft: "#DCE9FB",

  /** Dark panels (the testimonial block, avatars). */
  accent: "#0A2E63",
  accentForeground: "#FFFFFF",
  /** White at low alpha, for content sitting on `accent`. */
  onAccentDim: "rgba(255,255,255,0.65)",
  onAccentFill: "rgba(255,255,255,0.18)",

  destructive: "#D92D20",

  border: "rgba(13,27,46,0.10)",
  borderStrong: "rgba(13,27,46,0.18)",
  overlay: "rgba(10,27,52,0.45)",
  /** Frosted circles floating over photos (back button, favourite). */
  scrim: "rgba(255,255,255,0.92)",

  /** Cool neutral ramp — the blue-grey the whole UI sits on. */
  tint50: "#F7FAFE",
  tint100: "#EAF1FB",
  tint200: "#D6E3F5",
  tint400: "#8FA3C0",

  /** Status chips. `blue` is deliberately the soft blue, not `primary`. */
  emerald: { bg: "#DCFCE7", fg: "#15803D", border: "#BBF7D0" },
  blue: { bg: "#DCE9FB", fg: "#1A5FD0", border: "#BFD5F5" },
  amber: { bg: "#FEF3C7", fg: "#B45309", border: "#FDE68A" },
  neutral: { bg: "#EAF1FB", fg: "#5C6E88", border: "#D6E3F5" },

  /** Meter readings — amber for power, teal for water, never the brand blue. */
  power: "#D97706",
  water: "#0E7490",
} as const;

export const radius = {
  sm: 8,
  md: 10,
  lg: 12,
  xl: 16,
  "2xl": 20,
  "3xl": 24,
  full: 999,
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
} as const;

/**
 * Poppins, one weight per job.
 *
 * `regular` body, `medium` labels and table cells, `semibold` titles and
 * buttons, `bold` prices and eyebrows, `extrabold` display headlines,
 * `black` only for the oversized numerals, `italic` for quoted speech.
 * The files live in `assets/fonts` and are registered in `theme/fonts.ts`.
 */
export const font = {
  regular: "Poppins-Regular",
  italic: "Poppins-Italic",
  medium: "Poppins-Medium",
  semibold: "Poppins-SemiBold",
  bold: "Poppins-Bold",
  extrabold: "Poppins-ExtraBold",
  black: "Poppins-Black",
} as const;

export const shadow = {
  card: Platform.select({
    ios: {
      shadowColor: "#0A2E63",
      shadowOpacity: 0.1,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
    },
    android: { elevation: 3 },
    default: {},
  })!,
  lifted: Platform.select({
    ios: {
      shadowColor: "#0A2E63",
      shadowOpacity: 0.18,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 12 },
    },
    android: { elevation: 8 },
    default: {},
  })!,
} as const;

/** Height of the bottom tab bar, used to pad scroll views clear of it. */
export const TAB_BAR_HEIGHT = 58;
