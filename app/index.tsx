import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { hasCompletedOnboarding } from '@/app/onboarding/onboardingState';

type OnboardingStatus = 'loading' | 'complete' | 'incomplete';

export default function Index() {
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus>('loading');

  useEffect(() => {
    let isMounted = true;

    const loadOnboardingStatus = async () => {
      const hasCompleted = await hasCompletedOnboarding();

      if (!isMounted) {
        return;
      }

      setOnboardingStatus(hasCompleted ? 'complete' : 'incomplete');
    };

    void loadOnboardingStatus();

    return () => {
      isMounted = false;
    };
  }, []);

  if (onboardingStatus === 'loading') {
    return <View testID="root-route-loading" />;
  }

  if (onboardingStatus === 'incomplete') {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/handshake" />;
}
