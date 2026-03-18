import { Tabs } from 'expo-router';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { TRUST_FLOWS } from '@/modules/navigation/flows';
import { getBottomTabBarItemStyle, getBottomTabBarStyle } from '@/modules/navigation/tab-bar-style';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { bottom } = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: getBottomTabBarStyle(undefined, bottom),
        tabBarItemStyle: getBottomTabBarItemStyle(),
      }}>
      {TRUST_FLOWS.map((flow) => (
        <Tabs.Screen
          key={flow.routeName}
          name={flow.routeName}
          options={{
            title: flow.title,
            tabBarIcon: ({ color }) => <IconSymbol size={28} name={flow.icon} color={color} />,
          }}
        />
      ))}
    </Tabs>
  );
}
