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
});
