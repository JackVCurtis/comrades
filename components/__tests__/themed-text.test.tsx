import { render } from '@testing-library/react-native';

import { ThemedText } from '@/components/themed-text';

describe('ThemedText', () => {
  it('renders children content', () => {
    const { getByText } = render(<ThemedText>Comrades</ThemedText>);

    expect(getByText('Comrades')).toBeTruthy();
  });
});
