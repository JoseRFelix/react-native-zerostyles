<p align="center">
  <img src="https://raw.githubusercontent.com/JoseRFelix/react-native-zerostyles/main/assets/logo.png" alt="react-native-zerostyles" width="180" />
</p>

<h1 align="center">react-native-zerostyles</h1>

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

### 2. Make your theme typesafe

Augment the `AppThemes` interface so every hook and style factory infers your concrete theme shape — no extra generics needed:

```tsx
// constants/theme.ts
export const appThemes = { ... } as const;

export type AppThemesMap = typeof appThemes;

declare module "react-native-zerostyles" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- required for module augmentation
  interface AppThemes extends AppThemesMap {}
}
```

After this, `useThemeSelector((ctx) => ctx.theme.colors.background)` will autocomplete `colors`, `background`, theme names, and everything else.

### 3. Wrap your app with `ThemeProvider`

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

### 4. Subscribe to theme values

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

| Prop            | Type                     | Description                             |
| --------------- | ------------------------ | --------------------------------------- |
| `themes`        | `Record<string, object>` | Map of theme objects keyed by name      |
| `initialTheme`  | `string`                 | Initial key for uncontrolled mode       |
| `themeName`     | `string`                 | Active key for controlled mode          |
| `onThemeChange` | `(name) => void`         | Called when a consumer requests a theme |
| `children`      | `ReactNode`              | App content                             |

Pass either `initialTheme` or `themeName`, never both. In uncontrolled mode,
`setTheme` and `toggleTheme` update the provider directly. In controlled mode,
they call `onThemeChange`; the owner applies the change by passing a new
`themeName`.

```tsx
function SystemThemeProvider({ children }: { children: React.ReactNode }) {
  const colorScheme = useColorScheme();
  const themeName = colorScheme === "dark" ? "dark" : "light";

  return (
    <ThemeProvider themes={appThemes} themeName={themeName}>
      {children}
    </ThemeProvider>
  );
}
```

`ThemeProvider` must receive at least one theme, and the selected theme key
must exist in `themes`. Replacing the `themes` object updates subscribed
consumers while retaining selector-based render bailouts.

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

Factory that returns a `useStyles` hook. Each generated hook keeps a bounded,
eight-entry style cache shared by all of its component instances. Styles are
created with `StyleSheet.create` only when a selected theme value is not already
cached, so mounting many copies of the same component and switching back to a
recent theme reuse the same style object.

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

The two-argument form uses **shallow equality** by default for arrays, plain
objects, and null-prototype objects. Non-plain values such as `Date`, `Map`,
`Set`, and class instances compare by identity; pass a custom equality function
as the third argument when they need value semantics.

Define the generated hook at module scope and keep its factory pure. That lets
every component instance share the cache and makes render order irrelevant. A
generated hook evaluates its selector and cache lookup once per active theme
object, then shares that style snapshot with every subscribing instance.

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

export type AppThemesMap = typeof appThemes;

declare module "react-native-zerostyles" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- required for module augmentation
  interface AppThemes extends AppThemesMap {}
}
```

After augmentation, `useThemeSelector((ctx) => ctx.theme.colors.background)` will auto-complete `colors`, `background`, etc.

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

If that explicit form lives in a separate file, use a value import, not
`import type`:

```tsx
import { appThemes } from "./constants/theme";

declare module "react-native-zerostyles" {
  interface AppThemes {
    light: typeof appThemes.light;
    dark: typeof appThemes.dark;
  }
}
```

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
      themeName={colorScheme === "dark" ? "dark" : "light"}
    >
      <RootNavigator />
    </ThemeProvider>
  );
}
```

### Reanimated

ZeroStyles produces regular React Native styles, so keep themed and animated
styles as separate entries in the style array:

