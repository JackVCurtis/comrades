import { ScrollView, StyleSheet, View } from 'react-native';

import {
  PROFILE_IDENTITY_DETAILS,
  PROFILE_IDENTITY_SHARING_NOTICE,
  TRUST_RELATIONSHIPS,
} from '@/app/mock-data';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppButton } from '@/components/ui/app-button';
import { AppCard } from '@/components/ui/app-card';
import { SectionHeader } from '@/components/ui/section-header';
import { StatusBadge } from '@/components/ui/status-badge';

export default function MessageDistanceScreen() {
  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppCard>
          <SectionHeader
            title="Profile Identity"
            subtitle="Local profile details used for your own records and optional sharing."
          />
          {PROFILE_IDENTITY_DETAILS.map((field) => (
            <View key={field.label} style={styles.item}>
              <ThemedText type="defaultSemiBold">{field.label}</ThemedText>
              <ThemedText>{field.value}</ThemedText>
            </View>
          ))}
          <StatusBadge label="Local Data Only" tone="neutral" />
          <ThemedText>{PROFILE_IDENTITY_SHARING_NOTICE}</ThemedText>
        </AppCard>

        <AppCard>
          <SectionHeader
            title="Message Distance Preview"
            subtitle="Mock distances for proving where message identities appear in your trust tree."
          />
          {TRUST_RELATIONSHIPS.map((relationship) => (
            <View key={relationship.id} style={styles.item}>
              <ThemedText type="defaultSemiBold">{relationship.localAlias}</ThemedText>
              <ThemedText>Merkle tree distance: {relationship.trustDepth}</ThemedText>
            </View>
          ))}
          <AppButton label="Verify Distance" />
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
    gap: 16,
  },
  item: {
    gap: 4,
    marginBottom: 8,
  },
});
