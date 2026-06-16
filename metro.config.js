const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

config.maxWorkers = 1;

const wrappedConfig = withNativeWind(config, { input: './src/global.css' });

// pnpm resolves symlinks to real paths (node_modules/.pnpm/pkg@ver/node_modules/pkg/...)
// so the simple "node_modules/(?!(react-native|...))" pattern misses them because the
// first segment after node_modules/ is ".pnpm", not "react-native".
// The second alternative ".*/node_modules/(pkg)" catches the nested pnpm structure.
const t = [
  'react-native', '@react-native', 'expo', '@expo',
  'nativewind', 'react-native-svg', 'react-native-reanimated',
  'react-native-screens', 'react-native-safe-area-context',
  'react-native-gesture-handler', 'react-native-worklets',
  'react-native-css-interop', '@react-navigation',
].join('|');

wrappedConfig.transformer.transformIgnorePatterns = [
  `node_modules/(?!(${t})|.*/node_modules/(${t}))`,
];

module.exports = wrappedConfig;
