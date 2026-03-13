import { Stack } from 'expo-router';

export default function MessageDistanceLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Message Distance Flow' }} />
    </Stack>
  );
}
