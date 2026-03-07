import { useMemo } from "react";
import { StyleSheet } from "react-native";
import type { AppTheme, ThemeMap } from "./themes";
import { useTheme } from "./theme-provider";

export function createThemedStyles<
  const Styles extends StyleSheet.NamedStyles<Styles>,
  TThemes extends Record<string, object> = ThemeMap,
>(factory: (theme: AppTheme<TThemes>) => Styles): () => Styles {
  return function useStyles(): Styles {
    const { theme } = useTheme<TThemes>();

    return useMemo<Styles>(() => StyleSheet.create(factory(theme)), [theme]);
  };
}
