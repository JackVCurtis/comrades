import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function HandshakeScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Handshake Flow</ThemedText>
      <ThemedText>Use this flow to exchange trust handshakes and add people to your tree.</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
});
