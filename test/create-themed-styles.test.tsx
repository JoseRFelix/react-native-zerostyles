import React from "react";
import { render } from "@testing-library/react";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createThemedStyles } from "../src/styles/create-themed-styles";
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
      useThemeSelector<typeof themes, keyof typeof themes>(
        (context) => context.themeName,
      );
      return null;
    }

    function ToggleConsumer() {
      toggleTheme = useThemeSelector<typeof themes, () => void>(
        (context) => context.toggleTheme,
      );
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
    expect(themeNameRenderSpy.mock.calls.length).toBeGreaterThan(
      themeNameRenderCount,
    );
    expect(stylesReference).toBe(initialStylesReference);
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
      toggleTheme = useThemeSelector<typeof themes, () => void>(
        (context) => context.toggleTheme,
      );
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

    expect(stylesRenderSpy.mock.calls.length).toBeGreaterThan(
      stylesRenderCount,
    );
    expect(stylesReference).not.toBe(initialStylesReference);
  });

  it("shares cached styles across component instances and theme round trips", () => {
    const factory = vi.fn((spacing: { md: number }) => ({
      container: { padding: spacing.md },
    }));
    const useStyles = createThemedStyles<
      { md: number },
      { container: { padding: number } },
      typeof themes
    >((theme) => theme.spacing, factory);

    let toggleTheme: (() => void) | undefined;
    let firstStyles: ReturnType<typeof useStyles> | undefined;
    let currentStyles: ReturnType<typeof useStyles> | undefined;

    function StylesConsumer({ first = false }: { first?: boolean }) {
      const styles = useStyles();

      if (first) {
        currentStyles = styles;
        firstStyles ??= styles;
      }

      return null;
    }

    function ToggleConsumer() {
      toggleTheme = useThemeSelector<typeof themes, () => void>(
        (context) => context.toggleTheme,
      );
      return null;
    }

    act(() => {
      render(
        <ThemeProvider themes={themes} initialTheme="light">
          <StylesConsumer first />
          {Array.from({ length: 99 }, (_, index) => (
            <StylesConsumer key={index} />
          ))}
          <ToggleConsumer />
        </ThemeProvider>,
      );
    });

    expect(factory).toHaveBeenCalledTimes(1);

    act(() => {
      toggleTheme?.();
    });

    expect(factory).toHaveBeenCalledTimes(2);
    expect(currentStyles).not.toBe(firstStyles);

    act(() => {
      toggleTheme?.();
    });

    expect(factory).toHaveBeenCalledTimes(2);
    expect(currentStyles).toBe(firstStyles);
  });

  it("bounds each generated hook cache to eight selected values", () => {
    const manyThemes = {
      one: { value: 1 },
      two: { value: 2 },
      three: { value: 3 },
      four: { value: 4 },
      five: { value: 5 },
      six: { value: 6 },
      seven: { value: 7 },
      eight: { value: 8 },
      nine: { value: 9 },
    } as const;
    const factory = vi.fn((value: number) => ({
      container: { opacity: value / 10 },
    }));
    const useStyles = createThemedStyles<
      number,
      { container: { opacity: number } },
      typeof manyThemes
    >((theme) => theme.value, factory);
    let toggleTheme: (() => void) | undefined;

    function StylesConsumer() {
      useStyles();
      return null;
    }

    function ToggleConsumer() {
      toggleTheme = useThemeSelector<typeof manyThemes, () => void>(
        (context) => context.toggleTheme,
      );
      return null;
    }

    act(() => {
      render(
        <ThemeProvider themes={manyThemes} initialTheme="one">
          <StylesConsumer />
          <ToggleConsumer />
        </ThemeProvider>,
      );
    });

    for (let index = 0; index < 8; index += 1) {
      act(() => {
        toggleTheme?.();
      });
    }

    expect(factory).toHaveBeenCalledTimes(9);

    act(() => {
      toggleTheme?.();
    });

    expect(factory).toHaveBeenCalledTimes(10);
  });
});
