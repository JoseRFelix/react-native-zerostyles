# Changelog

## 0.3.0

### Minor Changes

- 3502dbc: Add a controlled `themeName` mode with `onThemeChange`, react to replacement theme maps, preserve selector-based render bailouts, and validate against Expo 57, React Native 0.86, and Reanimated 4.5.

### Patch Changes

- f737d61: Share themed-style snapshots across hook instances, correct shallow comparison
  for non-plain values, make provider synchronization safe during server
  rendering, and publish validated ESM and CommonJS entry points.
- 32f317a: Share a bounded themed-style cache across component instances, align selector
  memoization with React's concurrency-safe algorithm, and avoid redundant
  provider synchronization work.

## 0.2.2

### Patch Changes

- Fix image url and add homepage/repository url so that info is correctly displayed in npm.

## 0.2.1

### Patch Changes

- Support inline object for theme type inference

## 0.2.0

### Minor Changes

- Initial npm publish of `react-native-zerostyles`.
- Add typed theme utilities for React Native, including `ThemeProvider`, `useTheme`, `useThemeSelector`, and `createThemedStyles`.
- Improve selector-based subscriptions so consumers and themed styles only rerender when the selected theme slice changes.
- Add test coverage for theme selection and rerender behavior.
