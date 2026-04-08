import { StyleSheet } from 'react-native-unistyles';

import { appThemes } from '@/constants/theme';

let configured = false;

if (!configured) {
  StyleSheet.configure({
    settings: {
      adaptiveThemes: false,
      initialTheme: 'light',
    },
    themes: appThemes,
  });

  configured = true;
}
