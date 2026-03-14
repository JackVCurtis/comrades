import { StyleSheet } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { AppButton } from '@/components/ui/app-button';
import { AppCard } from '@/components/ui/app-card';
import { SectionHeader } from '@/components/ui/section-header';
import { StatusBadge } from '@/components/ui/status-badge';

export default function MessageDistanceScreen() {
  return (
    <ThemedView style={styles.container}>
      <AppCard>
        <SectionHeader
          title="Message Distance Flow"
          subtitle="Inspect how far a signed message identity is from your local trust network."
        />
        <StatusBadge label="No Proof Loaded" tone="neutral" />
        <AppButton label="Verify Distance" />
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
