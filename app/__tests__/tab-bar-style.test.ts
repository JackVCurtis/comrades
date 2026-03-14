import { getBottomTabBarItemStyle, getBottomTabBarStyle } from '@/app/navigation/tab-bar-style';

describe('getBottomTabBarStyle', () => {
  it('uses a minimum Android bottom padding and an accessible height', () => {
    expect(getBottomTabBarStyle('android', 0)).toEqual({
      paddingBottom: 12,
      paddingTop: 8,
      height: 76,
    });
  });

  it('respects Android safe-area inset when larger than minimum padding', () => {
    expect(getBottomTabBarStyle('android', 20)).toEqual({
      paddingBottom: 20,
      paddingTop: 8,
      height: 84,
    });
  });

  it('does not add extra spacing on iOS', () => {
    expect(getBottomTabBarStyle('ios', 34)).toEqual({});
  });
});

describe('getBottomTabBarItemStyle', () => {
  it('increases Android tab touch target height', () => {
    expect(getBottomTabBarItemStyle('android')).toEqual({
      minHeight: 56,
    });
  });

  it('keeps iOS tab touch target at an accessible minimum height', () => {
    expect(getBottomTabBarItemStyle('ios')).toEqual({
      minHeight: 50,
    });
  });
});
