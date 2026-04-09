import React from "react";
import { render } from "@testing-library/react";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ThemeProvider,
  useTheme,
  useThemeSelector,
} from "../src/styles/theme-provider";
import { createThemedStyles } from "../src/styles/create-themed-styles";

const sharedSpacing = { sm: 4, md: 8, lg: 16 } as const;
const sharedBorderRadius = { sm: 4, md: 8 } as const;

const themes = {
  light: {
    colors: {
      text: "#11181C",
      background: "#fff",
      tint: "#0a7ea4",
      icon: "#687076",
      tabIconDefault: "#687076",
      tabIconSelected: "#0a7ea4",
    },
    spacing: sharedSpacing,
    borderRadius: sharedBorderRadius,
  },
  dark: {
    colors: {
      text: "#ECEDEE",
      background: "#151718",
      tint: "#fff",
      icon: "#9BA1A6",
      tabIconDefault: "#9BA1A6",
      tabIconSelected: "#fff",
    },
    spacing: sharedSpacing,
    borderRadius: sharedBorderRadius,
  },
} as const;

type Themes = typeof themes;

function createRenderCounter() {
  const spy = vi.fn();
  return {
    spy,
    get count() {
      return spy.mock.calls.length;
    },
  };
}

describe("Theme selection re-render optimization", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("useThemeSelector vs useTheme render counts", () => {
    it("narrow selector avoids re-render when selected value is unchanged across themes", () => {
      const selectorConsumer = createRenderCounter();
      const fullContextConsumer = createRenderCounter();
      let toggleTheme: (() => void) | undefined;

      function SelectorConsumer() {
        selectorConsumer.spy();
        useThemeSelector<Themes, typeof themes.light.spacing>(
          (ctx) => ctx.theme.spacing,
        );
        return null;
      }

      function FullContextConsumer() {
        fullContextConsumer.spy();
        const ctx = useTheme<Themes>();
        toggleTheme = ctx.toggleTheme;
        return null;
      }

      act(() => {
        render(
          <ThemeProvider themes={themes} initialTheme="light">
            <SelectorConsumer />
            <FullContextConsumer />
          </ThemeProvider>,
        );
      });

      const selectorAfterMount = selectorConsumer.count;
      const fullAfterMount = fullContextConsumer.count;

      act(() => {
        toggleTheme?.();
      });

      expect(selectorConsumer.count).toBe(selectorAfterMount);
      expect(fullContextConsumer.count).toBeGreaterThan(fullAfterMount);
    });

    it("narrow selector re-renders when its selected value actually changes", () => {
      const backgroundConsumer = createRenderCounter();
      let toggleTheme: (() => void) | undefined;

      function BackgroundConsumer() {
        backgroundConsumer.spy();
        useThemeSelector<Themes, string>((ctx) => ctx.theme.colors.background);
        return null;
      }

      function ToggleSource() {
        toggleTheme = useThemeSelector<Themes, () => void>(
          (ctx) => ctx.toggleTheme,
        );
        return null;
      }

      act(() => {
        render(
          <ThemeProvider themes={themes} initialTheme="light">
            <BackgroundConsumer />
            <ToggleSource />
          </ThemeProvider>,
        );
      });

      const afterMount = backgroundConsumer.count;

      act(() => {
        toggleTheme?.();
      });

      expect(backgroundConsumer.count).toBeGreaterThan(afterMount);
    });

    it("toggleTheme selector does not re-render because the function reference is stable", () => {
      const toggleConsumer = createRenderCounter();
      const themeNameConsumer = createRenderCounter();
      let toggleTheme: (() => void) | undefined;

      function ToggleConsumer() {
        toggleConsumer.spy();
        toggleTheme = useThemeSelector<Themes, () => void>(
          (ctx) => ctx.toggleTheme,
        );
        return null;
      }

      function ThemeNameConsumer() {
        themeNameConsumer.spy();
        useThemeSelector<Themes, keyof Themes>((ctx) => ctx.themeName);
        return null;
      }

      act(() => {
        render(
          <ThemeProvider themes={themes} initialTheme="light">
            <ToggleConsumer />
            <ThemeNameConsumer />
          </ThemeProvider>,
        );
      });

      const toggleAfterMount = toggleConsumer.count;

      act(() => {
        toggleTheme?.();
      });

      expect(toggleConsumer.count).toBe(toggleAfterMount);
      expect(themeNameConsumer.count).toBeGreaterThan(toggleAfterMount);
    });
  });

  describe("createThemedStyles render optimization", () => {
    it("2-arg form skips re-render when the selected slice is shared across themes", () => {
      const useStyles = createThemedStyles<
        typeof themes.light.spacing,
        { container: { padding: number } },
        Themes
      >(
        (theme) => theme.spacing,
        (spacing) => ({
          container: { padding: spacing.md },
        }),
      );

      const stylesConsumer = createRenderCounter();
      let toggleTheme: (() => void) | undefined;
      let currentStyles: ReturnType<typeof useStyles> | undefined;

      function StylesConsumer() {
        stylesConsumer.spy();
        currentStyles = useStyles();
        return null;
      }

      function ToggleSource() {
        toggleTheme = useThemeSelector<Themes, () => void>(
          (ctx) => ctx.toggleTheme,
        );
        return null;
      }

      act(() => {
        render(
          <ThemeProvider themes={themes} initialTheme="light">
            <StylesConsumer />
            <ToggleSource />
          </ThemeProvider>,
        );
      });

      const afterMount = stylesConsumer.count;
      const initialStyles = currentStyles;

      act(() => {
        toggleTheme?.();
      });

      expect(stylesConsumer.count).toBe(afterMount);
      expect(currentStyles).toBe(initialStyles);
    });

    it("2-arg form re-renders when the selected slice differs between themes", () => {
      const useStyles = createThemedStyles<
        typeof themes.light.colors,
        { text: { color: string } },
        Themes
      >(
        (theme) => theme.colors,
        (colors) => ({
          text: { color: colors.text },
        }),
      );

      const stylesConsumer = createRenderCounter();
      let toggleTheme: (() => void) | undefined;
      let currentStyles: ReturnType<typeof useStyles> | undefined;

      function StylesConsumer() {
        stylesConsumer.spy();
        currentStyles = useStyles();
        return null;
      }

      function ToggleSource() {
        toggleTheme = useThemeSelector<Themes, () => void>(
          (ctx) => ctx.toggleTheme,
        );
        return null;
      }

      act(() => {
        render(
          <ThemeProvider themes={themes} initialTheme="light">
            <StylesConsumer />
            <ToggleSource />
          </ThemeProvider>,
        );
      });

      const afterMount = stylesConsumer.count;
      const initialStyles = currentStyles;

      act(() => {
        toggleTheme?.();
      });

      expect(stylesConsumer.count).toBeGreaterThan(afterMount);
      expect(currentStyles).not.toBe(initialStyles);
    });

    it("1-arg form re-renders on every theme change even if styles are equivalent", () => {
      const useStyles = createThemedStyles<
        { container: { padding: number } },
        Themes
      >((theme) => ({
        container: { padding: theme.spacing.md },
      }));

      const stylesConsumer = createRenderCounter();
      let toggleTheme: (() => void) | undefined;

      function StylesConsumer() {
        stylesConsumer.spy();
        useStyles();
        return null;
      }

      function ToggleSource() {
        toggleTheme = useThemeSelector<Themes, () => void>(
          (ctx) => ctx.toggleTheme,
        );
        return null;
      }

      act(() => {
        render(
          <ThemeProvider themes={themes} initialTheme="light">
            <StylesConsumer />
            <ToggleSource />
          </ThemeProvider>,
        );
      });

      const afterMount = stylesConsumer.count;

      act(() => {
        toggleTheme?.();
      });

      expect(stylesConsumer.count).toBeGreaterThan(afterMount);
    });
  });

  describe("scaling behavior with many consumers", () => {
    it("only components whose selected slice changed re-render in a large tree", () => {
      const STABLE_SPACING = 50;
      const STABLE_BORDER_RADIUS = 30;
      const CHANGING_BACKGROUND = 40;
      const CHANGING_TEXT = 30;

      const stableSpacingSpies = Array.from({ length: STABLE_SPACING }, () =>
        createRenderCounter(),
      );
      const stableBorderRadiusSpies = Array.from(
        { length: STABLE_BORDER_RADIUS },
        () => createRenderCounter(),
      );
      const changingBgSpies = Array.from({ length: CHANGING_BACKGROUND }, () =>
        createRenderCounter(),
      );
      const changingTextSpies = Array.from({ length: CHANGING_TEXT }, () =>
        createRenderCounter(),
      );
      let toggleTheme: (() => void) | undefined;

      function SpacingConsumer({ index }: { index: number }) {
        stableSpacingSpies[index]!.spy();
        useThemeSelector<Themes, typeof themes.light.spacing>(
          (ctx) => ctx.theme.spacing,
        );
        return null;
      }

      function BorderRadiusConsumer({ index }: { index: number }) {
        stableBorderRadiusSpies[index]!.spy();
        useThemeSelector<Themes, typeof themes.light.borderRadius>(
          (ctx) => ctx.theme.borderRadius,
        );
        return null;
      }

      function BackgroundConsumer({ index }: { index: number }) {
        changingBgSpies[index]!.spy();
        useThemeSelector<Themes, string>((ctx) => ctx.theme.colors.background);
        return null;
      }

      function TextConsumer({ index }: { index: number }) {
        changingTextSpies[index]!.spy();
        useThemeSelector<Themes, string>((ctx) => ctx.theme.colors.text);
        return null;
      }

      function ToggleSource() {
        toggleTheme = useThemeSelector<Themes, () => void>(
          (ctx) => ctx.toggleTheme,
        );
        return null;
      }

      act(() => {
        render(
          <ThemeProvider themes={themes} initialTheme="light">
            {Array.from({ length: STABLE_SPACING }, (_, i) => (
              <SpacingConsumer key={`sp-${i}`} index={i} />
            ))}
            {Array.from({ length: STABLE_BORDER_RADIUS }, (_, i) => (
              <BorderRadiusConsumer key={`br-${i}`} index={i} />
            ))}
            {Array.from({ length: CHANGING_BACKGROUND }, (_, i) => (
              <BackgroundConsumer key={`bg-${i}`} index={i} />
            ))}
            {Array.from({ length: CHANGING_TEXT }, (_, i) => (
              <TextConsumer key={`tx-${i}`} index={i} />
            ))}
            <ToggleSource />
          </ThemeProvider>,
        );
      });

      const stableSpacingAfter = stableSpacingSpies.map((s) => s.count);
      const stableBorderAfter = stableBorderRadiusSpies.map((s) => s.count);
      const changingBgAfter = changingBgSpies.map((s) => s.count);
      const changingTextAfter = changingTextSpies.map((s) => s.count);

      act(() => {
        toggleTheme?.();
      });

      for (let i = 0; i < STABLE_SPACING; i++) {
        expect(
          stableSpacingSpies[i]!.count,
          `spacing consumer ${i} should not have re-rendered`,
        ).toBe(stableSpacingAfter[i]);
      }
      for (let i = 0; i < STABLE_BORDER_RADIUS; i++) {
        expect(
          stableBorderRadiusSpies[i]!.count,
          `border-radius consumer ${i} should not have re-rendered`,
        ).toBe(stableBorderAfter[i]);
      }
      for (let i = 0; i < CHANGING_BACKGROUND; i++) {
        expect(
          changingBgSpies[i]!.count,
          `background consumer ${i} should have re-rendered`,
        ).toBeGreaterThan(changingBgAfter[i]!);
      }
      for (let i = 0; i < CHANGING_TEXT; i++) {
        expect(
          changingTextSpies[i]!.count,
          `text consumer ${i} should have re-rendered`,
        ).toBeGreaterThan(changingTextAfter[i]!);
      }
    });

    it("rapid theme toggles: affected components render once per toggle, stable components never re-render", () => {
      const TOGGLE_COUNT = 10;
      const STABLE_COUNT = 50;
      const CHANGING_COUNT = 50;

      const stableSpies = Array.from({ length: STABLE_COUNT }, () =>
        createRenderCounter(),
      );
      const changingSpies = Array.from({ length: CHANGING_COUNT }, () =>
        createRenderCounter(),
      );
      let toggleTheme: (() => void) | undefined;

      function StableConsumer({ index }: { index: number }) {
        stableSpies[index]!.spy();
        useThemeSelector<Themes, typeof themes.light.borderRadius>(
          (ctx) => ctx.theme.borderRadius,
        );
        return null;
      }

      function ChangingConsumer({ index }: { index: number }) {
        changingSpies[index]!.spy();
        useThemeSelector<Themes, string>((ctx) => ctx.theme.colors.text);
        return null;
      }

      function ToggleSource() {
        toggleTheme = useThemeSelector<Themes, () => void>(
          (ctx) => ctx.toggleTheme,
        );
        return null;
      }

      act(() => {
        render(
          <ThemeProvider themes={themes} initialTheme="light">
            {Array.from({ length: STABLE_COUNT }, (_, i) => (
              <StableConsumer key={`s-${i}`} index={i} />
            ))}
            {Array.from({ length: CHANGING_COUNT }, (_, i) => (
              <ChangingConsumer key={`c-${i}`} index={i} />
            ))}
            <ToggleSource />
          </ThemeProvider>,
        );
      });

      const stableAfterMount = stableSpies.map((s) => s.count);
      const changingAfterMount = changingSpies.map((s) => s.count);

      for (let i = 0; i < TOGGLE_COUNT; i++) {
        act(() => {
          toggleTheme?.();
        });
      }

      for (let i = 0; i < STABLE_COUNT; i++) {
        expect(
          stableSpies[i]!.count,
          `stable consumer ${i} should not have re-rendered after ${TOGGLE_COUNT} toggles`,
        ).toBe(stableAfterMount[i]);
      }
      for (let i = 0; i < CHANGING_COUNT; i++) {
        expect(
          changingSpies[i]!.count,
          `changing consumer ${i} should have re-rendered once per toggle`,
        ).toBe(changingAfterMount[i]! + TOGGLE_COUNT);
      }
    });
  });

  describe("example app patterns", () => {
    it("ThemedView pattern: background selector only re-renders when background changes", () => {
      const useThemedViewStyles = createThemedStyles<
        string,
        { view: { backgroundColor: string } },
        Themes
      >(
        (theme) => theme.colors.background,
        (backgroundColor) => ({
          view: { backgroundColor },
        }),
      );

      const viewRender = createRenderCounter();
      let toggleTheme: (() => void) | undefined;

      function ThemedView() {
        viewRender.spy();
        useThemedViewStyles();
        return null;
      }

      function ToggleSource() {
        toggleTheme = useThemeSelector<Themes, () => void>(
          (ctx) => ctx.toggleTheme,
        );
        return null;
      }

      act(() => {
        render(
          <ThemeProvider themes={themes} initialTheme="light">
            <ThemedView />
            <ToggleSource />
          </ThemeProvider>,
        );
      });

      const afterMount = viewRender.count;

      act(() => {
        toggleTheme?.();
      });

      expect(viewRender.count).toBeGreaterThan(afterMount);

      const afterFirstToggle = viewRender.count;

      act(() => {
        toggleTheme?.();
      });

      expect(viewRender.count).toBeGreaterThan(afterFirstToggle);
    });

    it("ThemedText pattern: colors selector re-renders only when colors change", () => {
      const useThemedTextStyles = createThemedStyles<
        typeof themes.light.colors,
        { base: { color: string }; link: { color: string } },
        Themes
      >(
        (theme) => theme.colors,
        (colors) => ({
          base: { color: colors.text },
          link: { color: colors.tint },
        }),
      );

      const textRender = createRenderCounter();
      let toggleTheme: (() => void) | undefined;

      function ThemedText() {
        textRender.spy();
        useThemedTextStyles();
        return null;
      }

      function ToggleSource() {
        toggleTheme = useThemeSelector<Themes, () => void>(
          (ctx) => ctx.toggleTheme,
        );
        return null;
      }

      act(() => {
        render(
          <ThemeProvider themes={themes} initialTheme="light">
            <ThemedText />
            <ToggleSource />
          </ThemeProvider>,
        );
      });

      const afterMount = textRender.count;

      act(() => {
        toggleTheme?.();
      });

      expect(textRender.count).toBeGreaterThan(afterMount);
    });

    it("tab layout pattern: tint-only selector avoids re-render from unrelated slice changes", () => {
      const themesWithSharedTint = {
        light: {
          ...themes.light,
          colors: { ...themes.light.colors, tint: "#shared" },
        },
        dark: {
          ...themes.dark,
          colors: { ...themes.dark.colors, tint: "#shared" },
        },
      } as const;

      const tintConsumer = createRenderCounter();
      const backgroundConsumer = createRenderCounter();
      let toggleTheme: (() => void) | undefined;

      function TintConsumer() {
        tintConsumer.spy();
        useThemeSelector<typeof themesWithSharedTint, string>(
          (ctx) => ctx.theme.colors.tint,
        );
        return null;
      }

      function BackgroundConsumer() {
        backgroundConsumer.spy();
        useThemeSelector<typeof themesWithSharedTint, string>(
          (ctx) => ctx.theme.colors.background,
        );
        return null;
      }

      function ToggleSource() {
        toggleTheme = useThemeSelector<typeof themesWithSharedTint, () => void>(
          (ctx) => ctx.toggleTheme,
        );
        return null;
      }

      act(() => {
        render(
          <ThemeProvider themes={themesWithSharedTint} initialTheme="light">
            <TintConsumer />
            <BackgroundConsumer />
            <ToggleSource />
          </ThemeProvider>,
        );
      });

      const tintAfterMount = tintConsumer.count;
      const bgAfterMount = backgroundConsumer.count;

      act(() => {
        toggleTheme?.();
      });

      expect(tintConsumer.count).toBe(tintAfterMount);
      expect(backgroundConsumer.count).toBeGreaterThan(bgAfterMount);
    });

    it("full example app simulation: measures total re-renders saved vs naive approach", () => {
      const useViewStyles = createThemedStyles<
        string,
        { view: { backgroundColor: string } },
        Themes
      >(
        (theme) => theme.colors.background,
        (bg) => ({ view: { backgroundColor: bg } }),
      );

      const useTextStyles = createThemedStyles<
        typeof themes.light.colors,
        { base: { color: string } },
        Themes
      >(
        (theme) => theme.colors,
        (colors) => ({ base: { color: colors.text } }),
      );

      const useHomeStyles = createThemedStyles<
        string,
        { button: { backgroundColor: string } },
        Themes
      >(
        (theme) => theme.colors.tint,
        (tint) => ({ button: { backgroundColor: tint } }),
      );

      const useSpacingStyles = createThemedStyles<
        typeof themes.light.spacing,
        { box: { padding: number } },
        Themes
      >(
        (theme) => theme.spacing,
        (spacing) => ({ box: { padding: spacing.md } }),
      );

      const useBorderRadiusStyles = createThemedStyles<
        typeof themes.light.borderRadius,
        { card: { borderRadius: number } },
        Themes
      >(
        (theme) => theme.borderRadius,
        (br) => ({ card: { borderRadius: br.md } }),
      );

      const COLOR_VIEWS = 20;
      const COLOR_TEXTS = 40;
      const SPACING_ONLY = 30;
      const BORDER_RADIUS_ONLY = 20;
      const TOGGLE_FN_ONLY = 15;

      const viewSpies = Array.from({ length: COLOR_VIEWS }, () =>
        createRenderCounter(),
      );
      const textSpies = Array.from({ length: COLOR_TEXTS }, () =>
        createRenderCounter(),
      );
      const spacingSpies = Array.from({ length: SPACING_ONLY }, () =>
        createRenderCounter(),
      );
      const borderRadiusSpies = Array.from({ length: BORDER_RADIUS_ONLY }, () =>
        createRenderCounter(),
      );
      const toggleFnSpies = Array.from({ length: TOGGLE_FN_ONLY }, () =>
        createRenderCounter(),
      );
      const homeScreenRender = createRenderCounter();
      const tabLayoutRender = createRenderCounter();
      const rootNavRender = createRenderCounter();
      let toggleTheme: (() => void) | undefined;

      function MockThemedView({ index }: { index: number }) {
        viewSpies[index]!.spy();
        useViewStyles();
        return null;
      }

      function MockThemedText({ index }: { index: number }) {
        textSpies[index]!.spy();
        useTextStyles();
        return null;
      }

      function MockSpacingOnly({ index }: { index: number }) {
        spacingSpies[index]!.spy();
        useSpacingStyles();
        return null;
      }

      function MockBorderRadiusOnly({ index }: { index: number }) {
        borderRadiusSpies[index]!.spy();
        useBorderRadiusStyles();
        return null;
      }

      function MockToggleFnOnly({ index }: { index: number }) {
        toggleFnSpies[index]!.spy();
        useThemeSelector<Themes, () => void>((ctx) => ctx.toggleTheme);
        return null;
      }

      function MockHomeScreen() {
        homeScreenRender.spy();
        useHomeStyles();
        useThemeSelector<Themes, keyof Themes>((ctx) => ctx.themeName);
        toggleTheme = useThemeSelector<Themes, () => void>(
          (ctx) => ctx.toggleTheme,
        );
        return null;
      }

      function MockTabLayout() {
        tabLayoutRender.spy();
        useThemeSelector<Themes, string>((ctx) => ctx.theme.colors.tint);
        return null;
      }

      function MockRootNavigator() {
        rootNavRender.spy();
        useThemeSelector<Themes, keyof Themes>((ctx) => ctx.themeName);
        return null;
      }

      act(() => {
        render(
          <ThemeProvider themes={themes} initialTheme="light">
            <MockRootNavigator />
            <MockTabLayout />
            <MockHomeScreen />
            {Array.from({ length: COLOR_VIEWS }, (_, i) => (
              <MockThemedView key={`v-${i}`} index={i} />
            ))}
            {Array.from({ length: COLOR_TEXTS }, (_, i) => (
              <MockThemedText key={`t-${i}`} index={i} />
            ))}
            {Array.from({ length: SPACING_ONLY }, (_, i) => (
              <MockSpacingOnly key={`s-${i}`} index={i} />
            ))}
            {Array.from({ length: BORDER_RADIUS_ONLY }, (_, i) => (
              <MockBorderRadiusOnly key={`br-${i}`} index={i} />
            ))}
            {Array.from({ length: TOGGLE_FN_ONLY }, (_, i) => (
              <MockToggleFnOnly key={`tf-${i}`} index={i} />
            ))}
          </ThemeProvider>,
        );
      });

      const totalComponents =
        COLOR_VIEWS +
        COLOR_TEXTS +
        SPACING_ONLY +
        BORDER_RADIUS_ONLY +
        TOGGLE_FN_ONLY +
        3;

      const countsAfterMount = {
        views: viewSpies.map((s) => s.count),
        texts: textSpies.map((s) => s.count),
        spacings: spacingSpies.map((s) => s.count),
        borderRadii: borderRadiusSpies.map((s) => s.count),
        toggleFns: toggleFnSpies.map((s) => s.count),
        home: homeScreenRender.count,
        tab: tabLayoutRender.count,
        root: rootNavRender.count,
      };

      act(() => {
        toggleTheme?.();
      });

      let reRenderedCount = 0;
      let stableCount = 0;

      for (let i = 0; i < COLOR_VIEWS; i++) {
        const delta = viewSpies[i]!.count - countsAfterMount.views[i]!;
        expect(
          delta,
          `view ${i} should re-render (colors changed)`,
        ).toBeGreaterThan(0);
        reRenderedCount += delta;
      }
      for (let i = 0; i < COLOR_TEXTS; i++) {
        const delta = textSpies[i]!.count - countsAfterMount.texts[i]!;
        expect(
          delta,
          `text ${i} should re-render (colors changed)`,
        ).toBeGreaterThan(0);
        reRenderedCount += delta;
      }
      for (let i = 0; i < SPACING_ONLY; i++) {
        const delta = spacingSpies[i]!.count - countsAfterMount.spacings[i]!;
        expect(delta, `spacing ${i} should NOT re-render (shared ref)`).toBe(0);
        stableCount++;
      }
      for (let i = 0; i < BORDER_RADIUS_ONLY; i++) {
        const delta =
          borderRadiusSpies[i]!.count - countsAfterMount.borderRadii[i]!;
        expect(
          delta,
          `border-radius ${i} should NOT re-render (shared ref)`,
        ).toBe(0);
        stableCount++;
      }
      for (let i = 0; i < TOGGLE_FN_ONLY; i++) {
        const delta = toggleFnSpies[i]!.count - countsAfterMount.toggleFns[i]!;
        expect(
          delta,
          `toggleFn ${i} should NOT re-render (stable fn ref)`,
        ).toBe(0);
        stableCount++;
      }

      reRenderedCount += homeScreenRender.count - countsAfterMount.home;
      reRenderedCount += tabLayoutRender.count - countsAfterMount.tab;
      reRenderedCount += rootNavRender.count - countsAfterMount.root;

      const naiveReRenders = totalComponents;
      const actualReRenders = reRenderedCount;
      const savedReRenders = naiveReRenders - actualReRenders;

      expect(stableCount).toBe(
        SPACING_ONLY + BORDER_RADIUS_ONLY + TOGGLE_FN_ONLY,
      );
      expect(savedReRenders).toBe(stableCount);
      expect(actualReRenders).toBeLessThan(naiveReRenders);
    });
  });

  describe("selector equality function", () => {
    it("custom equality function prevents re-render when values are logically equal", () => {
      const consumer = createRenderCounter();
      let toggleTheme: (() => void) | undefined;

      function Consumer() {
        consumer.spy();
        useThemeSelector<Themes, { bg: string }>(
          (ctx) => ({ bg: ctx.theme.colors.background }),
          (a, b) => a.bg === b.bg,
        );
        return null;
      }

      function ToggleSource() {
        toggleTheme = useThemeSelector<Themes, () => void>(
          (ctx) => ctx.toggleTheme,
        );
        return null;
      }

      const themesWithSameBg = {
        light: {
          ...themes.light,
          colors: { ...themes.light.colors, background: "#same" },
        },
        dark: {
          ...themes.dark,
          colors: { ...themes.dark.colors, background: "#same" },
        },
      };

      act(() => {
        render(
          <ThemeProvider themes={themesWithSameBg} initialTheme="light">
            <Consumer />
            <ToggleSource />
          </ThemeProvider>,
        );
      });

      const afterMount = consumer.count;

      act(() => {
        toggleTheme?.();
      });

      expect(consumer.count).toBe(afterMount);
    });

    it("without custom equality, new object reference causes re-render even with same values", () => {
      const consumer = createRenderCounter();
      let toggleTheme: (() => void) | undefined;

      function Consumer() {
        consumer.spy();
        useThemeSelector<Themes, { bg: string }>((ctx) => ({
          bg: ctx.theme.colors.background,
        }));
        return null;
      }

      function ToggleSource() {
        toggleTheme = useThemeSelector<Themes, () => void>(
          (ctx) => ctx.toggleTheme,
        );
        return null;
      }

      const themesWithSameBg = {
        light: {
          ...themes.light,
          colors: { ...themes.light.colors, background: "#same" },
        },
        dark: {
          ...themes.dark,
          colors: { ...themes.dark.colors, background: "#same" },
        },
      };

      act(() => {
        render(
          <ThemeProvider themes={themesWithSameBg} initialTheme="light">
            <Consumer />
            <ToggleSource />
          </ThemeProvider>,
        );
      });

      const afterMount = consumer.count;

      act(() => {
        toggleTheme?.();
      });

      expect(consumer.count).toBeGreaterThan(afterMount);
    });
  });
});
