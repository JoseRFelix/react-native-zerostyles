# react-native-zerostyles

Base scaffold for a React Native library using TypeScript and `react-native-builder-bob`.

## Getting started

```bash
pnpm install
pnpm build
pnpm typecheck
```

## Project structure

- `src`: Library source files and public exports.
- `lib`: Generated build artifacts (`commonjs`, `module`, and `typescript`).

## Publish checklist

1. Replace placeholder exports in `src/index.ts`.
2. Update package metadata in `package.json` (`author`, `description`, keywords).
3. Run `pnpm clean && pnpm build`.
