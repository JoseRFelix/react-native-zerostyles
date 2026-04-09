# react-native-zerostyles

Typed theme utilities for React Native with selector-based subscriptions.

## Getting started

```bash
pnpm install
pnpm build
pnpm typecheck
pnpm test
```

## Publishing

Manual publish instructions live in `PUBLISHING.md`.

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
  const backgroundColor = useThemeSelector(
    (context) => context.theme.colors.background,
  );
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
