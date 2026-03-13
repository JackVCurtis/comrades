import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function SignMessageScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Sign Message Flow</ThemedText>
      <ThemedText>Create and review signed messages tied to your trust identity.</ThemedText>
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
