import { StyleSheet } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { AppButton } from '@/components/ui/app-button';
import { AppCard } from '@/components/ui/app-card';
import { SectionHeader } from '@/components/ui/section-header';
import { StatusBadge } from '@/components/ui/status-badge';

export default function HandshakeScreen() {
  return (
    <ThemedView style={styles.container}>
      <AppCard>
        <SectionHeader title="Handshake Flow" subtitle="Exchange trust handshakes and add people to your tree." />
        <StatusBadge label="Ready to Sync" tone="success" />
        <AppButton label="Start Handshake" />
      </AppCard>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
});
