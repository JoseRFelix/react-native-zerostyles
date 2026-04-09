# Publishing

This package is published manually to npm.

## Prerequisites

- You have publish access to the `react-native-zerostyles` package on npm.
- You are logged in locally with `npm login`.
- Your working tree is clean enough that you can clearly review the release changes before publishing.

## Release checklist

1. Make sure you are on the branch you want to release from.
2. Pull the latest changes.
3. Run the verification steps:

```bash
pnpm install
pnpm build
pnpm typecheck
pnpm test
```

1. Pick the next version number:
  - `patch` for fixes and small improvements
  - `minor` for backward-compatible features
  - `major` for breaking changes
2. Bump the package version:

```bash
npm version patch
```

Replace `patch` with `minor`, `major`, or an exact version like `npm version 0.2.0` when needed.

1. Inspect what will be published:

```bash
npm pack --dry-run
```

1. Publish the package:

```bash
pnpm publish --access public --no-git-checks
```

1. Push the release commit and tag:

```bash
git push
git push --tags
```

## Typical patch release

```bash
pnpm install
pnpm build
pnpm typecheck
pnpm test
npm version patch
npm pack --dry-run
pnpm publish --access public --no-git-checks
git push
git push --tags
```

## Notes

- `npm version ...` updates `package.json`, creates a release commit, and creates a Git tag.
- `npm pack --dry-run` is a good last check to confirm that only the expected files are going to npm.
- `pnpm publish --access public` matches the current package configuration for an unscoped public package.
- `--no-git-checks` avoids pnpm blocking the publish because of unrelated uncommitted files in the repo. If your working tree is clean, you can omit it.
- If npm asks for a one-time password, enter the code from your authenticator during publish.

