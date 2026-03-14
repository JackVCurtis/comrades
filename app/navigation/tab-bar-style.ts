import type { ViewStyle } from 'react-native';
import { Platform } from 'react-native';

const ANDROID_THREE_BUTTON_NAV_EXTRA_BOTTOM_PADDING = 28;
const ANDROID_TAB_BAR_HEIGHT = 96;
const ANDROID_TAB_BAR_TOP_PADDING = 10;
const ANDROID_TAB_ITEM_MIN_HEIGHT = 56;
const IOS_TAB_ITEM_MIN_HEIGHT = 50;

export function getBottomTabBarStyle(platform: string = Platform.OS): ViewStyle {
  if (platform === 'android') {
    return {
      paddingBottom: ANDROID_THREE_BUTTON_NAV_EXTRA_BOTTOM_PADDING,
      paddingTop: ANDROID_TAB_BAR_TOP_PADDING,
      height: ANDROID_TAB_BAR_HEIGHT,
    };
  }

  return {};
}

export function getBottomTabBarItemStyle(platform: string = Platform.OS): ViewStyle {
  if (platform === 'android') {
    return {
      minHeight: ANDROID_TAB_ITEM_MIN_HEIGHT,
      paddingVertical: 6,
    };
  }

  return {
    minHeight: IOS_TAB_ITEM_MIN_HEIGHT,
  };
}
