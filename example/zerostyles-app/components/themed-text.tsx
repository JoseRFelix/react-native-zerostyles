import { Text, type TextProps } from 'react-native';
import { createThemedStyles, useThemeSelector } from 'react-native-zerostyles';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const styles = useThemedTextStyles();
  const colorOverride = useThemeSelector((context) => {
    if (context.themeName === 'light') {
      return lightColor;
    }

    return darkColor;
  });

  return (
    <Text
      style={[
        styles.base,
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? styles.link : undefined,
        colorOverride ? { color: colorOverride } : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const useThemedTextStyles = createThemedStyles(
  (theme) => theme.colors,
  (colors) => ({
    base: {
      color: colors.text,
    },
    default: {
      fontSize: 16,
      lineHeight: 24,
    },
    defaultSemiBold: {
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '600',
    },
    title: {
      fontSize: 32,
      fontWeight: 'bold',
      lineHeight: 32,
    },
    subtitle: {
      fontSize: 20,
      fontWeight: 'bold',
    },
    link: {
      lineHeight: 30,
      fontSize: 16,
      color: colors.tint,
    },
  }),
);
