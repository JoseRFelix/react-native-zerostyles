// @vitest-environment node

import React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ThemeProvider, useThemeSelector } from "../src/styles/theme-provider";

const themes = {
  light: { colors: { background: "white" } },
  dark: { colors: { background: "black" } },
} as const;

describe("server rendering", () => {
  it("reads a stable server snapshot without browser globals", () => {
    function Consumer() {
      const background = useThemeSelector<typeof themes, string>(
        (context) => context.theme.colors.background,
      );
      return <span>{background}</span>;
    }

    expect(
      renderToString(
        <ThemeProvider themes={themes} initialTheme="light">
          <Consumer />
        </ThemeProvider>,
      ),
    ).toBe("<span>white</span>");
  });
});