```tsx
function AnimatedCard() {
  const styles = useCardStyles();
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return <Animated.View style={[styles.card, animatedStyle]} />;
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

function ThemedView({
  style,
  lightColor,
  darkColor,
  ...props
}: ThemedViewProps) {
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

function ThemedText({
  style,
  lightColor,
  darkColor,
  ...props
}: ThemedTextProps) {
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

## Benchmarks

The selector-based subscription model means components only re-render when the specific slice they read actually changes. A component that subscribes to `theme.spacing` won't re-render when colors change, even though both live on the same theme object.

### Re-render counting

The test suite includes a simulated app tree of 128 components — views, text elements, spacing consumers, border-radius consumers, toggle-function consumers, a home screen, tab layout, and root navigator. After a single theme toggle:

| Consumer type            | Count   | Subscription                          | Re-renders    |
| ------------------------ | ------- | ------------------------------------- | ------------- |
| `ThemedView`             | 20      | `theme.colors.background` (changes)   | 20            |
| `ThemedText`             | 40      | `theme.colors` (changes)              | 40            |
| **Spacing-only**         | **30**  | **`theme.spacing` (shared ref)**      | **0**         |
| **Border-radius-only**   | **20**  | **`theme.borderRadius` (shared ref)** | **0**         |
| **Toggle-function-only** | **15**  | **`toggleTheme` (stable fn ref)**     | **0**         |
| Home screen              | 1       | `theme.colors.tint` + `themeName`     | 1             |
| Tab layout               | 1       | `theme.colors.tint`                   | 1             |
| Root navigator           | 1       | `themeName`                           | 1             |
| **Total**                | **128** |                                       | **63 of 128** |

With a naive `useTheme()` or plain React Context, all 128 components would re-render. The selector approach saves **65 re-renders (50.8%)** in this scenario.

A separate scaling test renders 150 components (80 stable + 70 changing) and confirms every stable consumer stays at zero re-renders while every changing consumer re-renders exactly once.

### Rapid toggles

Over 10 consecutive theme toggles, 50 stable-slice consumers accumulate **zero** extra renders, while 50 changing-value consumers render exactly **once per toggle** (500 re-renders total). Without selectors, all 100 consumers would render on every toggle — 1,000 re-renders for the same 10 toggles.

### Shared style cache

A deterministic performance test mounts 100 consumers of one generated style
hook. The style factory runs once instead of 100 times. Switching to a new theme
adds one factory call, and switching back adds none because the original style
object is reused. The cache is capped at eight selected values per generated
hook to keep memory use predictable.

### Timing (vitest bench)

The harness separates initial mounting from store updates so update numbers do
not include render setup or cleanup. Three independent local jsdom runs on
August 31, 2026 produced the following averages of each run's median:

| Scenario                                    | Optimized median | Comparison median | Improvement |
| ------------------------------------------- | ---------------- | ----------------- | ----------- |
| 1,000 stable selector consumers, 1 toggle   | 0.040 ms         | 0.906 ms          | **22.8x**   |
| 100 stable selector consumers, 10 toggles   | 0.028 ms         | 0.882 ms          | **31.7x**   |
| 1,000 cached style consumers, initial mount | 2.205 ms         | 2.388 ms          | **1.08x**   |
| 1,000 cached style consumers, theme update  | 1.733 ms         | 2.067 ms          | **1.19x**   |

Selector comparisons use full-context subscriptions as the baseline. Style
comparisons use the former per-instance style creation behavior as the
baseline. Initial selector mounts remain more expensive than full-context
mounts because each consumer sets up selector memoization; the benefit appears
on updates that leave the selected value unchanged.

For the shared-snapshot optimization specifically, three runs of the previous
implementation and three runs of the current implementation reduced the
1,000-consumer cached-style update median from **2.039 ms to 1.733 ms
(15.0%)**. Average minimum and p75 latency fell by 15.6% and 14.8%,
respectively. Relative mount performance stayed within the benchmark's normal
run-to-run variation.

These are development-mode jsdom microbenchmarks, not device frame-time
guarantees. Use release builds on Hermes to validate application-level
performance. CI stores each run as an informational artifact rather than
enforcing a noisy wall-clock threshold.

### Running the benchmarks

```bash
# Re-render counting tests (assertions)
pnpm test

# Timing benchmarks (vitest bench)
pnpm bench

# Timing benchmarks plus a JSON artifact
pnpm bench:ci

# Release-mode Hermes benchmark on the Expo example
pnpm --dir example/zerostyles-app benchmark:ios
pnpm --dir example/zerostyles-app benchmark:android
```

For the native run, open **Hermes benchmark** in the example app and tap **Run
benchmark**. It records committed wall-clock time for 1,000 consumers over 12
mount samples and 30 theme updates, comparing the shared cached hook with
per-instance `StyleSheet.create`. Use a Release build; development builds add
React diagnostics and are not comparable.

The deterministic performance assertions live in
`test/theme-selection-benchmark.test.tsx` and
`test/performance-invariants.test.tsx`; timing benchmarks live in
`test/theme-selection.bench.tsx`.

## Contributing

```bash
pnpm install
pnpm build
pnpm package:check
pnpm typecheck
pnpm test
pnpm bench
```

An [example Expo app](./example/zerostyles-app) is included for local development. See [PUBLISHING.md](./PUBLISHING.md) for release instructions.

## License

MIT
