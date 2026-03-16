import { Pressable, StyleSheet, ActivityIndicator, type PressableProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';

type AppButtonProps = Omit<PressableProps, 'children'> & {
  label: string;
  loading?: boolean;
};

export function AppButton({ label, loading = false, disabled, style, ...rest }: AppButtonProps) {
  const backgroundColor = useThemeColor({}, 'tint');
  const color = useThemeColor({}, 'tintContrast');
  const isDisabled = loading || disabled;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={(state) => {
        const resolvedStyle = typeof style === 'function' ? style(state) : style;

        return [
          styles.button,
          {
            backgroundColor,
            opacity: isDisabled ? 0.5 : state.pressed ? 0.85 : 1,
          },
          resolvedStyle,
        ];
      }}
      {...rest}>
      {loading ? <ActivityIndicator color={color} /> : <ThemedText style={[styles.label, { color }]}>{label}</ThemedText>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  label: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '600',
  },
});
