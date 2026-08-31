import React from "react";
import { render } from "@testing-library/react";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ThemeProvider,
  useTheme,
  useThemeSelector,
} from "../src/styles/theme-provider";

const themes = {
  light: {
    colors: {
      background: "#ffffff",
    },
  },
  dark: {
    colors: {
      background: "#000000",
    },
  },
} as const;

describe("ThemeProvider rerender behavior", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("does not rerender selector consumers when their selected value is unchanged", () => {
    const actionOnlyRenderSpy = vi.fn();
    const themeNameRenderSpy = vi.fn();
    let toggleTheme: (() => void) | undefined;

    function ActionOnlyConsumer() {
      actionOnlyRenderSpy();
      toggleTheme = useThemeSelector<typeof themes, () => void>(
        (context) => context.toggleTheme,
      );
      return null;
    }

    function ThemeNameConsumer() {
      themeNameRenderSpy();
      useThemeSelector<typeof themes, keyof typeof themes>(
        (context) => context.themeName,
      );
      return null;
    }

    act(() => {
      render(
        <ThemeProvider themes={themes} initialTheme="light">
          <ActionOnlyConsumer />
          <ThemeNameConsumer />
        </ThemeProvider>,
      );
    });

    const actionOnlyRenderCount = actionOnlyRenderSpy.mock.calls.length;
    const themeNameRenderCount = themeNameRenderSpy.mock.calls.length;

    expect(toggleTheme).toBeDefined();

    act(() => {
      toggleTheme?.();
    });

    expect(actionOnlyRenderSpy.mock.calls.length).toBe(actionOnlyRenderCount);
    expect(themeNameRenderSpy.mock.calls.length).toBeGreaterThan(
      themeNameRenderCount,
    );
  });

  it("rerenders consumers that read the full theme context", () => {
    const fullContextRenderSpy = vi.fn();
    let toggleTheme: (() => void) | undefined;

    function FullContextConsumer() {
      fullContextRenderSpy();
      const context = useTheme<typeof themes>();
      toggleTheme = context.toggleTheme;
      return null;
    }

    act(() => {
      render(
        <ThemeProvider themes={themes} initialTheme="light">
          <FullContextConsumer />
        </ThemeProvider>,
      );
    });

    const fullContextRenderCount = fullContextRenderSpy.mock.calls.length;

    expect(toggleTheme).toBeDefined();

    act(() => {
      toggleTheme?.();
    });

    expect(fullContextRenderSpy.mock.calls.length).toBeGreaterThan(
      fullContextRenderCount,
    );
  });

  it("uses the latest selector when a consumer rerenders", () => {
    let selectedValue: string | undefined;

    function Consumer({ selectName }: { selectName: boolean }) {
      selectedValue = useThemeSelector<typeof themes, string>((context) =>
        selectName ? context.themeName : context.theme.colors.background,
      );
      return null;
    }

    const view = render(
      <ThemeProvider themes={themes} initialTheme="light">
        <Consumer selectName={false} />
      </ThemeProvider>,
    );

    expect(selectedValue).toBe("#ffffff");

    view.rerender(
      <ThemeProvider themes={themes} initialTheme="light">
        <Consumer selectName />
      </ThemeProvider>,
    );

    expect(selectedValue).toBe("light");
  });
});
