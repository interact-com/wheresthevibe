import { DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { Quicksand_700Bold } from '@expo-google-fonts/quicksand';
import { useFonts } from 'expo-font';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { StoreProvider, useStore } from '@/lib/store';
import { colors } from '@/theme';

const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.bg, card: colors.tabBar, primary: colors.accent, text: colors.text, border: colors.divider },
};

function RootStack() {
  const { signedIn } = useStore();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="event/[id]" />
        <Stack.Screen name="checkout/[id]" />
        <Stack.Screen name="ticket/[id]" />
        <Stack.Screen name="rate/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="host/[id]/index" />
        <Stack.Screen name="host/[id]/scanner" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="host/[id]/report" />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({ Quicksand_700Bold, DMSans_400Regular, DMSans_500Medium, DMSans_700Bold });
  if (!loaded) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  return (
    <SafeAreaProvider>
      <ThemeProvider value={theme}>
        <StoreProvider>
          <StatusBar style="light" />
          <RootStack />
        </StoreProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
