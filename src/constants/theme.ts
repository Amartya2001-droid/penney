/** What the user picked in Settings. 'system' follows the device's light/dark setting. */
export type AppearancePreference = 'system' | 'light' | 'dark';

export type ColorScheme = 'light' | 'dark';

/** Semantic status colours: good, informational, needs attention, problem. */
export type Tone = 'success' | 'info' | 'warning' | 'danger';

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceMuted: string;
  /** Raised element on a muted track, e.g. the selected segment of a toggle. */
  surfaceRaised: string;
  text: string;
  textMuted: string;
  border: string;
  /** Main action buttons and selected chips. */
  primary: string;
  onPrimary: string;
  success: string;
  info: string;
  warning: string;
  danger: string;
  /** Text drawn on a solid tone background (e.g. the pace pill). */
  onTone: string;
  successSoft: string;
  infoSoft: string;
  warningSoft: string;
  dangerSoft: string;
  successBorder: string;
  infoBorder: string;
  warningBorder: string;
  dangerBorder: string;
  badgeEssential: string;
  badgeDiscretionary: string;
  /** Toasts: a surface that contrasts with the page in either theme. */
  inverseSurface: string;
  onInverse: string;
  inverseAccent: string;
  overlay: string;
  /** The soft shadow under Penney. */
  coinShadow: string;
  shadow: string;
}

export const lightColors: ThemeColors = {
  background: '#F6F3EC',
  surface: '#FFFFFF',
  surfaceMuted: '#EFEADF',
  surfaceRaised: '#FFFFFF',
  text: '#1C1B19',
  textMuted: '#635F58',
  border: '#E2DCCF',
  primary: '#1F2937',
  onPrimary: '#FFFFFF',
  success: '#2A7148',
  info: '#2F5D8A',
  warning: '#8F5D0F',
  danger: '#B42318',
  onTone: '#FFFFFF',
  successSoft: '#E5F2EA',
  infoSoft: '#E8EFF6',
  warningSoft: '#FBF1DF',
  dangerSoft: '#FBE7E5',
  successBorder: '#BFDDCA',
  infoBorder: '#C6D6E7',
  warningBorder: '#EED6A8',
  dangerBorder: '#F1C3BE',
  badgeEssential: '#E3ECF5',
  badgeDiscretionary: '#F6E7CF',
  inverseSurface: '#2B2116',
  onInverse: '#FFFFFF',
  inverseAccent: '#F2C14E',
  overlay: 'rgba(28, 27, 25, 0.45)',
  coinShadow: 'rgba(43, 33, 22, 0.15)',
  shadow: '#000000',
};

export const darkColors: ThemeColors = {
  background: '#161513',
  surface: '#211F1C',
  surfaceMuted: '#2B2824',
  surfaceRaised: '#423D35',
  text: '#EFEBE3',
  textMuted: '#ABA598',
  border: '#3A362F',
  primary: '#EFEBE3',
  onPrimary: '#161513',
  success: '#6CC48F',
  info: '#86B6E4',
  warning: '#E6AD4C',
  danger: '#F2847A',
  onTone: '#161513',
  successSoft: '#1D3326',
  infoSoft: '#1C2B3B',
  warningSoft: '#3A2C13',
  dangerSoft: '#3D201D',
  successBorder: '#2F5A3E',
  infoBorder: '#2E4A66',
  warningBorder: '#5E4820',
  dangerBorder: '#66332E',
  badgeEssential: '#26364A',
  badgeDiscretionary: '#40321F',
  inverseSurface: '#EFEBE3',
  onInverse: '#161513',
  inverseAccent: '#8A5A12',
  overlay: 'rgba(0, 0, 0, 0.6)',
  coinShadow: 'rgba(0, 0, 0, 0.45)',
  shadow: '#000000',
};

export const PALETTES: Record<ColorScheme, ThemeColors> = {
  light: lightColors,
  dark: darkColors,
};

export function toneColors(colors: ThemeColors, tone: Tone): { fg: string; soft: string; border: string } {
  return { fg: colors[tone], soft: colors[`${tone}Soft`], border: colors[`${tone}Border`] };
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;
