import { getBottomTabBarItemStyle, getBottomTabBarStyle } from '@/app/navigation/tab-bar-style';

describe('getBottomTabBarStyle', () => {
  it('adds accessible Android spacing so tabs sit above three-button navigation', () => {
    expect(getBottomTabBarStyle('android')).toEqual({
      paddingBottom: 28,
      paddingTop: 10,
      height: 96,
    });
  });

  it('does not add extra spacing on iOS', () => {
    expect(getBottomTabBarStyle('ios')).toEqual({});
  });
});

describe('getBottomTabBarItemStyle', () => {
  it('increases Android tab touch target height', () => {
    expect(getBottomTabBarItemStyle('android')).toEqual({
      minHeight: 56,
      paddingVertical: 6,
    });
  });

  it('keeps iOS tab touch target at an accessible minimum height', () => {
    expect(getBottomTabBarItemStyle('ios')).toEqual({
      minHeight: 50,
    });
  });
});
