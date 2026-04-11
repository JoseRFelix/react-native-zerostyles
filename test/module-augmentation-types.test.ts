import ts from "typescript";
import { describe, expect, it } from "vitest";

function normalizePath(path: string) {
  return path.replace(/\\/g, "/");
}

function joinPath(...parts: string[]) {
  return normalizePath(
    parts
      .filter((part) => part.length > 0)
      .join("/")
      .replace(/\/+/g, "/"),
  );
}

function getDirectoryPath(path: string) {
  const normalizedPath = normalizePath(path);
  const lastSlashIndex = normalizedPath.lastIndexOf("/");

  if (lastSlashIndex <= 0) {
    return normalizedPath.slice(0, 1);
  }

  return normalizedPath.slice(0, lastSlashIndex);
}

const workspaceRoot = normalizePath(ts.sys.getCurrentDirectory());
const virtualRoot = joinPath(workspaceRoot, ".type-tests");
const packageRoot = joinPath(
  virtualRoot,
  "node_modules",
  "react-native-zerostyles",
);
const consumerPath = joinPath(virtualRoot, "consumer.tsx");

const packageFiles = [
  "package.json",
  "src/index.ts",
  "src/styles/index.ts",
  "src/styles/themes/index.ts",
  "src/styles/themes/app-theme.ts",
  "src/styles/theme-provider.tsx",
  "src/styles/create-themed-styles.ts",
] as const;

const virtualFiles = new Map<string, string>(
  packageFiles.map((relativePath) => [
    joinPath(packageRoot, relativePath),
    ts.sys.readFile(joinPath(workspaceRoot, relativePath)) ?? "",
  ]),
);

function getVirtualDirectories() {
  const directories = new Set<string>();

  for (const filePath of virtualFiles.keys()) {
    let currentDirectory = getDirectoryPath(filePath);

    while (
      currentDirectory.startsWith(virtualRoot) &&
      !directories.has(currentDirectory)
    ) {
      directories.add(currentDirectory);
      currentDirectory = getDirectoryPath(currentDirectory);
    }
  }

  directories.add(virtualRoot);

  return directories;
}

function compileConsumer(consumerSource: string) {
  const allFiles = new Map(virtualFiles);
  allFiles.set(consumerPath, consumerSource);
  const virtualDirectories = getVirtualDirectories();

  const compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    lib: ["lib.esnext.d.ts"],
    strict: true,
    skipLibCheck: true,
    jsx: ts.JsxEmit.ReactJSX,
    types: ["react", "react-native"],
  };

  const host = ts.createCompilerHost(compilerOptions);
  const originalGetSourceFile = host.getSourceFile.bind(host);
  const originalFileExists = host.fileExists.bind(host);
  const originalReadFile = host.readFile.bind(host);
  const originalDirectoryExists = host.directoryExists?.bind(host);
  const originalGetDirectories = host.getDirectories?.bind(host);
  const originalRealpath = host.realpath?.bind(host);

  host.getSourceFile = (fileName, languageVersion, onError, shouldCreateNew) => {
    const normalizedFileName = normalizePath(fileName);
    const sourceText = allFiles.get(normalizedFileName);

    if (sourceText !== undefined) {
      return ts.createSourceFile(
        normalizedFileName,
        sourceText,
        languageVersion,
        true,
      );
    }

    return originalGetSourceFile(
      fileName,
      languageVersion,
      onError,
      shouldCreateNew,
    );
  };

  host.fileExists = (fileName) =>
    allFiles.has(normalizePath(fileName)) || originalFileExists(fileName);

  host.readFile = (fileName) =>
    allFiles.get(normalizePath(fileName)) ?? originalReadFile(fileName);

  host.directoryExists = (directoryName) =>
    virtualDirectories.has(normalizePath(directoryName)) ||
    originalDirectoryExists?.(directoryName) ||
    false;

  host.getDirectories = (directoryName) => {
    const seen = new Set(originalGetDirectories?.(directoryName) ?? []);
    const normalizedDirectoryName = normalizePath(directoryName);

    for (const virtualDirectory of virtualDirectories) {
      if (getDirectoryPath(virtualDirectory) === normalizedDirectoryName) {
        seen.add(virtualDirectory.slice(normalizedDirectoryName.length + 1));
      }
    }

    return [...seen];
  };

  host.realpath = (path) => {
    const normalizedPath = normalizePath(path);

    if (allFiles.has(normalizedPath) || virtualDirectories.has(normalizedPath)) {
      return normalizedPath;
    }

    return originalRealpath?.(path) ?? path;
  };

  const program = ts.createProgram([consumerPath], compilerOptions, host);

  return ts.getPreEmitDiagnostics(program).map((diagnostic) => {
    const message = ts.flattenDiagnosticMessageText(
      diagnostic.messageText,
      "\n",
    );

    if (!diagnostic.file || diagnostic.start === undefined) {
      return message;
    }

    const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(
      diagnostic.start,
    );

    return `${diagnostic.file.fileName}:${line + 1}:${character + 1} ${message}`;
  });
}

describe("module augmentation typings", () => {
  it("supports the alias-based extends flow", () => {
    const diagnostics = compileConsumer(`
      import { createThemedStyles, useThemeSelector } from "react-native-zerostyles";

      export const appThemes = {
        light: { colors: { background: "#ffffff" } },
        dark: { colors: { background: "#000000" } },
      } as const;

      type AppThemesMap = typeof appThemes;

      declare module "react-native-zerostyles" {
        interface AppThemes extends AppThemesMap {}
      }

      createThemedStyles((theme) => ({
        container: {
          backgroundColor: theme.colors.background,
        },
      }));

      const background = useThemeSelector((ctx) => ctx.theme.colors.background);
      const themeName = useThemeSelector((ctx) => ctx.themeName);

      const assertBackground: "#ffffff" | "#000000" = background;
      const assertThemeName: "light" | "dark" = themeName;

      void assertBackground;
      void assertThemeName;
    `);

    expect(diagnostics).toEqual([]);
  });

  it("supports the explicit-key augmentation flow", () => {
    const diagnostics = compileConsumer(`
      import { createThemedStyles, useThemeSelector } from "react-native-zerostyles";

      export const appThemes = {
        light: { colors: { background: "#ffffff" } },
        dark: { colors: { background: "#000000" } },
      } as const;

      declare module "react-native-zerostyles" {
        interface AppThemes {
          light: typeof appThemes.light;
          dark: typeof appThemes.dark;
        }
      }

      createThemedStyles((theme) => ({
        container: {
          backgroundColor: theme.colors.background,
        },
      }));

      const background = useThemeSelector((ctx) => ctx.theme.colors.background);
      const themeName = useThemeSelector((ctx) => ctx.themeName);

      const assertBackground: "#ffffff" | "#000000" = background;
      const assertThemeName: "light" | "dark" = themeName;

      void assertBackground;
      void assertThemeName;
    `);

    expect(diagnostics).toEqual([]);
  });
});
