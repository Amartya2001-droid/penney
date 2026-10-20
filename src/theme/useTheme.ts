import { StyleSheet, useColorScheme } from 'react-native';
import {
  PALETTES,
  type AppearancePreference,
  type ColorScheme,
  type ThemeColors,
} from '../constants/theme';
import { usePenneyStore } from '../store/usePenneyStore';
import { resolveScheme } from './resolveScheme';

export interface Theme {
  scheme: ColorScheme;
  colors: ThemeColors;
  preference: AppearancePreference;
}

/**
 * The active palette. Needs no provider, so it also works in the crash screen,
 * which expo-router renders outside the normal layout tree.
 */
export function useTheme(): Theme {
  const preference = usePenneyStore((s) => s.appearance);
  const systemScheme = useColorScheme();
  const scheme = resolveScheme(preference, systemScheme);
  return { scheme, colors: PALETTES[scheme], preference };
}

type NamedStyles<T> = { [P in keyof T]: StyleSheet.NamedStyles<T>[P] };

/**
 * Declares a component's styles in terms of the theme palette.
 * Each palette's StyleSheet is built once, on first use, and then reused.
 *
 *   const useStyles = makeStyles((colors) => StyleSheet.create({ card: { backgroundColor: colors.surface } }));
 *   function Card() { const styles = useStyles(); ... }
 */
export function makeStyles<T extends NamedStyles<T>>(factory: (colors: ThemeColors) => T): () => T {
  const cache: Partial<Record<ColorScheme, T>> = {};
  return function useStyles(): T {
    const { scheme, colors } = useTheme();
    let styles = cache[scheme];
    if (!styles) {
      styles = factory(colors);
      cache[scheme] = styles;
    }
    return styles;
  };
}
