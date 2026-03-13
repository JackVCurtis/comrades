import { Stack } from 'expo-router';

export default function HandshakeLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Handshake Flow' }} />
    </Stack>
  );
}
