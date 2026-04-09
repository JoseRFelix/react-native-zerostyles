<p align="center">
  <img src="assets/logo.png" alt="react-native-zerostyles" width="128" />
</p>

# react-native-zerostyles

Theming for React Native. No native modules, no babel plugins, no extra dependencies. Just React.

Built on `useSyncExternalStore`, components subscribe to **slices** of your theme and only re-render when those values actually change.

- **Zero dependencies.** Only peers are `react` and `react-native`, nothing else to install or configure.
- **No native code.** Pure JS/TS, drops into any React Native or Expo project without linking or config plugins.
- **Selector-based subscriptions.** Components skip re-renders when unrelated theme values change.
- **Full TypeScript inference.** Augment a single interface and get autocomplete across every hook and style factory.

## Installation

```bash
npm install react-native-zerostyles
```

```bash
pnpm add react-native-zerostyles
```

```bash
yarn add react-native-zerostyles
```

That's it. No pod install, no native rebuild, no babel config. The only peer dependencies are `react` and `react-native`, which you already have.

## Agent Skill

Give your AI coding agent knowledge of this library:

```bash
npx skills add JoseRFelix/react-native-zerostyles
```

Works with Claude Code, Cursor, Codex, Windsurf, and [40+ other agents](https://github.com/vercel-labs/skills#supported-agents).

## Quick Start

### 1. Define your themes

Your themes are plain objects. No special schema, no config file:

```tsx
// constants/theme.ts
export const appThemes = {
  light: {
    colors: {
      background: "#ffffff",
      text: "#11181C",
      tint: "#0a7ea4",
    },
    spacing: { sm: 8, md: 12, lg: 24 },
  },
  dark: {
    colors: {
      background: "#151718",
      text: "#ECEDEE",
      tint: "#ffffff",
    },
    spacing: { sm: 8, md: 12, lg: 24 },
  },
} as const;
```

### 2. Wrap your app with `ThemeProvider`

```tsx
import { ThemeProvider } from "react-native-zerostyles";
import { appThemes } from "./constants/theme";

export default function App() {
  return (
    <ThemeProvider themes={appThemes} initialTheme="light">
      <Screen />
    </ThemeProvider>
  );
}
```

### 3. Subscribe to theme values

```tsx
import { useThemeSelector } from "react-native-zerostyles";

function Screen() {
  const backgroundColor = useThemeSelector(
    (ctx) => ctx.theme.colors.background,
  );
  const toggleTheme = useThemeSelector((ctx) => ctx.toggleTheme);

  return (
    <View style={{ flex: 1, backgroundColor }}>
      <Button title="Toggle theme" onPress={toggleTheme} />
    </View>
  );
}
```

Both selectors return **stable references**. `Screen` only re-renders when `background` actually changes, not when other parts of the theme update.

## API

### `ThemeProvider`

Wraps the app and provides theme state to all descendants.


| Prop           | Type                     | Description                             |
| -------------- | ------------------------ | --------------------------------------- |
| `themes`       | `Record<string, object>` | Map of theme objects keyed by name      |
| `initialTheme` | `string`                 | Key of the theme to use on first render |
| `children`     | `ReactNode`              | App content                             |


`ThemeProvider` must receive at least one theme, and `initialTheme` must match a key in `themes`. Both constraints throw at mount time.

### `useThemeSelector(selector, equalityFn?)`

Subscribe to a slice of theme context. Re-renders only when the selected value changes.

```tsx
const bg = useThemeSelector((ctx) => ctx.theme.colors.background);
```

The selector receives the full `ThemeContextValue`:


| Field          | Type             | Description                              |
| -------------- | ---------------- | ---------------------------------------- |
| `theme`        | `AppTheme`       | The active theme object                  |
| `themes`       | `ThemeMap`       | All registered themes                    |
| `themeName`    | `ThemeName`      | Key of the active theme                  |
| `setThemeName` | `(name) => void` | Switch to a theme by name                |
| `setTheme`     | `(name) => void` | Alias for `setThemeName`                 |
| `toggleTheme`  | `() => void`     | Cycles through themes in insertion order |


By default values are compared with `Object.is`. Pass a custom `equalityFn` as the second argument for structural comparison.

### `useTheme()`

Convenience hook that subscribes to the **entire** context. Re-renders on any theme change.

```tsx
const { theme, themeName, toggleTheme } = useTheme();
```

Prefer `useThemeSelector` when you only need part of the context.

### `createThemedStyles`

Factory that returns a `useStyles` hook. Styles are created with `StyleSheet.create` inside `useMemo` and only recompute when the selected theme values change.

**Full theme** (re-renders on any theme change):

```tsx
import { createThemedStyles } from "react-native-zerostyles";

const useStyles = createThemedStyles((theme) => ({
  container: {
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
  },
}));
```

**Selector form (recommended)**, re-renders only when the selected slice changes:

```tsx
const useStyles = createThemedStyles(
  (theme) => theme.colors,
  (colors) => ({
    container: { backgroundColor: colors.background },
    text: { color: colors.text },
  }),
);
```

The two-argument form uses **shallow equality** by default. Pass a custom equality function as the third argument when needed.

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

Automatic property tracking is not supported. The library cannot infer which fields an arbitrary function reads. Use an explicit selector for narrow subscriptions.

## TypeScript Setup

Augment the `AppThemes` interface so all hooks and factories infer your concrete theme shapes without extra generics:

```tsx
// constants/theme.ts
export const appThemes = { light: { ... }, dark: { ... } } as const;

export type ExampleThemes = typeof appThemes;

declare module "react-native-zerostyles" {
  interface AppThemes extends ExampleThemes {}
}
```

After augmentation, `useThemeSelector((ctx) => ctx.theme.colors.background)` will auto-complete `colors`, `background`, etc.

## Examples

### Expo Router with React Navigation

```tsx
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { ThemeProvider, useThemeSelector } from "react-native-zerostyles";
import { appThemes } from "@/constants/theme";

function RootNavigator() {
  const themeName = useThemeSelector((ctx) => ctx.themeName);

  return (
    <NavigationThemeProvider
      value={themeName === "dark" ? DarkTheme : DefaultTheme}
    >
      <Stack />
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider
      themes={appThemes}
      initialTheme={colorScheme === "dark" ? "dark" : "light"}
    >
      <RootNavigator />
    </ThemeProvider>
  );
}
```

### Themed View component

```tsx
import { View, type ViewProps } from "react-native";
import { createThemedStyles, useThemeSelector } from "react-native-zerostyles";

type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
};

function ThemedView({ style, lightColor, darkColor, ...props }: ThemedViewProps) {
  const styles = useStyles();
  const override = useThemeSelector((ctx) =>
    ctx.themeName === "light" ? lightColor : darkColor,
  );

  return (
    <View
      style={[
        styles.view,
        override ? { backgroundColor: override } : undefined,
        style,
      ]}
      {...props}
    />
  );
}

const useStyles = createThemedStyles(
  (theme) => theme.colors.background,
  (backgroundColor) => ({
    view: { backgroundColor },
  }),
);
```

### Themed Text component

```tsx
import { Text, type TextProps } from "react-native";
import { createThemedStyles, useThemeSelector } from "react-native-zerostyles";

type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
};

function ThemedText({ style, lightColor, darkColor, ...props }: ThemedTextProps) {
  const styles = useStyles();
  const override = useThemeSelector((ctx) =>
    ctx.themeName === "light" ? lightColor : darkColor,
  );

  return (
    <Text
      style={[styles.text, override ? { color: override } : undefined, style]}
      {...props}
    />
  );
}

const useStyles = createThemedStyles(
  (theme) => theme.colors.text,
  (color) => ({
    text: { color },
  }),
);
```

## Contributing

```bash
pnpm install
pnpm build
pnpm typecheck
pnpm test
```

An [example Expo app](./example/zerostyles-app) is included for local development. See [PUBLISHING.md](./PUBLISHING.md) for release instructions.

## License

MIT