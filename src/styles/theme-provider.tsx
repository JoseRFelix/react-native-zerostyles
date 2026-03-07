import React, { createContext, useContext, useMemo, useState } from "react";
import type { AppTheme, ThemeMap, ThemeName } from "./themes";

type BaseThemeMap = Record<string, object>;

export type ThemeContextValue<TThemes extends BaseThemeMap = ThemeMap> = {
  theme: AppTheme<TThemes>;
  themes: TThemes;
  themeName: ThemeName<TThemes>;
  setThemeName: (name: ThemeName<TThemes>) => void;
  setTheme: (name: ThemeName<TThemes>) => void;
  toggleTheme: () => void;
};

export type ThemeProviderProps<TThemes extends BaseThemeMap = ThemeMap> = {
  themes: TThemes;
  initialTheme: ThemeName<TThemes>;
  children: React.ReactNode;
};

type InternalThemeContextValue = {
  theme: object;
  themes: BaseThemeMap;
  themeName: string;
  setThemeName: (name: string) => void;
  setTheme: (name: string) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<InternalThemeContextValue | null>(null);

export function ThemeProvider<const TThemes extends BaseThemeMap>({
  themes,
  initialTheme,
  children,
}: ThemeProviderProps<TThemes>) {
  const themeNames = useMemo(() => Object.keys(themes) as Array<ThemeName<TThemes>>, [themes]);

  if (themeNames.length === 0) {
    throw new Error("ThemeProvider requires at least one theme");
  }

  if (!themeNames.includes(initialTheme)) {
    throw new Error(`ThemeProvider initialTheme "${initialTheme}" is not registered`);
  }

  const [themeName, setThemeName] = useState<ThemeName<TThemes>>(initialTheme);

  const value = useMemo<ThemeContextValue<TThemes>>(() => {
    const fallbackThemeName = themeNames[0];
    const activeThemeName = themes[themeName] ? themeName : fallbackThemeName;
    const theme = themes[activeThemeName];

    return {
      theme,
      themes,
      themeName: activeThemeName,
      setThemeName,
      setTheme: setThemeName,
      toggleTheme: () => {
        if (themeNames.length < 2) {
          return;
        }

        setThemeName((current) => {
          const currentIndex = themeNames.indexOf(current);
          const nextIndex = (currentIndex + 1) % themeNames.length;
          return themeNames[nextIndex] ?? themeNames[0];
        });
      },
    };
  }, [themeName, themeNames, themes]);

  return (
    <ThemeContext.Provider value={value as unknown as InternalThemeContextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme<TThemes extends BaseThemeMap = ThemeMap>() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context as unknown as ThemeContextValue<TThemes>;
}
