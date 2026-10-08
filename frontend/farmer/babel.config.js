// Babel config for the ApnaDairy Farmer Expo app.
// NativeWind v4: 'nativewind/babel' is a PRESET (not a plugin) — it wires
// the className transform (react-native-css-interop) plus the JSX runtime.
// jsxImportSource: 'nativewind' keeps babel-preset-expo's JSX transform
// aligned with NativeWind's runtime.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
  };
};
