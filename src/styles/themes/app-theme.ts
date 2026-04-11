/**
 * Consumers can augment this interface to make `useTheme` and
 * `createThemedStyles` strongly typed, similarly to Unistyles.
 *
 * Example:
 * declare module "react-native-zerostyles" {
 *   interface AppThemes {
 *     light: typeof lightTheme;
 *     dark: typeof darkTheme;
 *   }
 * }
 */
export interface AppThemes {}

type FallbackThemeMap = Record<string, object>;
type NormalizedAppThemes = { [K in keyof AppThemes]: AppThemes[K] };

export type ThemeMap = keyof AppThemes extends never
  ? FallbackThemeMap
  : NormalizedAppThemes;

export type ThemeName<TThemes extends Record<string, object> = ThemeMap> =
  Extract<keyof TThemes, string>;

export type AppTheme<TThemes extends Record<string, object> = ThemeMap> =
  TThemes[ThemeName<TThemes>];
