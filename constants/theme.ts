/**
 * Shared color and typography tokens for Comrades.
 */
import { Platform } from 'react-native';

const tintColorLight = '#0A7EA4';
const tintColorDark = '#8AD9F2';

export const Colors = {
  light: {
    text: '#11181C',
    textMuted: '#4F5B62',
    background: '#FFFFFF',
    surface: '#F5F8FA',
    border: '#D7E0E6',
    tint: tintColorLight,
    tintContrast: '#FFFFFF',
    success: '#1D8A4A',
    warning: '#A66B00',
    danger: '#B42318',
    neutral: '#6B7780',
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    textMuted: '#A7B0B7',
    background: '#151718',
    surface: '#1F2428',
    border: '#2E353A',
    tint: tintColorDark,
    tintContrast: '#0D1B21',
    success: '#4FD38A',
    warning: '#F4BD60',
    danger: '#FF8A80',
    neutral: '#98A2A9',
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
