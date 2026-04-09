import React from "react";
import { render, cleanup } from "@testing-library/react";
import { act } from "react";
import { bench, describe, afterEach } from "vitest";
import {
  ThemeProvider,
  useTheme,
  useThemeSelector,
} from "../src/styles/theme-provider";
import { createThemedStyles } from "../src/styles/create-themed-styles";

const sharedSpacing = { sm: 4, md: 8, lg: 16 } as const;

const themes = {
  light: {
    colors: {
      text: "#11181C",
      background: "#fff",
      tint: "#0a7ea4",
      icon: "#687076",
    },
    spacing: sharedSpacing,
  },
  dark: {
    colors: {
      text: "#ECEDEE",
      background: "#151718",
      tint: "#fff",
      icon: "#9BA1A6",
    },
    spacing: sharedSpacing,
  },
} as const;

type Themes = typeof themes;

describe("useThemeSelector vs useTheme — single toggle", () => {
  afterEach(cleanup);

  bench("useThemeSelector (narrow: spacing — stable slice)", () => {
    let toggle: (() => void) | undefined;

    function Consumer() {
      useThemeSelector<Themes, typeof themes.light.spacing>(
        (ctx) => ctx.theme.spacing,
      );
      return null;
    }

    function Toggle() {
      toggle = useThemeSelector<Themes, () => void>((ctx) => ctx.toggleTheme);
      return null;
    }

    act(() => {
      render(
        <ThemeProvider themes={themes} initialTheme="light">
          <Consumer />
          <Toggle />
        </ThemeProvider>,
      );
    });

    act(() => {
      toggle?.();
    });
    cleanup();
  });

  bench("useTheme (full context — always re-renders)", () => {
    let toggle: (() => void) | undefined;

    function Consumer() {
      const ctx = useTheme<Themes>();
      toggle = ctx.toggleTheme;
      return null;
    }

    act(() => {
      render(
        <ThemeProvider themes={themes} initialTheme="light">
          <Consumer />
        </ThemeProvider>,
      );
    });

    act(() => {
      toggle?.();
    });
    cleanup();
  });
});

describe("createThemedStyles — 2-arg (selector) vs 1-arg (full theme)", () => {
  afterEach(cleanup);

  bench("2-arg form with stable slice (spacing — no re-render)", () => {
    const useStyles = createThemedStyles<
      typeof themes.light.spacing,
      { box: { padding: number } },
      Themes
    >(
      (theme) => theme.spacing,
      (spacing) => ({ box: { padding: spacing.md } }),
    );

    let toggle: (() => void) | undefined;

    function Consumer() {
      useStyles();
      return null;
    }

    function Toggle() {
      toggle = useThemeSelector<Themes, () => void>((ctx) => ctx.toggleTheme);
      return null;
    }

    act(() => {
      render(
        <ThemeProvider themes={themes} initialTheme="light">
          <Consumer />
          <Toggle />
        </ThemeProvider>,
      );
    });

    act(() => {
      toggle?.();
    });
    cleanup();
  });

  bench("1-arg form (full theme — always re-renders)", () => {
    const useStyles = createThemedStyles<{ box: { padding: number } }, Themes>(
      (theme) => ({
        box: { padding: theme.spacing.md },
      }),
    );

    let toggle: (() => void) | undefined;

    function Consumer() {
      useStyles();
      return null;
    }

    function Toggle() {
      toggle = useThemeSelector<Themes, () => void>((ctx) => ctx.toggleTheme);
      return null;
    }

    act(() => {
      render(
        <ThemeProvider themes={themes} initialTheme="light">
          <Consumer />
          <Toggle />
        </ThemeProvider>,
      );
    });

    act(() => {
      toggle?.();
    });
    cleanup();
  });
});

describe("scaling — 100 consumers, single toggle", () => {
  afterEach(cleanup);

  bench("100x useThemeSelector (narrow: stable slice)", () => {
    let toggle: (() => void) | undefined;

    function StableConsumer() {
      useThemeSelector<Themes, typeof themes.light.spacing>(
        (ctx) => ctx.theme.spacing,
      );
      return null;
    }

    function Toggle() {
      toggle = useThemeSelector<Themes, () => void>((ctx) => ctx.toggleTheme);
      return null;
    }

    const consumers = Array.from({ length: 100 }, (_, i) => (
      <StableConsumer key={i} />
    ));

    act(() => {
      render(
        <ThemeProvider themes={themes} initialTheme="light">
          {consumers}
          <Toggle />
        </ThemeProvider>,
      );
    });

    act(() => {
      toggle?.();
    });
    cleanup();
  });

  bench("100x useTheme (full context)", () => {
    let toggle: (() => void) | undefined;

    function FullConsumer() {
      const ctx = useTheme<Themes>();
      toggle = ctx.toggleTheme;
      return null;
    }

    const consumers = Array.from({ length: 100 }, (_, i) => (
      <FullConsumer key={i} />
    ));

    act(() => {
      render(
        <ThemeProvider themes={themes} initialTheme="light">
          {consumers}
        </ThemeProvider>,
      );
    });

    act(() => {
      toggle?.();
    });
    cleanup();
  });
});

