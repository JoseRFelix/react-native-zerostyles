import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { appThemes } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ThemeProvider, useThemeSelector } from 'react-native-zerostyles';

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootNavigator() {
  const themeName = useThemeSelector((context) => context.themeName);
  return (
    <NavigationThemeProvider value={themeName === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style={themeName === 'dark' ? 'light' : 'dark'} />
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const initialTheme = colorScheme === 'dark' ? 'dark' : 'light';

  return (
    <ThemeProvider themes={appThemes} initialTheme={initialTheme}>
      <RootNavigator />
    </ThemeProvider>
  );
}
