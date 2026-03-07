import { useMemo } from "react";
import { StyleSheet } from "react-native";
import type { AppTheme, ThemeMap } from "./themes";
import { useThemeSelector } from "./theme-provider";

const objectIs = Object.is;

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

  return function useStyles(): Styles {
    const selected = useThemeSelector<TThemes, Selected>(
      (context) => selector(context.theme),
      compareSelected,
    );

    return useMemo<Styles>(
      () => StyleSheet.create(factory(selected)),
      [selected],
    );
  };
}
