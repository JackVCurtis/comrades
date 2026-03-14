import { fireEvent, render } from '@testing-library/react-native';

import { AppButton } from '@/components/ui/app-button';
import { AppCard } from '@/components/ui/app-card';
import { SectionHeader } from '@/components/ui/section-header';
import { StatusBadge } from '@/components/ui/status-badge';

describe('UI primitives', () => {
  it('renders card, header, and badge content', () => {
    const { getByText } = render(
      <AppCard>
        <SectionHeader title="Trust Relationships" subtitle="Preview" />
        <StatusBadge label="Connected" tone="success" />
      </AppCard>
    );

    expect(getByText('Trust Relationships')).toBeTruthy();
    expect(getByText('Preview')).toBeTruthy();
    expect(getByText('Connected')).toBeTruthy();
  });

  it('disables button press when loading', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <AppButton label="Sync Tree" loading onPress={onPress} testID="sync-button" />
    );

    fireEvent.press(getByTestId('sync-button'));

    expect(onPress).not.toHaveBeenCalled();
  });
});
