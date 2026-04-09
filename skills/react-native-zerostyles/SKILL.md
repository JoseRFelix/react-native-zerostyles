---
name: react-native-zerostyles
description:
  Zero-dependency theming for React Native with selector-based subscriptions.
  Use when implementing theming in React Native apps, creating dark/light mode
  support, building theme-aware style sheets, or optimizing re-renders from
  theme changes without adding external dependencies. Triggers on tasks
  involving React Native theming, dynamic styles, or color scheme switching.
license: MIT
metadata:
  author: JoseRFelix
  version: "1.0.0"
---

# react-native-zerostyles

Theming for React Native. No native modules, no babel plugins, no extra
dependencies. Just React.

Built on `useSyncExternalStore`, components subscribe to **slices** of theme
state so they only re-render when the values they read actually change.

**Key properties:**

- Zero dependencies. Only peers are `react` and `react-native`.
- No native code. Pure JS/TS, no linking, no config plugins.
- Selector-based subscriptions for minimal re-renders
- Full TypeScript inference via module augmentation

## When to Use

Apply this skill when:

- Adding dark/light mode (or any multi-theme support) to a React Native app
  without pulling in external theming libraries
- Creating theme-aware `StyleSheet` objects that rebuild only when relevant
  theme values change
- Reducing unnecessary re-renders caused by broad theme context subscriptions
- Setting up typed, augmentable theme definitions with zero configuration

## Installation

```bash
npm install react-native-zerostyles
# or
pnpm add react-native-zerostyles
# or
yarn add react-native-zerostyles
```

No pod install, no native rebuild, no babel config. The only peer dependencies
are `react` and `react-native`, which you already have.

## Core API

### `ThemeProvider`

Wrap the application root. Accepts a `themes` object and an `initialTheme` key.

```tsx
import { ThemeProvider } from "react-native-zerostyles";

const themes = {
  light: {
    colors: { background: "#ffffff", text: "#11181C" },
    spacing: { md: 12 },
  },
  dark: {
    colors: { background: "#151718", text: "#ECEDEE" },
    spacing: { md: 12 },
  },
} as const;

export function App() {
  return (
    <ThemeProvider themes={themes} initialTheme="light">
      <Screen />
    </ThemeProvider>
  );
}
```

### `useThemeSelector(selector, equalityFn?)`

Subscribe to a **slice** of the theme context. The component only re-renders
when the selected value changes (compared with `Object.is` by default, or a
custom `equalityFn`).

```tsx
import { useThemeSelector } from "react-native-zerostyles";

function Screen() {
  const bg = useThemeSelector((ctx) => ctx.theme.colors.background);
  const toggleTheme = useThemeSelector((ctx) => ctx.toggleTheme);
  // ...
}
```

The `selector` receives the full `ThemeContextValue`:

```ts
type ThemeContextValue = {
  theme: AppTheme;       // the active theme object
  themes: ThemeMap;      // all registered themes
  themeName: ThemeName;  // key of the active theme
  setThemeName: (name: ThemeName) => void;
  setTheme: (name: ThemeName) => void; // alias for setThemeName
  toggleTheme: () => void;             // cycles through themes
};
```

### `useTheme()`

Convenience hook that subscribes to the **entire** context. Re-renders on any
theme change. Prefer `useThemeSelector` for narrower subscriptions.

```tsx
const { theme, themeName, toggleTheme } = useTheme();
```

### `createThemedStyles`

Factory that returns a `useStyles` hook. Styles are built inside `useMemo` with
`StyleSheet.create` and only recompute when the selected theme slice changes.

**Full theme (re-renders on any theme change):**

```tsx
import { createThemedStyles } from "react-native-zerostyles";

const useStyles = createThemedStyles((theme) => ({
  container: {
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
  },
}));
```

**Selector form (recommended)**, re-renders only when the slice changes:

```tsx
const useStyles = createThemedStyles(
  (theme) => theme.colors,
  (colors) => ({
    container: { backgroundColor: colors.background },
    text: { color: colors.text },
  }),
);
```

The two-argument form uses **shallow equality** by default. A third argument
accepts a custom equality function.

**Multiple slices:**

```tsx
const useStyles = createThemedStyles(
  (theme) => ({ colors: theme.colors, spacing: theme.spacing }),
  ({ colors, spacing }) => ({
    container: {
      backgroundColor: colors.background,
      padding: spacing.md,
    },
  }),
);
```

## TypeScript: Module Augmentation

Augment the `AppThemes` interface so all hooks and factories infer concrete
theme shapes without extra generics:

```tsx
// e.g. constants/theme.ts
import type { appThemes } from "./my-themes";

declare module "react-native-zerostyles" {
  interface AppThemes {
    light: (typeof appThemes)["light"];
    dark: (typeof appThemes)["dark"];
  }
}
```

After augmentation, `useThemeSelector((ctx) => ctx.theme.colors.background)`
will auto-complete `colors`, `background`, etc.

## Important Guidelines

1. **Prefer explicit selectors.** `useThemeSelector` and the two-argument
   `createThemedStyles` avoid full-context re-renders. The library cannot
   automatically track which fields a function reads. Pass an explicit selector
   to get narrow subscriptions.

2. **Keep theme objects reference-stable.** `ThemeProvider` compares theme
   entries by reference. Define themes as module-level constants or memoize them.

3. **`toggleTheme` cycles through themes** in insertion order. With two themes
   it acts as a simple light/dark toggle; with more it rotates through all of
   them.

4. **`ThemeProvider` must have at least one theme** and `initialTheme` must
   match a key in `themes`. Both constraints throw at mount time.

5. **Zero dependencies.** The library is pure JS/TS with no runtime
   dependencies beyond `react` and `react-native`. No native modules, no
   linking, no babel plugins, no Expo config plugins.

## Patterns

### Expo Router + React Navigation integration

```tsx
import { ThemeProvider, useThemeSelector } from "react-native-zerostyles";
import { DarkTheme, DefaultTheme, ThemeProvider as NavThemeProvider } from "@react-navigation/native";

function RootLayout() {
  const themeName = useThemeSelector((ctx) => ctx.themeName);
  const navTheme = themeName === "dark" ? DarkTheme : DefaultTheme;

  return (
    <NavThemeProvider value={navTheme}>
      <Stack />
    </NavThemeProvider>
  );
}

export default function App() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider themes={appThemes} initialTheme={colorScheme ?? "light"}>
      <RootLayout />
    </ThemeProvider>
  );
}
```

### Themed component with style override

```tsx
const useStyles = createThemedStyles(
  (theme) => theme.colors.background,
  (bg) => ({ view: { backgroundColor: bg } }),
);

function ThemedView({ style, lightColor, darkColor, ...props }) {
  const styles = useStyles();
  const themeName = useThemeSelector((ctx) => ctx.themeName);
  const override = themeName === "light" ? lightColor : darkColor;

  return <View style={[styles.view, override && { backgroundColor: override }, style]} {...props} />;
}
```
