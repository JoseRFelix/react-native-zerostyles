import React, { memo, useMemo } from "react";
import { act } from "react";
import { render } from "@testing-library/react";
import { StyleSheet } from "react-native";
import { bench, describe } from "vitest";
import { createThemedStyles } from "../src/styles/create-themed-styles";
import {
  ThemeProvider,
  useTheme,
  useThemeSelector,
} from "../src/styles/theme-provider";

const sharedSpacing = { sm: 4, md: 8, lg: 16 } as const;
const themes = {
  light: {
    colors: { text: "#11181C", background: "#fff", tint: "#0a7ea4" },
    spacing: sharedSpacing,
  },
  dark: {
    colors: { text: "#ECEDEE", background: "#151718", tint: "#fff" },
    spacing: sharedSpacing,
  },
} as const;
const replacementThemes = {
  light: {
    colors: { text: "#11181C", background: "ivory", tint: "#0a7ea4" },
    spacing: sharedSpacing,
  },
  dark: {
    colors: { text: "#ECEDEE", background: "navy", tint: "#fff" },
    spacing: sharedSpacing,
  },
} as const;

type Themes = typeof themes;
type ThemeName = keyof Themes;
type ConsumerComponent = React.ComponentType;
type RenderedView = ReturnType<typeof render>;

const StableSelectorConsumer = memo(function StableSelectorConsumer() {
  useThemeSelector<Themes, typeof sharedSpacing>(
    (context) => context.theme.spacing,
  );
  return null;
});

const ChangingSelectorConsumer = memo(function ChangingSelectorConsumer() {
  useThemeSelector<Themes, string>(
    (context) => context.theme.colors.background,
  );
  return null;
});

const FullContextConsumer = memo(function FullContextConsumer() {
  useTheme<Themes>();
  return null;
});

const useBenchmarkStyles = createThemedStyles<
  string,
  {
    container: { backgroundColor: string; padding: number };
    label: { color: string };
  },
  Themes
>(
  (theme) => theme.colors.background,
  (backgroundColor) => ({
    container: { backgroundColor, padding: 8 },
    label: { color: backgroundColor },
  }),
);

const StyledConsumer = memo(function StyledConsumer() {
  useBenchmarkStyles();
  return null;
});

const PerInstanceStyledConsumer = memo(function PerInstanceStyledConsumer() {
  const backgroundColor = useThemeSelector<Themes, string>(
    (context) => context.theme.colors.background,
  );

  useMemo(
    () =>
      StyleSheet.create({
        container: { backgroundColor, padding: 8 },
        label: { color: backgroundColor },
      }),
    [backgroundColor],
  );

  return null;
});

function createConsumers(Component: ConsumerComponent, count: number) {
  return Array.from({ length: count }, (_, index) => <Component key={index} />);
}

function createUncontrolledFixture(
  Component: ConsumerComponent,
  count: number,
) {
  let toggleTheme: (() => void) | undefined;
  let view: RenderedView | undefined;

  function ToggleSource() {
    toggleTheme = useThemeSelector<Themes, () => void>(
      (context) => context.toggleTheme,
    );
    return null;
  }

  const tree = (
    <ThemeProvider themes={themes} initialTheme="light">
      {createConsumers(Component, count)}
      <ToggleSource />
    </ThemeProvider>
  );

  return {
    mount() {
      toggleTheme = undefined;
      view = render(tree);
    },
    mountOnce() {
      const mountedView = render(tree);
      mountedView.unmount();
    },
    toggle(times = 1) {
      const toggle = toggleTheme;

      if (!toggle) {
        throw new Error("Benchmark fixture must be mounted before toggling");
      }

      for (let index = 0; index < times; index += 1) {
        act(() => {
          toggle();
        });
      }
    },
    unmount() {
      view?.unmount();
      view = undefined;
    },
  };
}

function createControlledFixture(Component: ConsumerComponent, count: number) {
  let themeName: ThemeName = "light";
  let view: RenderedView | undefined;
  const children = <>{createConsumers(Component, count)}</>;
  const createTree = () => (
    <ThemeProvider themes={themes} themeName={themeName}>
      {children}
    </ThemeProvider>
  );

  return {
    mount() {
      themeName = "light";
      view = render(createTree());
    },
    update() {
      const mountedView = view;

      if (!mountedView) {
        throw new Error("Benchmark fixture must be mounted before updating");
      }

      themeName = themeName === "light" ? "dark" : "light";
      act(() => {
        mountedView.rerender(createTree());
      });
    },
    unmount() {
      view?.unmount();
      view = undefined;
    },
  };
}

