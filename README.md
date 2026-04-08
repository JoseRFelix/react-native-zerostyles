# react-native-zerostyles

Typed theme utilities for React Native with selector-based subscriptions.

## Getting started

```bash
pnpm install
pnpm build
pnpm typecheck
pnpm test
```

## Basic usage

```tsx
import { ThemeProvider, useThemeSelector } from "react-native-zerostyles";

const themes = {
  light: {
    colors: {
      background: "#ffffff",
      text: "#11181C",
    },
    spacing: {
      md: 12,
    },
  },
  dark: {
    colors: {
      background: "#151718",
      text: "#ECEDEE",
    },
    spacing: {
      md: 12,
    },
  },
} as const;

function Screen() {
  const backgroundColor = useThemeSelector((context) => context.theme.colors.background);
  const toggleTheme = useThemeSelector((context) => context.toggleTheme);

  return null;
}

export function App() {
  return (
    <ThemeProvider themes={themes} initialTheme="light">
      <Screen />
    </ThemeProvider>
  );
}
```

## `createThemedStyles`

Use the one-argument form when a style sheet depends on the whole theme:

```tsx
import { createThemedStyles } from "react-native-zerostyles";

const useStyles = createThemedStyles((theme) => ({
  container: {
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
  },
}));
```

Use the selector form when styles only depend on part of the theme:

```tsx
import { createThemedStyles } from "react-native-zerostyles";

const useStyles = createThemedStyles(
  (theme) => theme.colors,
  (colors) => ({
    container: {
      backgroundColor: colors.background,
    },
    text: {
      color: colors.text,
    },
  }),
);
```

You can also select multiple slices. `createThemedStyles` shallow-compares the selected value, so object and array selectors are fine as long as the nested references stay stable:

```tsx
import { createThemedStyles } from "react-native-zerostyles";

const useStyles = createThemedStyles(
  (theme) => ({
    colors: theme.colors,
    spacing: theme.spacing,
  }),
  ({ colors, spacing }) => ({
    container: {
      backgroundColor: colors.background,
      padding: spacing.md,
    },
  }),
);
```

Automatic property tracking is not supported. `createThemedStyles((theme) => ...)` receives an arbitrary function, so the library cannot safely infer which fields were read. If you want narrow subscriptions, pass an explicit selector.

## Notes

- `useTheme()` subscribes to the full theme context and rerenders on any theme change.
- `useThemeSelector(...)` subscribes to the selected value only.
- `createThemedStyles(selector, factory)` is the recommended path for reusable theme-aware styles.
- `createThemedStyles(...)` keeps a small per-hook LRU cache of `StyleSheet.create(...)` results, so identical subscribers can share compiled styles without unbounded growth.

## Benchmark

The Expo example app now includes a benchmark tab that mounts the same themed
workload with plain React Native `StyleSheet.create(...)` builds,
`react-native-zerostyles`, `react-native-unistyles`, and `nativewind`, then
measures initial mount and repeated light/dark toggles.

```bash
pnpm --dir example/zerostyles-app install
pnpm --dir example/zerostyles-app start
```

Open the `Benchmark` tab in the example app and run it on a release build for
useful numbers.

### Baseline Before Shared StyleSheet Cache

The following snapshot was captured from the example benchmark screen before the
shared `createThemedStyles(...)` cache optimization landed and before the plain
`StyleSheet` baseline was added. Treat it as a baseline for relative
comparisons, not as a universal benchmark result, since device, build mode, and
runtime conditions can shift the absolute timings.

| Library                   | Mount elapsed | Mount React work | Toggle total                     | Toggle React work            | Row renders |
| ------------------------- | ------------- | ---------------- | -------------------------------- | ---------------------------- | ----------- |
| `react-native-zerostyles` | `831.95 ms`   | `512.69 ms`      | `7532.33 ms` across `12` toggles | `4684.78 ms` in `12` commits | `2,160`     |
| `react-native-unistyles`  | `831.57 ms`   | `505.76 ms`      | `5000.44 ms` across `12` toggles | `0.00 ms` in `0` commits     | `0`         |
| `nativewind`              | `965.31 ms`   | `615.15 ms`      | `7716.43 ms` across `12` toggles | `5203.72 ms` in `12` commits | `2,160`     |

In that baseline run, `react-native-unistyles` showed the expected runtime-only
theme updates with no measured React commits during toggles, while
`react-native-zerostyles` and `nativewind` both paid React rerender costs during
theme changes.
