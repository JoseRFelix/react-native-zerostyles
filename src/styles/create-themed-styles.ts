import { StyleSheet } from "react-native";
import type { AppTheme, ThemeMap } from "./themes";
import { useThemeSelector, type ThemeContextValue } from "./theme-provider";

const objectIs = Object.is;
const MAX_STYLE_CACHE_ENTRIES = 8;

type StyleCacheEntry<Selected, Styles> = {
  selected: Selected;
  styles: Styles;
};

function isObjectLike(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function shallowEqual(left: unknown, right: unknown) {
  if (objectIs(left, right)) {
    return true;
  }

  const leftIsArray = Array.isArray(left);
  const rightIsArray = Array.isArray(right);

  if (leftIsArray || rightIsArray) {
    if (!leftIsArray || !rightIsArray) {
      return false;
    }

    if (left.length !== right.length) {
      return false;
    }

    for (let index = 0; index < left.length; index += 1) {
      const leftHasValue = Object.prototype.hasOwnProperty.call(left, index);

      if (
        leftHasValue !== Object.prototype.hasOwnProperty.call(right, index) ||
        (leftHasValue && !objectIs(left[index], right[index]))
      ) {
        return false;
      }
    }

    return true;
  }

  if (!isObjectLike(left) || !isObjectLike(right)) {
    return false;
  }

  if (Object.getPrototypeOf(left) !== Object.getPrototypeOf(right)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(left);

  if (prototype !== Object.prototype && prototype !== null) {
    return false;
  }

  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);

  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  return leftKeys.every(
    (key) =>
      Object.prototype.hasOwnProperty.call(right, key) &&
      objectIs(left[key], right[key]),
  );
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
  const factory =
    maybeFactory ??
    (selectorOrFactory as unknown as (selected: Selected) => Styles);
  const compareSelected =
    equalityFn ??
    (maybeFactory
      ? (shallowEqual as (left: Selected, right: Selected) => boolean)
      : (objectIs as (left: Selected, right: Selected) => boolean));
  const styleCache: Array<StyleCacheEntry<Selected, Styles>> = [];
  let hasLastTheme = false;
  let lastTheme: AppTheme<TThemes> | undefined;
  let lastStyles: Styles | undefined;

  const getOrCreateStyles = (selected: Selected) => {
    let cachedIndex = -1;

    for (let index = styleCache.length - 1; index >= 0; index -= 1) {
      if (compareSelected(styleCache[index]!.selected, selected)) {
        cachedIndex = index;
        break;
      }
    }

    if (cachedIndex >= 0) {
      const cachedEntry = styleCache[cachedIndex]!;

      if (cachedIndex !== styleCache.length - 1) {
        styleCache.splice(cachedIndex, 1);
        styleCache.push(cachedEntry);
      }

      return cachedEntry.styles;
    }

    const styles = StyleSheet.create(factory(selected));
    styleCache.push({ selected, styles });

    if (styleCache.length > MAX_STYLE_CACHE_ENTRIES) {
      styleCache.shift();
    }

    return styles;
  };

  const selectStyles = (context: ThemeContextValue<TThemes>) => {
    if (hasLastTheme && objectIs(lastTheme, context.theme)) {
      return lastStyles!;
    }

    const styles = getOrCreateStyles(selector(context.theme));
    hasLastTheme = true;
    lastTheme = context.theme;
    lastStyles = styles;
    return styles;
  };

  return function useStyles(): Styles {
    return useThemeSelector<TThemes, Styles>(selectStyles);
  };
}
