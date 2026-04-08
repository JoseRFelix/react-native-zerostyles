import React from "react";
import { render } from "@testing-library/react";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { THEMED_STYLES_CACHE_LIMIT, createThemedStyles } from "../src/styles/create-themed-styles";
import { ThemeProvider, useThemeSelector } from "../src/styles/theme-provider";

const sharedColors = {
  background: "#ffffff",
  text: "#11181C",
} as const;

const themes = {
  light: {
    colors: sharedColors,
    spacing: {
      md: 12,
    },
  },
  dark: {
    colors: sharedColors,
    spacing: {
      md: 20,
    },
  },
} as const;

describe("createThemedStyles", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("does not rerender when the selected theme slice is unchanged", () => {
    const useStyles = createThemedStyles<
      typeof sharedColors,
      {
        container: { backgroundColor: string };
      },
      typeof themes
    >(
      (theme) => theme.colors,
      (colors) => ({
        container: {
          backgroundColor: colors.background,
        },
      }),
    );

    const stylesRenderSpy = vi.fn();
    const themeNameRenderSpy = vi.fn();
    let toggleTheme: (() => void) | undefined;
    let stylesReference: ReturnType<typeof useStyles> | undefined;

    function StylesConsumer() {
      stylesRenderSpy();
      stylesReference = useStyles();
      return null;
    }

    function ThemeNameConsumer() {
      themeNameRenderSpy();
      useThemeSelector<typeof themes, keyof typeof themes>((context) => context.themeName);
      return null;
    }

    function ToggleConsumer() {
      toggleTheme = useThemeSelector<typeof themes, () => void>((context) => context.toggleTheme);
      return null;
    }

    act(() => {
      render(
        <ThemeProvider themes={themes} initialTheme="light">
          <StylesConsumer />
          <ThemeNameConsumer />
          <ToggleConsumer />
        </ThemeProvider>,
      );
    });

    const stylesRenderCount = stylesRenderSpy.mock.calls.length;
    const themeNameRenderCount = themeNameRenderSpy.mock.calls.length;
    const initialStylesReference = stylesReference;

    expect(toggleTheme).toBeDefined();

    act(() => {
      toggleTheme?.();
    });

    expect(stylesRenderSpy.mock.calls.length).toBe(stylesRenderCount);
    expect(themeNameRenderSpy.mock.calls.length).toBeGreaterThan(themeNameRenderCount);
    expect(stylesReference).toBe(initialStylesReference);
  });

  it("shares cached styles across component instances for the same selected slice", () => {
    const factory = vi.fn((colors: typeof sharedColors) => ({
      container: {
        backgroundColor: colors.background,
      },
    }));
    const useStyles = createThemedStyles<
      typeof sharedColors,
      {
        container: { backgroundColor: string };
      },
      typeof themes
    >((theme) => theme.colors, factory);

    let firstStyles: ReturnType<typeof useStyles> | undefined;
    let secondStyles: ReturnType<typeof useStyles> | undefined;

    function FirstConsumer() {
      firstStyles = useStyles();
      return null;
    }

    function SecondConsumer() {
      secondStyles = useStyles();
      return null;
    }

    act(() => {
      render(
        <ThemeProvider themes={themes} initialTheme="light">
          <FirstConsumer />
          <SecondConsumer />
        </ThemeProvider>,
      );
    });

    expect(factory).toHaveBeenCalledTimes(1);
    expect(firstStyles).toBeDefined();
    expect(secondStyles).toBe(firstStyles);
  });

  it("reuses cached styles when switching back to a previous theme slice", () => {
    const factory = vi.fn((spacing: (typeof themes)[keyof typeof themes]["spacing"]) => ({
      container: {
        padding: spacing.md,
      },
    }));
    const useStyles = createThemedStyles<
      (typeof themes)[keyof typeof themes]["spacing"],
      { container: { padding: number } },
      typeof themes
    >((theme) => theme.spacing, factory);

    let toggleTheme: (() => void) | undefined;
    let stylesReference: ReturnType<typeof useStyles> | undefined;

    function StylesConsumer() {
      stylesReference = useStyles();
      return null;
    }

    function ToggleConsumer() {
      toggleTheme = useThemeSelector<typeof themes, () => void>((context) => context.toggleTheme);
      return null;
    }

    act(() => {
      render(
        <ThemeProvider themes={themes} initialTheme="light">
          <StylesConsumer />
          <ToggleConsumer />
        </ThemeProvider>,
      );
    });

    const initialStylesReference = stylesReference;

    expect(toggleTheme).toBeDefined();
    expect(factory).toHaveBeenCalledTimes(1);

    act(() => {
      toggleTheme?.();
    });

    const darkStylesReference = stylesReference;

    expect(factory).toHaveBeenCalledTimes(2);
    expect(darkStylesReference).not.toBe(initialStylesReference);

    act(() => {
      toggleTheme?.();
    });

    expect(factory).toHaveBeenCalledTimes(2);
    expect(stylesReference).toBe(initialStylesReference);
  });

  it("evicts the least recently used selected slice when the cache limit is reached", () => {
    const cacheThemes = Object.fromEntries(
      Array.from({ length: THEMED_STYLES_CACHE_LIMIT + 1 }, (_, index) => [
        `theme-${index}`,
        {
          token: index,
        },
      ]),
    ) as Record<`theme-${number}`, { token: number }>;

    const factory = vi.fn((token: number) => ({
      container: {
        padding: token,
      },
    }));
    const useStyles = createThemedStyles<
      number,
      { container: { padding: number } },
      typeof cacheThemes
    >((theme) => theme.token, factory);

    let setThemeName: ((name: keyof typeof cacheThemes) => void) | undefined;
    let stylesReference: ReturnType<typeof useStyles> | undefined;

    function StylesConsumer() {
      stylesReference = useStyles();
      return null;
    }

    function ControlsConsumer() {
      setThemeName = useThemeSelector<typeof cacheThemes, (name: keyof typeof cacheThemes) => void>(
        (context) => context.setThemeName,
      );
      return null;
    }

    act(() => {
      render(
        <ThemeProvider themes={cacheThemes} initialTheme="theme-0">
          <StylesConsumer />
          <ControlsConsumer />
        </ThemeProvider>,
      );
    });

    const themeZeroStylesReference = stylesReference;

    expect(setThemeName).toBeDefined();
    expect(factory).toHaveBeenCalledTimes(1);

    for (let index = 1; index <= THEMED_STYLES_CACHE_LIMIT; index += 1) {
      act(() => {
        setThemeName?.(`theme-${index}` as keyof typeof cacheThemes);
      });
    }

    expect(factory).toHaveBeenCalledTimes(THEMED_STYLES_CACHE_LIMIT + 1);

    act(() => {
      setThemeName?.("theme-0");
    });

    expect(factory).toHaveBeenCalledTimes(THEMED_STYLES_CACHE_LIMIT + 2);
    expect(stylesReference).not.toBe(themeZeroStylesReference);
  });

  it("rerenders when the selected theme slice changes", () => {
    const useStyles = createThemedStyles<
      { spacing: (typeof themes)[keyof typeof themes]["spacing"] },
      { container: { padding: number } },
      typeof themes
    >(
      (theme) => ({
        spacing: theme.spacing,
      }),
      ({ spacing }) => ({
        container: {
          padding: spacing.md,
        },
      }),
    );

    const stylesRenderSpy = vi.fn();
    let toggleTheme: (() => void) | undefined;
    let stylesReference: ReturnType<typeof useStyles> | undefined;

    function StylesConsumer() {
      stylesRenderSpy();
      stylesReference = useStyles();
      return null;
    }

    function ToggleConsumer() {
      toggleTheme = useThemeSelector<typeof themes, () => void>((context) => context.toggleTheme);
      return null;
    }

    act(() => {
      render(
        <ThemeProvider themes={themes} initialTheme="light">
          <StylesConsumer />
          <ToggleConsumer />
        </ThemeProvider>,
      );
    });

    const stylesRenderCount = stylesRenderSpy.mock.calls.length;
    const initialStylesReference = stylesReference;

    expect(toggleTheme).toBeDefined();

    act(() => {
      toggleTheme?.();
    });

    expect(stylesRenderSpy.mock.calls.length).toBeGreaterThan(stylesRenderCount);
    expect(stylesReference).not.toBe(initialStylesReference);
  });
});
