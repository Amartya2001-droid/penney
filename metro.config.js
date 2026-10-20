// Learn more: https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Zustand v5's ESM middleware build reads `import.meta.env`, which crashes Metro's non-module
// web bundle with a blank page. Resolving packages through their CommonJS ("require") export
// avoids that on web and is harmless on iOS/Android.
config.resolver.unstable_conditionNames = ['browser', 'require', 'react-native'];

module.exports = config;