function createThemeMapFixture(count: number) {
  let useReplacement = false;
  let view: RenderedView | undefined;
  const children = <>{createConsumers(StableSelectorConsumer, count)}</>;
  const createTree = () => (
    <ThemeProvider
      themes={useReplacement ? replacementThemes : themes}
      initialTheme="light"
    >
      {children}
    </ThemeProvider>
  );

  return {
    mount() {
      useReplacement = false;
      view = render(createTree());
    },
    replace() {
      const mountedView = view;

      if (!mountedView) {
        throw new Error("Benchmark fixture must be mounted before replacing");
      }

      useReplacement = !useReplacement;
      act(() => {
        mountedView.rerender(createTree());
      });
    },
    unmount() {
      view?.unmount();
      view = undefined;
    },
  };
}

describe("mount — 1,000 consumers", () => {
  const selectorFixture = createUncontrolledFixture(
    StableSelectorConsumer,
    1_000,
  );
  const fullFixture = createUncontrolledFixture(FullContextConsumer, 1_000);
  const cachedStylesFixture = createUncontrolledFixture(StyledConsumer, 1_000);
  const perInstanceStylesFixture = createUncontrolledFixture(
    PerInstanceStyledConsumer,
    1_000,
  );

  bench("useThemeSelector mount", () => {
    selectorFixture.mountOnce();
  });

  bench("useTheme mount", () => {
    fullFixture.mountOnce();
  });

  bench("cached themed styles mount", () => {
    cachedStylesFixture.mountOnce();
  });

  bench("per-instance style creation mount", () => {
    perInstanceStylesFixture.mountOnce();
  });
});

describe("update only — 1,000 consumers", () => {
  const selectorFixture = createUncontrolledFixture(
    StableSelectorConsumer,
    1_000,
  );
  const fullFixture = createUncontrolledFixture(FullContextConsumer, 1_000);

  bench(
    "stable selector toggle",
    () => {
      selectorFixture.toggle();
    },
    {
      setup: () => selectorFixture.mount(),
      teardown: () => selectorFixture.unmount(),
    },
  );

  bench(
    "full-context toggle",
    () => {
      fullFixture.toggle();
    },
    {
      setup: () => fullFixture.mount(),
      teardown: () => fullFixture.unmount(),
    },
  );
});

describe("style update only — 1,000 changing consumers", () => {
  const selectorFixture = createUncontrolledFixture(
    ChangingSelectorConsumer,
    1_000,
  );
  const stylesFixture = createUncontrolledFixture(StyledConsumer, 1_000);
  const perInstanceStylesFixture = createUncontrolledFixture(
    PerInstanceStyledConsumer,
    1_000,
  );

  bench(
    "changing selector toggle",
    () => {
      selectorFixture.toggle();
    },
    {
      setup: () => selectorFixture.mount(),
      teardown: () => selectorFixture.unmount(),
    },
  );

  bench(
    "cached themed styles toggle",
    () => {
      stylesFixture.toggle();
    },
    {
      setup: () => stylesFixture.mount(),
      teardown: () => stylesFixture.unmount(),
    },
  );

  bench(
    "per-instance style creation toggle",
    () => {
      perInstanceStylesFixture.toggle();
    },
    {
      setup: () => perInstanceStylesFixture.mount(),
      teardown: () => perInstanceStylesFixture.unmount(),
    },
  );
});

describe("discrete updates — 100 consumers, 10 toggles", () => {
  const selectorFixture = createUncontrolledFixture(
    StableSelectorConsumer,
    100,
  );
  const fullFixture = createUncontrolledFixture(FullContextConsumer, 100);

  bench(
    "stable selectors",
    () => {
      selectorFixture.toggle(10);
    },
    {
      setup: () => selectorFixture.mount(),
      teardown: () => selectorFixture.unmount(),
    },
  );

  bench(
    "full context",
    () => {
      fullFixture.toggle(10);
    },
    {
      setup: () => fullFixture.mount(),
      teardown: () => fullFixture.unmount(),
    },
  );
});

describe("controlled vs uncontrolled — 1,000 changing consumers", () => {
  const controlledFixture = createControlledFixture(
    ChangingSelectorConsumer,
    1_000,
  );
  const uncontrolledFixture = createUncontrolledFixture(
    ChangingSelectorConsumer,
    1_000,
  );

  bench(
    "controlled themeName update",
    () => {
      controlledFixture.update();
    },
    {
      setup: () => controlledFixture.mount(),
      teardown: () => controlledFixture.unmount(),
    },
  );

  bench(
    "uncontrolled toggle",
    () => {
      uncontrolledFixture.toggle();
    },
    {
      setup: () => uncontrolledFixture.mount(),
      teardown: () => uncontrolledFixture.unmount(),
    },
  );
});

describe("theme-map replacement — 1,000 stable consumers", () => {
  const fixture = createThemeMapFixture(1_000);

  bench(
    "replace themes map",
    () => {
      fixture.replace();
    },
    {
      setup: () => fixture.mount(),
      teardown: () => fixture.unmount(),
    },
  );
});
