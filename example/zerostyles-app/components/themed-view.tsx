import { View, type ViewProps } from 'react-native';
import { createThemedStyles, useThemeSelector } from 'react-native-zerostyles';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
};

export function ThemedView({
  style,
  lightColor,
  darkColor,
  ...otherProps
}: ThemedViewProps) {
  const styles = useThemedViewStyles();
  const backgroundColorOverride = useThemeSelector((context) => {
    if (context.themeName === 'light') {
      return lightColor;
    }

    return darkColor;
  });

  return (
    <View
      style={[
        styles.view,
        backgroundColorOverride
          ? { backgroundColor: backgroundColorOverride }
          : undefined,
        style,
      ]}
      {...otherProps}
    />
  );
}

const useThemedViewStyles = createThemedStyles(
  (theme) => theme.colors.background,
  (backgroundColor) => ({
    view: {
      backgroundColor,
    },
  }),
);
