module.exports = function (api) {
  api.cache(true);

  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
    plugins: [
      [
        'react-native-unistyles/plugin',
        {
          root: 'components',
          autoProcessImports: ['react-native-unistyles'],
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};
