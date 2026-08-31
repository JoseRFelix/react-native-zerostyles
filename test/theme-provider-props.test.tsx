import React, { memo } from "react";
import { act } from "react";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ThemeProvider, useThemeSelector } from "../src/styles/theme-provider";

const themes = {
  light: {
    colors: { background: "white" },
    spacing: { md: 12 },
  },
  dark: {
    colors: { background: "black" },
    spacing: { md: 12 },
  },
} as const;

describe("ThemeProvider prop updates", () => {
  it("treats initialTheme as mount-only", () => {
    let observedTheme: keyof typeof themes | undefined;

    function Consumer() {
      observedTheme = useThemeSelector<typeof themes, keyof typeof themes>(
        (context) => context.themeName,
      );
      return null;
    }

    const view = render(
      <ThemeProvider themes={themes} initialTheme="light">
        <Consumer />
      </ThemeProvider>,
    );

    view.rerender(
      <ThemeProvider themes={themes} initialTheme="dark">
        <Consumer />
      </ThemeProvider>,
    );

    expect(observedTheme).toBe("light");
  });

  it("follows controlled themeName updates", () => {
    let observedTheme: keyof typeof themes | undefined;

    const Consumer = memo(function Consumer() {
      observedTheme = useThemeSelector<typeof themes, keyof typeof themes>(
        (context) => context.themeName,
      );
      return null;
    });

    const view = render(
      <ThemeProvider themes={themes} themeName="light">
        <Consumer />
      </ThemeProvider>,
    );

    view.rerender(
      <ThemeProvider themes={themes} themeName="dark">
        <Consumer />
      </ThemeProvider>,
    );

    expect(observedTheme).toBe("dark");
  });

  it("requests controlled changes without mutating controlled state", () => {
    const onThemeChange = vi.fn();
    let observedTheme: keyof typeof themes | undefined;
    let setTheme: ((name: keyof typeof themes) => void) | undefined;

    function Consumer() {
      observedTheme = useThemeSelector<typeof themes, keyof typeof themes>(
        (context) => context.themeName,
      );
      setTheme = useThemeSelector<
        typeof themes,
        (name: keyof typeof themes) => void
      >((context) => context.setTheme);
      return null;
    }

    const view = render(
      <ThemeProvider
        themes={themes}
        themeName="light"
        onThemeChange={onThemeChange}
      >
        <Consumer />
      </ThemeProvider>,
    );

    act(() => {
      setTheme?.("dark");
    });

    expect(onThemeChange).toHaveBeenCalledWith("dark");
    expect(observedTheme).toBe("light");

    view.rerender(
      <ThemeProvider
        themes={themes}
        themeName="dark"
        onThemeChange={onThemeChange}
      >
        <Consumer />
      </ThemeProvider>,
    );

    expect(observedTheme).toBe("dark");
  });

  it("routes controlled toggles through onThemeChange", () => {
    const onThemeChange = vi.fn();
    let toggleTheme: (() => void) | undefined;

    function Consumer() {
      toggleTheme = useThemeSelector<typeof themes, () => void>(
        (context) => context.toggleTheme,
      );
      return null;
    }

    render(
      <ThemeProvider
        themes={themes}
        themeName="light"
        onThemeChange={onThemeChange}
      >
        <Consumer />
      </ThemeProvider>,
    );

    act(() => {
      toggleTheme?.();
    });

    expect(onThemeChange).toHaveBeenCalledWith("dark");
  });

  it("notifies memoized consumers when the themes map is replaced", () => {
    let observedBackground: string | undefined;

    const Consumer = memo(function Consumer() {
      observedBackground = useThemeSelector<typeof themes, string>(
        (context) => context.theme.colors.background,
      );
      return null;
    });

    const view = render(
      <ThemeProvider themes={themes} initialTheme="light">
        <Consumer />
      </ThemeProvider>,
    );

    const replacementThemes = {
      light: {
        colors: { background: "ivory" },
        spacing: { md: 12 },
      },
      dark: {
        colors: { background: "navy" },
        spacing: { md: 12 },
      },
    } as const;

    view.rerender(
      <ThemeProvider themes={replacementThemes} initialTheme="light">
        <Consumer />
      </ThemeProvider>,
    );

    expect(observedBackground).toBe("ivory");
  });

  it("preserves selector bailouts when a themes map is replaced", () => {
    const renderSpy = vi.fn();

    const Consumer = memo(function Consumer() {
      renderSpy();
      useThemeSelector<typeof themes, number>(
        (context) => context.theme.spacing.md,
      );
      return null;
    });

    const view = render(
      <ThemeProvider themes={themes} initialTheme="light">
        <Consumer />
      </ThemeProvider>,
    );
    const initialRenderCount = renderSpy.mock.calls.length;

    const replacementThemes = {
      light: {
        colors: { background: "ivory" },
        spacing: { md: 12 },
      },
      dark: {
        colors: { background: "navy" },
        spacing: { md: 12 },
      },
    } as const;

    view.rerender(
      <ThemeProvider themes={replacementThemes} initialTheme="light">
        <Consumer />
      </ThemeProvider>,
    );

    expect(renderSpy).toHaveBeenCalledTimes(initialRenderCount);
  });
});
