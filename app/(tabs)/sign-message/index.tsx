import { StyleSheet } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { AppButton } from '@/components/ui/app-button';
import { AppCard } from '@/components/ui/app-card';
import { SectionHeader } from '@/components/ui/section-header';
import { StatusBadge } from '@/components/ui/status-badge';

export default function SignMessageScreen() {
  return (
    <ThemedView style={styles.container}>
      <AppCard>
        <SectionHeader title="Sign Message Flow" subtitle="Create and review signed messages tied to your trust identity." />
        <StatusBadge label="Draft Mode" tone="warning" />
        <AppButton label="Generate Signature" />
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
