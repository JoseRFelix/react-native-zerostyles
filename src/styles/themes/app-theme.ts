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

export type ThemeMap = keyof AppThemes extends never ? FallbackThemeMap : AppThemes;

export type ThemeName<TThemes extends Record<string, object> = ThemeMap> = Extract<
  keyof TThemes,
  string
>;

export type AppTheme<TThemes extends Record<string, object> = ThemeMap> =
  TThemes[ThemeName<TThemes>];
