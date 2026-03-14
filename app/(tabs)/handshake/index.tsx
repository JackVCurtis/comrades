import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppButton } from '@/components/ui/app-button';
import { AppCard } from '@/components/ui/app-card';
import { SectionHeader } from '@/components/ui/section-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { TRUST_RELATIONSHIPS } from '@/app/mock-data';

export default function HandshakeScreen() {
  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppCard>
          <SectionHeader
            title="Trust Relationships"
            subtitle="Mock trust graph entries from your local Merkle handshake tree."
          />
          {TRUST_RELATIONSHIPS.map((relationship) => (
            <View key={relationship.id} style={styles.item}>
              <ThemedText type="defaultSemiBold">{relationship.localAlias}</ThemedText>
              <ThemedText>
                Alias for counterparty: {relationship.counterpartAlias}
              </ThemedText>
              <ThemedText>Distance from you: {relationship.trustDepth}</ThemedText>
              <StatusBadge
                label={relationship.handshakeStatus === 'verified' ? 'Handshake Verified' : 'Handshake Pending'}
                tone={relationship.handshakeStatus === 'verified' ? 'success' : 'warning'}
              />
            </View>
          ))}
          <AppButton label="Start Handshake" />
        </AppCard>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  item: {
    gap: 4,
    marginBottom: 12,
  },
});
