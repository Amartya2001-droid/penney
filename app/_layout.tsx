import { Stack, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppErrorFallback } from '../src/components/AppErrorFallback';
import { useTheme } from '../src/theme/useTheme';

/**
 * Paints the native root view (and the page body on web) in the theme background, so screen
 * transitions, keyboard reveals, and overscroll never flash the opposite colour.
 */
function useRootBackground(color: string) {
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(color).catch(() => {
      // Cosmetic only; the screens paint their own background regardless.
    });
  }, [color]);
}

/** expo-router renders this instead of the app when any screen throws while rendering. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const { scheme, colors } = useTheme();
  useRootBackground(colors.background);
  return (
    <SafeAreaProvider>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <AppErrorFallback error={error} retry={retry} />
    </SafeAreaProvider>
  );
}

export default function RootLayout() {
  const { scheme, colors } = useTheme();
  useRootBackground(colors.background);
  return (
    <SafeAreaProvider>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="transactions" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="demo" />
        <Stack.Screen name="+not-found" />
      </Stack>
    </SafeAreaProvider>
  );
}
