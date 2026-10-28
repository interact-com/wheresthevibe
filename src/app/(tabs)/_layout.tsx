import { Tabs } from 'expo-router/js-tabs';
import type { ColorValue } from 'react-native';

import { Icon, type IconName } from '@/components/Icon';
import { colors, fonts } from '@/theme';

const icon =
  (name: IconName) =>
  ({ color }: { color: ColorValue }) => <Icon name={name} color={typeof color === 'string' ? color : colors.muted} />;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.tabBar, borderTopColor: colors.divider },
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Discover', tabBarIcon: icon('compass') }} />
      <Tabs.Screen name="tickets" options={{ title: 'Tickets', tabBarIcon: icon('ticket') }} />
      <Tabs.Screen name="host" options={{ title: 'Host', tabBarIcon: icon('plus') }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: icon('user') }} />
    </Tabs>
  );
}
