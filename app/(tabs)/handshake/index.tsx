import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { TRUST_RELATIONSHIPS, type TrustRelationship } from '@/app/mock-data';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppButton } from '@/components/ui/app-button';
import { AppCard } from '@/components/ui/app-card';
import { SectionHeader } from '@/components/ui/section-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { useThemeColor } from '@/hooks/use-theme-color';

type HandshakeStepStatus = 'pending' | 'active' | 'complete';
type HandshakeStage = 'idle' | 'collecting' | 'exchanging' | 'complete';

type ExchangeStep = {
  id: string;
  label: string;
};

const EXCHANGE_STEPS: ExchangeStep[] = [
  { id: 'connect', label: 'Connecting to nearby device' },
  { id: 'exchange', label: 'Exchanging public trust payloads' },
  { id: 'merge', label: 'Verifying and merging trust tree entries' },
  { id: 'complete', label: 'Finalizing handshake record' },
];

const EXCHANGE_STEP_DURATION_MS = 800;

function getStepStatus(stepIndex: number, currentStep: number): HandshakeStepStatus {
  if (stepIndex < currentStep) {
    return 'complete';
  }

  if (stepIndex === currentStep) {
    return 'active';
  }

  return 'pending';
}

function getBadgeTone(status: HandshakeStepStatus): 'neutral' | 'warning' | 'success' {
  if (status === 'complete') {
    return 'success';
  }

  if (status === 'active') {
    return 'warning';
  }

  return 'neutral';
}

function getBadgeLabel(status: HandshakeStepStatus): string {
  if (status === 'complete') {
    return 'Complete';
  }

  if (status === 'active') {
    return 'In Progress';
  }

  return 'Waiting';
}

