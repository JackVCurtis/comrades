import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { persistSecureAppState } from '@/modules/state/secureStatePersistence';

export const unstable_settings = {
  anchor: '(tabs)',
};

function isPersistenceTriggerState(nextAppState: AppStateStatus): boolean {
  return nextAppState === 'background' || nextAppState === 'inactive';
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      if (isPersistenceTriggerState(nextAppState)) {
        persistSecureAppState()
          .then(
            () => router.replace('/lock')
          )
        return;
      }
    });

    return () => {
      appStateSubscription.remove();
    };
  }, [pathname, router]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="lock" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name='onboarding' options={{ headerShown: false, gestureEnabled: false }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
