import { Stack } from 'expo-router';

export default function SignMessageLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Sign Message Flow' }} />
    </Stack>
  );
}
