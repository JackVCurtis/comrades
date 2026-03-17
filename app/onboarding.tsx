import { useRouter } from 'expo-router';
import { Button, StyleSheet, Text, View } from 'react-native';

import { markOnboardingCompleted } from '@/app/onboarding/onboardingState';

export default function OnboardingScreen() {
  const router = useRouter();

  const handleContinue = async () => {
    await markOnboardingCompleted();
    router.replace('/handshake');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Comrades</Text>
      <Text style={styles.body}>Complete onboarding to continue to handshake.</Text>
      <Button onPress={() => void handleContinue()} title="Continue" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
  },
  body: {
    textAlign: 'center',
  },
});
