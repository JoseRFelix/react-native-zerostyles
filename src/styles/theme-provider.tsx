import React, {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import type { AppTheme, ThemeMap, ThemeName } from "./themes";

type BaseThemeMap = Record<string, object>;

export type ThemeContextValue<TThemes extends BaseThemeMap = ThemeMap> = {
  theme: AppTheme<TThemes>;
  themes: TThemes;
  themeName: ThemeName<TThemes>;
  setThemeName: (name: ThemeName<TThemes>) => void;
  setTheme: (name: ThemeName<TThemes>) => void;
  toggleTheme: () => void;
};

export type ThemeSelector<
  TThemes extends BaseThemeMap = ThemeMap,
  Selected = unknown,
> = (value: ThemeContextValue<TThemes>) => Selected;

export type ThemeSelectorEqualityFn<Selected = unknown> = (
  previous: Selected,
  next: Selected,
) => boolean;

type ThemeProviderBaseProps<TThemes extends BaseThemeMap> = {
  themes: TThemes;
  children: React.ReactNode;
  onThemeChange?: (name: ThemeName<TThemes>) => void;
};

export type ThemeProviderProps<TThemes extends BaseThemeMap = ThemeMap> =
  ThemeProviderBaseProps<TThemes> &
    (
      | {
          initialTheme: ThemeName<TThemes>;
          themeName?: never;
        }
      | {
          initialTheme?: never;
          themeName: ThemeName<TThemes>;
        }
    );

type InternalThemeContextValue = {
  theme: object;
  themes: BaseThemeMap;
  themeName: string;
  setThemeName: (name: string) => void;
  setTheme: (name: string) => void;
  toggleTheme: () => void;
};

type ThemeStore = {
  getSnapshot: () => InternalThemeContextValue;
  subscribe: (listener: () => void) => () => void;
  sync: (
    themes: BaseThemeMap,
    themeNames: string[],
    controlledThemeName: string | undefined,
    onThemeChange: ((name: string) => void) | undefined,
  ) => void;
};

const ThemeContext = createContext<ThemeStore | null>(null);

function getActiveThemeName(
  themes: BaseThemeMap,
  themeNames: string[],
  requestedThemeName: string,
) {
  if (themes[requestedThemeName]) {
    return requestedThemeName;
  }

  return themeNames[0] ?? requestedThemeName;
}

function createThemeStore(
  themes: BaseThemeMap,
  themeNames: string[],
  initialTheme: string,
  initialControlledThemeName: string | undefined,
  initialOnThemeChange: ((name: string) => void) | undefined,
): ThemeStore {
  const listeners = new Set<() => void>();

  let currentThemes = themes;
  let currentThemeNames = themeNames;
  let controlledThemeName = initialControlledThemeName;
  let onThemeChange = initialOnThemeChange;

  const notify = () => {
    listeners.forEach((listener) => {
      listener();
    });
  };

  const buildSnapshot = (
    requestedThemeName: string,
    previousSnapshot?: InternalThemeContextValue,
  ): InternalThemeContextValue => {
    const activeThemeName = getActiveThemeName(
      currentThemes,
      currentThemeNames,
      requestedThemeName,
    );
    const theme = currentThemes[activeThemeName];

    if (
      previousSnapshot &&
      previousSnapshot.theme === theme &&
      previousSnapshot.themes === currentThemes &&
      previousSnapshot.themeName === activeThemeName
    ) {
      return previousSnapshot;
    }

    return {
      theme,
      themes: currentThemes,
      themeName: activeThemeName,
      setThemeName,
      setTheme: setThemeName,
      toggleTheme,
    };
  };

  const setSnapshot = (requestedThemeName: string) => {
    const nextSnapshot = buildSnapshot(requestedThemeName, snapshot);

    if (nextSnapshot === snapshot) {
      return;
    }

    snapshot = nextSnapshot;
    notify();
  };

  const setThemeName = (name: string) => {
    const nextThemeName = getActiveThemeName(
      currentThemes,
      currentThemeNames,
      name,
    );

    if (nextThemeName === snapshot.themeName) {
      return;
    }

    if (controlledThemeName === undefined) {
      setSnapshot(nextThemeName);
    }

    onThemeChange?.(nextThemeName);
  };

  const toggleTheme = () => {
    if (currentThemeNames.length < 2) {
      return;
    }

    const currentIndex = currentThemeNames.indexOf(snapshot.themeName);
    const nextIndex = (currentIndex + 1) % currentThemeNames.length;
    const nextThemeName = currentThemeNames[nextIndex] ?? currentThemeNames[0];

    setThemeName(nextThemeName);
  };

  let snapshot = buildSnapshot(controlledThemeName ?? initialTheme);

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    sync: (
      nextThemes,
      nextThemeNames,
      nextControlledThemeName,
      nextOnThemeChange,
    ) => {
      currentThemes = nextThemes;
      currentThemeNames = nextThemeNames;
      controlledThemeName = nextControlledThemeName;
      onThemeChange = nextOnThemeChange;

      const nextSnapshot = buildSnapshot(
        controlledThemeName ?? snapshot.themeName,
        snapshot,
      );

      if (nextSnapshot === snapshot) {
        return;
      }

      snapshot = nextSnapshot;
      notify();
    },
  };
}

