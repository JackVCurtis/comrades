import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function MessageDistanceScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Message Distance Flow</ThemedText>
      <ThemedText>Inspect how far a signed message identity is from your local trust network.</ThemedText>
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
