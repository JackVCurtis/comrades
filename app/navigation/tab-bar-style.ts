import type { ViewStyle } from 'react-native';
import { Platform } from 'react-native';

const ANDROID_MIN_TAB_BAR_BOTTOM_PADDING = 12;
const ANDROID_TAB_BAR_BASE_HEIGHT = 64;
const ANDROID_TAB_BAR_TOP_PADDING = 8;
const ANDROID_TAB_ITEM_MIN_HEIGHT = 56;
const IOS_TAB_ITEM_MIN_HEIGHT = 50;

export function getBottomTabBarStyle(
  platform: string = Platform.OS,
  bottomInset: number = 0
): ViewStyle {
  if (platform === 'android') {
    const paddingBottom = Math.max(bottomInset, ANDROID_MIN_TAB_BAR_BOTTOM_PADDING);

    return {
      paddingBottom,
      paddingTop: ANDROID_TAB_BAR_TOP_PADDING,
      height: ANDROID_TAB_BAR_BASE_HEIGHT + paddingBottom,
    };
  }

  return {};
}

export function getBottomTabBarItemStyle(platform: string = Platform.OS): ViewStyle {
  if (platform === 'android') {
    return {
      minHeight: ANDROID_TAB_ITEM_MIN_HEIGHT,
    };
  }

  return {
    minHeight: IOS_TAB_ITEM_MIN_HEIGHT,
  };
}
