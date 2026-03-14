import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppButton } from '@/components/ui/app-button';
import { AppCard } from '@/components/ui/app-card';
import { SectionHeader } from '@/components/ui/section-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { SIGNED_MESSAGES } from '@/app/mock-data';

export default function SignMessageScreen() {
  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppCard>
          <SectionHeader
            title="Signed Messages"
            subtitle="Mock messages with UUID headers and signature state for review."
          />
          {SIGNED_MESSAGES.map((message) => (
            <View key={message.id} style={styles.item}>
              <ThemedText type="defaultSemiBold">{message.title}</ThemedText>
              <ThemedText>{message.uuidHeader}</ThemedText>
              <ThemedText>Created: {message.createdAt}</ThemedText>
              <StatusBadge
                label={message.signatureStatus === 'verified' ? 'Signature Verified' : 'Awaiting Signature'}
                tone={message.signatureStatus === 'verified' ? 'success' : 'warning'}
              />
            </View>
          ))}
          <AppButton label="Generate Signature" />
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