function useThemeStore() {
  const store = useContext(ThemeContext);

  if (!store) {
    throw new Error("Theme hooks must be used within ThemeProvider");
  }

  return store;
}

export function ThemeProvider<const TThemes extends BaseThemeMap>({
  themes,
  initialTheme,
  themeName,
  onThemeChange,
  children,
}: ThemeProviderProps<TThemes>) {
  const themeNames = useMemo(
    () => Object.keys(themes) as Array<ThemeName<TThemes>>,
    [themes],
  );

  if (themeNames.length === 0) {
    throw new Error("ThemeProvider requires at least one theme");
  }

  if (initialTheme !== undefined && themeName !== undefined) {
    throw new Error(
      "ThemeProvider accepts either initialTheme or themeName, but not both",
    );
  }

  const activeThemeName = themeName ?? initialTheme;

  if (activeThemeName === undefined) {
    throw new Error("ThemeProvider requires initialTheme or themeName");
  }

  if (!themeNames.includes(activeThemeName)) {
    const propName = themeName === undefined ? "initialTheme" : "themeName";
    throw new Error(
      `ThemeProvider ${propName} "${activeThemeName}" is not registered`,
    );
  }

  const storeRef = useRef<ThemeStore | null>(null);

  if (!storeRef.current) {
    storeRef.current = createThemeStore(
      themes,
      themeNames as string[],
      activeThemeName,
      themeName,
      onThemeChange as ((name: string) => void) | undefined,
    );
  }

  const store = storeRef.current;

  useLayoutEffect(() => {
    store.sync(
      themes,
      themeNames as string[],
      themeName,
      onThemeChange as ((name: string) => void) | undefined,
    );
  }, [onThemeChange, store, themeName, themeNames, themes]);

  return (
    <ThemeContext.Provider value={store}>{children}</ThemeContext.Provider>
  );
}

export function useThemeSelector<
  TThemes extends BaseThemeMap = ThemeMap,
  Selected = unknown,
>(
  selector: ThemeSelector<TThemes, Selected>,
  equalityFn?: ThemeSelectorEqualityFn<Selected>,
): Selected {
  const store = useThemeStore();
  const selectionRef = useRef<{
    snapshot: ThemeContextValue<TThemes>;
    selected: Selected;
  } | null>(null);

  const getSelectedSnapshot = useCallback(() => {
    const snapshot =
      store.getSnapshot() as unknown as ThemeContextValue<TThemes>;
    const cachedSelection = selectionRef.current;

    if (cachedSelection?.snapshot === snapshot) {
      return cachedSelection.selected;
    }

    const nextSelected = selector(snapshot);
    const isEqual =
      equalityFn ??
      ((previous: Selected, next: Selected) => Object.is(previous, next));

    if (cachedSelection && isEqual(cachedSelection.selected, nextSelected)) {
      selectionRef.current = {
        snapshot,
        selected: cachedSelection.selected,
      };

      return cachedSelection.selected;
    }

    selectionRef.current = {
      snapshot,
      selected: nextSelected,
    };

    return nextSelected;
  }, [equalityFn, selector, store]);

  return useSyncExternalStore(
    store.subscribe,
    getSelectedSnapshot,
    getSelectedSnapshot,
  );
}

export function useTheme<TThemes extends BaseThemeMap = ThemeMap>() {
  return useThemeSelector<TThemes, ThemeContextValue<TThemes>>(
    (context) => context,
  );
}
