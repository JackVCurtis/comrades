import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { isUnlockInProgress, unlockGate } from '@/modules/security/unlockGate';
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
  const shouldCheckGateOnResumeRef = useRef(false);

  useEffect(() => {
    const persistSecureState = () => {
      void persistSecureAppState().catch((error) => {
        console.warn('Secure state persistence failed', error);
      });
    };

    const verifyGateOnResume = () => {
      if (isUnlockInProgress() || pathname === '/lock') {
        return;
      }

      void unlockGate().then((result) => {
        if (result.status === 'locked') {
          router.replace('/lock');
        }
      });
    };

    const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      if (isPersistenceTriggerState(nextAppState)) {
        shouldCheckGateOnResumeRef.current = true;
        persistSecureState();
        return;
      }

      if (nextAppState === 'active' && shouldCheckGateOnResumeRef.current) {
        shouldCheckGateOnResumeRef.current = false;
        verifyGateOnResume();
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
        <Stack.Screen name='onboarding' options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
