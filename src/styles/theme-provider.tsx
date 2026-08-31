import React, {
  createContext,
  useContext,
  useDebugValue,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import type { AppTheme, ThemeMap, ThemeName } from "./themes";

type BaseThemeMap = Record<string, object>;

type SelectorInstance<Selected> = {
  hasValue: boolean;
  value: Selected | undefined;
};

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
    if (controlledThemeName === undefined) {
      const previousThemeName = snapshot.themeName;
      setSnapshot(name);

      if (snapshot.themeName !== previousThemeName) {
        onThemeChange?.(snapshot.themeName);
      }

      return;
    }

    const nextThemeName = getActiveThemeName(
      currentThemes,
      currentThemeNames,
      name,
    );

    if (nextThemeName === snapshot.themeName) {
      return;
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

// Follows React's official useSyncExternalStoreWithSelector algorithm. Its
// memoization state lives inside a render-local closure instead of a ref shared
// by concurrent render copies.
function useExternalStoreSelector<Snapshot, Selected>(
  subscribe: (listener: () => void) => () => void,
  getSnapshot: () => Snapshot,
  selector: (snapshot: Snapshot) => Selected,
  equalityFn?: ThemeSelectorEqualityFn<Selected>,
) {
  const instanceRef = useRef<SelectorInstance<Selected> | null>(null);

  if (instanceRef.current === null) {
    instanceRef.current = { hasValue: false, value: undefined };
  }

  const instance = instanceRef.current;
  const getSelection = useMemo(() => {
    let hasMemo = false;
    let memoizedSnapshot: Snapshot;
    let memoizedSelection: Selected;

    return () => {
      const nextSnapshot = getSnapshot();

      if (!hasMemo) {
        hasMemo = true;
        memoizedSnapshot = nextSnapshot;

        const nextSelection = selector(nextSnapshot);

        if (
          equalityFn &&
          instance.hasValue &&
          equalityFn(instance.value as Selected, nextSelection)
        ) {
          memoizedSelection = instance.value as Selected;
          return memoizedSelection;
        }

        memoizedSelection = nextSelection;
        return nextSelection;
      }

      if (Object.is(memoizedSnapshot, nextSnapshot)) {
        return memoizedSelection;
      }

      const nextSelection = selector(nextSnapshot);

      if (equalityFn && equalityFn(memoizedSelection, nextSelection)) {
        memoizedSnapshot = nextSnapshot;
        return memoizedSelection;
      }

      memoizedSnapshot = nextSnapshot;
      memoizedSelection = nextSelection;
      return nextSelection;
    };
  }, [equalityFn, getSnapshot, instance, selector]);

  const selection = useSyncExternalStore(subscribe, getSelection, getSelection);

  useEffect(() => {
    instance.hasValue = true;
    instance.value = selection;
  }, [instance, selection]);

  useDebugValue(selection);
  return selection;
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
  const syncInputsRef = useRef({
    themes,
    themeNames,
    themeName,
    onThemeChange,
  });

  useLayoutEffect(() => {
    const previousInputs = syncInputsRef.current;

    if (
      previousInputs.themes === themes &&
      previousInputs.themeNames === themeNames &&
      previousInputs.themeName === themeName &&
      previousInputs.onThemeChange === onThemeChange
    ) {
      return;
    }

    syncInputsRef.current = {
      themes,
      themeNames,
      themeName,
      onThemeChange,
    };

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
  return useExternalStoreSelector(
    store.subscribe,
    store.getSnapshot as unknown as () => ThemeContextValue<TThemes>,
    selector,
    equalityFn,
  );
}

export function useTheme<TThemes extends BaseThemeMap = ThemeMap>() {
  const store = useThemeStore();

  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  ) as unknown as ThemeContextValue<TThemes>;
}
