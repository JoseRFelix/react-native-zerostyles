/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const appThemes = {
  light: {
    colors: {
      text: '#11181C',
      background: '#fff',
      surface: '#F5F9FC',
      card: '#FFFFFF',
      border: '#D7E2EA',
      muted: '#687076',
      tint: tintColorLight,
      tintMuted: '#D8EEF5',
      success: '#138A5D',
      warning: '#BA6A00',
      icon: '#687076',
      tabIconDefault: '#687076',
      tabIconSelected: tintColorLight,
    },
  },
  dark: {
    colors: {
      text: '#ECEDEE',
      background: '#151718',
      surface: '#1D2125',
      card: '#20262A',
      border: '#30363D',
      muted: '#9BA1A6',
      tint: tintColorDark,
      tintMuted: '#143541',
      success: '#52D39A',
      warning: '#FFD16A',
      icon: '#9BA1A6',
      tabIconDefault: '#9BA1A6',
      tabIconSelected: tintColorDark,
    },
  },
};

export type ExampleThemes = typeof appThemes;
export type ExampleTheme = ExampleThemes[keyof ExampleThemes];

declare module 'react-native-zerostyles' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- required for module augmentation
  interface AppThemes extends ExampleThemes {}
}

declare module 'react-native-unistyles' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- required for module augmentation
  interface UnistylesThemes extends ExampleThemes {}
}

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
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