export default function HandshakeScreen() {
  const inputBackgroundColor = useThemeColor({}, 'backgroundSecondary');
  const inputBorderColor = useThemeColor({}, 'borderSubtle');
  const inputTextColor = useThemeColor({}, 'text');

  const [relationships, setRelationships] = useState<TrustRelationship[]>(TRUST_RELATIONSHIPS);
  const [stage, setStage] = useState<HandshakeStage>('idle');
  const [nameToShare, setNameToShare] = useState('');
  const [contactMethodDraft, setContactMethodDraft] = useState('');
  const [contactMethods, setContactMethods] = useState<string[]>([]);
  const [exchangeStepIndex, setExchangeStepIndex] = useState(0);

  useEffect(() => {
    if (stage !== 'exchanging') {
      return;
    }

    if (exchangeStepIndex >= EXCHANGE_STEPS.length) {
      const newTrustProfile: TrustRelationship = {
        id: `tr-${Date.now()}`,
        localAlias: nameToShare.trim(),
        counterpartAlias: contactMethods[0] ?? 'NFC Exchange Contact',
        trustDepth: 1,
        handshakeStatus: 'verified',
      };

      setRelationships((currentRelationships) => [newTrustProfile, ...currentRelationships]);
      setStage('complete');
      return;
    }

    const timeout = setTimeout(() => {
      setExchangeStepIndex((currentIndex) => currentIndex + 1);
    }, EXCHANGE_STEP_DURATION_MS);

    return () => {
      clearTimeout(timeout);
    };
  }, [contactMethods, exchangeStepIndex, nameToShare, stage]);

  const canContinue = nameToShare.trim().length > 0;

  const handshakedProfileSummary = useMemo(() => {
    if (stage !== 'complete') {
      return null;
    }

    return {
      name: nameToShare.trim(),
      contactMethods,
    };
  }, [contactMethods, nameToShare, stage]);

  const startHandshake = () => {
    setStage('collecting');
    setNameToShare('');
    setContactMethodDraft('');
    setContactMethods([]);
    setExchangeStepIndex(0);
  };

  const addContactMethod = () => {
    const trimmedMethod = contactMethodDraft.trim();

    if (!trimmedMethod) {
      return;
    }

    setContactMethods((currentMethods) => [...currentMethods, trimmedMethod]);
    setContactMethodDraft('');
  };

  const beginExchange = () => {
    setExchangeStepIndex(0);
    setStage('exchanging');
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppCard>
          <SectionHeader
            title="Trust Relationships"
            subtitle="Mock trust graph entries from your local Merkle handshake tree."
          />

          {stage === 'collecting' ? (
            <View style={styles.flowSection}>
              <ThemedText type="subtitle">Share details for this handshake</ThemedText>
              <ThemedText>
                Share your preferred name and optionally add contact methods to include in this mock handshake.
              </ThemedText>

              <TextInput
                placeholder="Enter the name you want to share"
                placeholderTextColor="#8A8A8A"
                style={[
                  styles.input,
                  {
                    backgroundColor: inputBackgroundColor,
                    borderColor: inputBorderColor,
                    color: inputTextColor,
                  },
                ]}
                value={nameToShare}
                onChangeText={setNameToShare}
              />

              <View style={styles.inlineInputRow}>
                <TextInput
                  placeholder="Add a contact method (optional)"
                  placeholderTextColor="#8A8A8A"
                  style={[
                    styles.input,
                    styles.inlineInput,
                    {
                      backgroundColor: inputBackgroundColor,
                      borderColor: inputBorderColor,
                      color: inputTextColor,
                    },
                  ]}
                  value={contactMethodDraft}
                  onChangeText={setContactMethodDraft}
                />
                <AppButton label="Add" onPress={addContactMethod} style={styles.addButton} />
              </View>

              {contactMethods.length > 0 ? (
                <View style={styles.contactMethodList}>
                  {contactMethods.map((method) => (
                    <StatusBadge key={method} label={method} tone="neutral" />
                  ))}
                </View>
              ) : (
                <ThemedText>No contact methods selected.</ThemedText>
              )}

              <AppButton
                label="Continue to NFC exchange"
                onPress={beginExchange}
                disabled={!canContinue}
              />
            </View>
          ) : null}

          {stage === 'exchanging' ? (
            <View style={styles.flowSection}>
              <ThemedText type="subtitle">Hold phones next to each other</ThemedText>
              <ThemedText>
                Keep both devices close while we simulate NFC payload exchange and trust tree verification.
              </ThemedText>

              {EXCHANGE_STEPS.map((step, index) => {
                const status = getStepStatus(index, exchangeStepIndex);

                return (
                  <View key={step.id} style={styles.item}>
                    <ThemedText type="defaultSemiBold">{step.label}</ThemedText>
                    <StatusBadge label={getBadgeLabel(status)} tone={getBadgeTone(status)} />
                  </View>
                );
              })}
            </View>
          ) : null}

          {stage === 'complete' ? (
            <View style={styles.flowSection}>
              <ThemedText type="subtitle">Handshake complete</ThemedText>
              {handshakedProfileSummary ? (
                <>
                  <ThemedText>
                    Added {handshakedProfileSummary.name} to your trust list.
                  </ThemedText>
                  <ThemedText>
                    Shared contact methods:{' '}
                    {handshakedProfileSummary.contactMethods.length > 0
                      ? handshakedProfileSummary.contactMethods.join(', ')
                      : 'none'}
                  </ThemedText>
                </>
              ) : null}
              <AppButton label="Start Another Handshake" onPress={startHandshake} />
            </View>
          ) : null}

          {stage === 'idle' ? <AppButton label="Start Handshake" onPress={startHandshake} /> : null}

          <View style={styles.relationshipList}>
            {relationships.map((relationship) => (
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
          </View>
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
  relationshipList: {
    marginTop: 16,
    gap: 12,
  },
  flowSection: {
    gap: 12,
    marginBottom: 16,
  },
  inlineInputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  inlineInput: {
    flex: 1,
  },
  addButton: {
    minWidth: 72,
  },
  contactMethodList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 44,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  item: {
    gap: 4,
    marginBottom: 4,
  },
});
