import React, { memo } from "react";
import { act } from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ThemeProvider, useThemeSelector } from "../src/styles/theme-provider";

const sharedSpacing = { md: 8 } as const;
const themes = {
  light: { colors: { background: "white" }, spacing: sharedSpacing },
  dark: { colors: { background: "black" }, spacing: sharedSpacing },
} as const;

type Themes = typeof themes;

describe("performance invariants", () => {
  afterEach(cleanup);

  it("checks stable selectors once without rerendering their consumers", () => {
    let selectorCalls = 0;
    let renders = 0;
    let toggleTheme: (() => void) | undefined;

    const StableConsumer = memo(function StableConsumer() {
      renders += 1;
      useThemeSelector<Themes, typeof sharedSpacing>((context) => {
        selectorCalls += 1;
        return context.theme.spacing;
      });
      return null;
    });

    function ToggleSource() {
      toggleTheme = useThemeSelector<Themes, () => void>(
        (context) => context.toggleTheme,
      );
      return null;
    }

    act(() => {
      render(
        <ThemeProvider themes={themes} initialTheme="light">
          {Array.from({ length: 1_000 }, (_, index) => (
            <StableConsumer key={index} />
          ))}
          <ToggleSource />
        </ThemeProvider>,
      );
    });

    selectorCalls = 0;
    renders = 0;

    act(() => {
      toggleTheme?.();
    });

    expect(selectorCalls).toBe(1_000);
    expect(renders).toBe(0);
  });

  it("checks and rerenders each changing inline-selector consumer once", () => {
    let selectorCalls = 0;
    let renders = 0;
    let toggleTheme: (() => void) | undefined;

    const ChangingConsumer = memo(function ChangingConsumer() {
      renders += 1;
      useThemeSelector<Themes, string>((context) => {
        selectorCalls += 1;
        return context.theme.colors.background;
      });
      return null;
    });

    function ToggleSource() {
      toggleTheme = useThemeSelector<Themes, () => void>(
        (context) => context.toggleTheme,
      );
      return null;
    }

    act(() => {
      render(
        <ThemeProvider themes={themes} initialTheme="light">
          {Array.from({ length: 1_000 }, (_, index) => (
            <ChangingConsumer key={index} />
          ))}
          <ToggleSource />
        </ThemeProvider>,
      );
    });

    selectorCalls = 0;
    renders = 0;

    act(() => {
      toggleTheme?.();
    });

    // An inline selector runs for the store notification and again for the
    // required render, when React receives the new selector function.
    expect(selectorCalls).toBe(2_000);
    expect(renders).toBe(1_000);
  });
});
