# Publishing

This repo uses `changesets` to track release intent and generate version/changelog updates.

## Prerequisites

- You have publish access to the `react-native-zerostyles` package on npm.
- You are logged in locally with `npm login`.
- You are comfortable creating and merging changeset files as part of normal development.

## Everyday workflow

When a change should be included in the next package release:

```bash
pnpm changeset
```

The prompt will ask you:

1. Which package changed. Pick `react-native-zerostyles`.
2. What kind of version bump it needs:

- `patch` for fixes and small improvements
- `minor` for backward-compatible features
- `major` for breaking changes

1. A short summary that will be used in the changelog.

Commit the generated `.changeset/*.md` file with your code changes.

### Example changeset

```md
---
"react-native-zerostyles": patch
---

Fix selector-based rerenders in `createThemedStyles`.
```

## Notes

- `pnpm changeset` is for creating release notes during development.
- `pnpm version-packages` is the moment where pending changesets are converted into a real version bump.

