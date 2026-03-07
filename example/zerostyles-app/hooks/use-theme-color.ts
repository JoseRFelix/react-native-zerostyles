/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import type { ExampleTheme, ExampleThemes } from '@/constants/theme';
import { useTheme } from 'react-native-zerostyles';

type ThemeOverrideMap = Partial<Record<keyof ExampleThemes, string>>;
type ThemeColorName = keyof ExampleTheme['colors'];

export function useThemeColor(
  props: ThemeOverrideMap,
  colorName: ThemeColorName
) {
  const { theme, themeName } = useTheme<ExampleThemes>();
  const colorFromProps = props[themeName];

  if (colorFromProps) {
    return colorFromProps;
  }

  return theme.colors[colorName];
}