describe("scaling — 500 consumers, single toggle", () => {
  afterEach(cleanup);

  bench("500x useThemeSelector (narrow: stable slice)", () => {
    let toggle: (() => void) | undefined;

    function StableConsumer() {
      useThemeSelector<Themes, typeof themes.light.spacing>(
        (ctx) => ctx.theme.spacing,
      );
      return null;
    }

    function Toggle() {
      toggle = useThemeSelector<Themes, () => void>((ctx) => ctx.toggleTheme);
      return null;
    }

    const consumers = Array.from({ length: 500 }, (_, i) => (
      <StableConsumer key={i} />
    ));

    act(() => {
      render(
        <ThemeProvider themes={themes} initialTheme="light">
          {consumers}
          <Toggle />
        </ThemeProvider>,
      );
    });

    act(() => {
      toggle?.();
    });
    cleanup();
  });

  bench("500x useTheme (full context)", () => {
    let toggle: (() => void) | undefined;

    function FullConsumer() {
      const ctx = useTheme<Themes>();
      toggle = ctx.toggleTheme;
      return null;
    }

    const consumers = Array.from({ length: 500 }, (_, i) => (
      <FullConsumer key={i} />
    ));

    act(() => {
      render(
        <ThemeProvider themes={themes} initialTheme="light">
          {consumers}
        </ThemeProvider>,
      );
    });

    act(() => {
      toggle?.();
    });
    cleanup();
  });
});

describe("scaling — 1000 consumers, single toggle", () => {
  afterEach(cleanup);

  bench("1000x useThemeSelector (narrow: stable slice)", () => {
    let toggle: (() => void) | undefined;

    function StableConsumer() {
      useThemeSelector<Themes, typeof themes.light.spacing>(
        (ctx) => ctx.theme.spacing,
      );
      return null;
    }

    function Toggle() {
      toggle = useThemeSelector<Themes, () => void>((ctx) => ctx.toggleTheme);
      return null;
    }

    const consumers = Array.from({ length: 1000 }, (_, i) => (
      <StableConsumer key={i} />
    ));

    act(() => {
      render(
        <ThemeProvider themes={themes} initialTheme="light">
          {consumers}
          <Toggle />
        </ThemeProvider>,
      );
    });

    act(() => {
      toggle?.();
    });
    cleanup();
  });

  bench("1000x useTheme (full context)", () => {
    let toggle: (() => void) | undefined;

    function FullConsumer() {
      const ctx = useTheme<Themes>();
      toggle = ctx.toggleTheme;
      return null;
    }

    const consumers = Array.from({ length: 1000 }, (_, i) => (
      <FullConsumer key={i} />
    ));

    act(() => {
      render(
        <ThemeProvider themes={themes} initialTheme="light">
          {consumers}
        </ThemeProvider>,
      );
    });

    act(() => {
      toggle?.();
    });
    cleanup();
  });
});

describe("rapid toggles — 100 toggles with 100 consumers", () => {
  afterEach(cleanup);

  bench("100x useThemeSelector (narrow: stable slice) — 100 toggles", () => {
    let toggle: (() => void) | undefined;

    function StableConsumer() {
      useThemeSelector<Themes, typeof themes.light.spacing>(
        (ctx) => ctx.theme.spacing,
      );
      return null;
    }

    function Toggle() {
      toggle = useThemeSelector<Themes, () => void>((ctx) => ctx.toggleTheme);
      return null;
    }

    const consumers = Array.from({ length: 100 }, (_, i) => (
      <StableConsumer key={i} />
    ));

    act(() => {
      render(
        <ThemeProvider themes={themes} initialTheme="light">
          {consumers}
          <Toggle />
        </ThemeProvider>,
      );
    });

    act(() => {
      for (let i = 0; i < 100; i++) {
        toggle?.();
      }
    });
    cleanup();
  });

  bench("100x useTheme (full context) — 100 toggles", () => {
    let toggle: (() => void) | undefined;

    function FullConsumer() {
      const ctx = useTheme<Themes>();
      toggle = ctx.toggleTheme;
      return null;
    }

    const consumers = Array.from({ length: 100 }, (_, i) => (
      <FullConsumer key={i} />
    ));

    act(() => {
      render(
        <ThemeProvider themes={themes} initialTheme="light">
          {consumers}
        </ThemeProvider>,
      );
    });

    act(() => {
      for (let i = 0; i < 100; i++) {
        toggle?.();
      }
    });
    cleanup();
  });
});
