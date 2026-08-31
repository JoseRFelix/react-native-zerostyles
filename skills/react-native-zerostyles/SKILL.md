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
  version: "1.1.0"
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

Wrap the application root. Pass `initialTheme` for provider-owned state, or
`themeName` for state controlled by a system preference or parent component.
The two modes are mutually exclusive.

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

Use controlled mode when the active theme can change outside the provider:

```tsx
export function App() {
  const colorScheme = useColorScheme();
  const themeName = colorScheme === "dark" ? "dark" : "light";

  return (
    <ThemeProvider themes={themes} themeName={themeName}>
      <Screen />
    </ThemeProvider>
  );
}
```

In controlled mode, `setTheme` and `toggleTheme` call `onThemeChange`. The owner
must pass the requested name back through `themeName` to apply it.

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
  theme: AppTheme; // the active theme object
  themes: ThemeMap; // all registered themes
  themeName: ThemeName; // key of the active theme
  setThemeName: (name: ThemeName) => void;
  setTheme: (name: ThemeName) => void; // alias for setThemeName
  toggleTheme: () => void; // cycles through themes
};
```

### `useTheme()`

Convenience hook that subscribes to the **entire** context. Re-renders on any
theme change. Prefer `useThemeSelector` for narrower subscriptions.

```tsx
const { theme, themeName, toggleTheme } = useTheme();
```

### `createThemedStyles`

Factory that returns a `useStyles` hook. Each generated hook has a bounded,
eight-entry `StyleSheet.create` cache shared by its component instances. A
cached style is reused when the selected theme slice is equal to a recent
selection.

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

Define generated hooks at module scope and keep style factories pure so all
instances share the cache safely.

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
import { appThemes } from "./my-themes";

export type AppThemesMap = typeof appThemes;

declare module "react-native-zerostyles" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- required for module augmentation
  interface AppThemes extends AppThemesMap {}
}
```

After augmentation, `useThemeSelector((ctx) => ctx.theme.colors.background)`
will auto-complete `colors`, `background`, etc.

The alias-based `extends` form above is the simplest setup, but the explicit-key
interface form works too:

```tsx
declare module "react-native-zerostyles" {
  interface AppThemes {
    light: typeof appThemes.light;
    dark: typeof appThemes.dark;
  }
}
```

If that explicit form lives in a separate file, use a value import instead of
`import type`:

```tsx
import { appThemes } from "./my-themes";

declare module "react-native-zerostyles" {
  interface AppThemes {
    light: typeof appThemes.light;
    dark: typeof appThemes.dark;
  }
}
```

## Important Guidelines

1. **Prefer explicit selectors.** `useThemeSelector` and the two-argument
   `createThemedStyles` avoid full-context re-renders. The library cannot
   automatically track which fields a function reads. Pass an explicit selector
   to get narrow subscriptions.

2. **Keep theme objects reference-stable when possible.** Define themes as
   module-level constants or memoize them. Replacing the `themes` map is
   supported and notifies subscribers, while selector equality still prevents
   unrelated consumer re-renders.

3. **Create themed style hooks at module scope.** The generated hook owns the
   shared bounded cache. Creating it during render prevents cache sharing and
   needlessly recreates the hook factory.

4. **`toggleTheme` cycles through themes** in insertion order. With two themes
   it acts as a simple light/dark toggle; with more it rotates through all of
   them.

5. **`ThemeProvider` must have at least one theme.** Pass exactly one of
   `initialTheme` or `themeName`, and make sure it matches a key in `themes`.

6. **Zero dependencies.** The library is pure JS/TS with no runtime
   dependencies beyond `react` and `react-native`. No native modules, no
   linking, no babel plugins, no Expo config plugins.

## Patterns

### Expo Router + React Navigation integration

```tsx
import { ThemeProvider, useThemeSelector } from "react-native-zerostyles";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavThemeProvider,
} from "@react-navigation/native";

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
    <ThemeProvider themes={appThemes} themeName={colorScheme ?? "light"}>
      <RootLayout />
    </ThemeProvider>
  );
}
```

### Reanimated integration

ZeroStyles returns ordinary React Native styles. Keep themed styles and
Reanimated worklet styles separate in the style array:

```tsx
const styles = useStyles();
const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

return <Animated.View style={[styles.card, animatedStyle]} />;
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

  return (
    <View
      style={[styles.view, override && { backgroundColor: override }, style]}
      {...props}
    />
  );
}
```
