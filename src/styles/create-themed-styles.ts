import { useMemo } from "react";
import { StyleSheet } from "react-native";
import type { AppTheme, ThemeMap } from "./themes";
import { useThemeSelector } from "./theme-provider";

const objectIs = Object.is;
export const THEMED_STYLES_CACHE_LIMIT = 32;

type CachedStylesEntry<Selected, Styles> = {
  selected: Selected;
  styles: Styles;
  active: boolean;
};

function isObjectLike(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function shallowEqual(left: unknown, right: unknown) {
  if (objectIs(left, right)) {
    return true;
  }

  if (Array.isArray(left) && Array.isArray(right)) {
    if (left.length !== right.length) {
      return false;
    }

    return left.every((value, index) => objectIs(value, right[index]));
  }

  if (!isObjectLike(left) || !isObjectLike(right)) {
    return false;
  }

  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);

  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  return leftKeys.every(
    (key) => Object.prototype.hasOwnProperty.call(right, key) && objectIs(left[key], right[key]),
  );
}

function createStylesCache<Selected, Styles extends StyleSheet.NamedStyles<Styles>>(
  factory: (selected: Selected) => Styles,
  equalityFn: (left: Selected, right: Selected) => boolean,
) {
  const objectCache = new WeakMap<object, CachedStylesEntry<Selected, Styles>>();
  const primitiveCache = new Map<Selected, CachedStylesEntry<Selected, Styles>>();
  const entries: Array<CachedStylesEntry<Selected, Styles>> = [];

  const storeCachedEntry = (selected: Selected, entry: CachedStylesEntry<Selected, Styles>) => {
    if (isObjectLike(selected)) {
      objectCache.set(selected, entry);
      return;
    }

    primitiveCache.set(selected, entry);
  };

  const deleteCachedEntry = (selected: Selected) => {
    if (isObjectLike(selected)) {
      const cachedEntry = objectCache.get(selected);

      if (cachedEntry) {
        cachedEntry.active = false;
      }

      return;
    }

    primitiveCache.delete(selected);
  };

  const moveToMostRecent = (entry: CachedStylesEntry<Selected, Styles>) => {
    const entryIndex = entries.indexOf(entry);

    if (entryIndex <= -1 || entryIndex === entries.length - 1) {
      return;
    }

    entries.splice(entryIndex, 1);
    entries.push(entry);
  };

  const evictLeastRecentlyUsed = () => {
    if (entries.length < THEMED_STYLES_CACHE_LIMIT) {
      return;
    }

    const oldestEntry = entries.shift();

    if (!oldestEntry) {
      return;
    }

    deleteCachedEntry(oldestEntry.selected);
  };

  return (selected: Selected): Styles => {
    if (isObjectLike(selected)) {
      const cachedEntry = objectCache.get(selected);

      if (cachedEntry?.active) {
        moveToMostRecent(cachedEntry);
        return cachedEntry.styles;
      }
    } else {
      const cachedEntry = primitiveCache.get(selected);

      if (cachedEntry !== undefined) {
        moveToMostRecent(cachedEntry);
        return cachedEntry.styles;
      }
    }

    const matchingEntry = entries.find(
      (entry) => entry.active && equalityFn(entry.selected, selected),
    );

    if (matchingEntry) {
      storeCachedEntry(selected, matchingEntry);
      moveToMostRecent(matchingEntry);
      return matchingEntry.styles;
    }

    const styles = StyleSheet.create(factory(selected)) as Styles;
    const nextEntry = {
      selected,
      styles,
      active: true,
    };

    evictLeastRecentlyUsed();
    entries.push(nextEntry);
    storeCachedEntry(selected, nextEntry);

    return styles;
  };
}

export function createThemedStyles<
  const Styles extends StyleSheet.NamedStyles<Styles>,
  TThemes extends Record<string, object> = ThemeMap,
>(factory: (theme: AppTheme<TThemes>) => Styles): () => Styles;

export function createThemedStyles<
  Selected,
  const Styles extends StyleSheet.NamedStyles<Styles>,
  TThemes extends Record<string, object> = ThemeMap,
>(
  selector: (theme: AppTheme<TThemes>) => Selected,
  factory: (selected: Selected) => Styles,
): () => Styles;

export function createThemedStyles<
  Selected,
  const Styles extends StyleSheet.NamedStyles<Styles>,
  TThemes extends Record<string, object> = ThemeMap,
>(
  selector: (theme: AppTheme<TThemes>) => Selected,
  factory: (selected: Selected) => Styles,
  equalityFn: (left: Selected, right: Selected) => boolean,
): () => Styles;

export function createThemedStyles<
  Selected,
  const Styles extends StyleSheet.NamedStyles<Styles>,
  TThemes extends Record<string, object> = ThemeMap,
>(
  selectorOrFactory:
    | ((theme: AppTheme<TThemes>) => Selected)
    | ((theme: AppTheme<TThemes>) => Styles),
  maybeFactory?: (selected: Selected) => Styles,
  equalityFn?: (left: Selected, right: Selected) => boolean,
): () => Styles {
  const selector = maybeFactory
    ? (selectorOrFactory as (theme: AppTheme<TThemes>) => Selected)
    : (theme: AppTheme<TThemes>) => theme as Selected;
  const factory = maybeFactory ?? (selectorOrFactory as unknown as (selected: Selected) => Styles);
  const compareSelected =
    equalityFn ??
    (maybeFactory
      ? (shallowEqual as (left: Selected, right: Selected) => boolean)
      : (objectIs as (left: Selected, right: Selected) => boolean));
  const getCachedStyles = createStylesCache(factory, compareSelected);

  return function useStyles(): Styles {
    const selected = useThemeSelector<TThemes, Selected>(
      (context) => selector(context.theme),
      compareSelected,
    );

    return useMemo<Styles>(() => getCachedStyles(selected), [selected]);
  };
}
