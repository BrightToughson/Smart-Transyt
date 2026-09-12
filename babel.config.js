process.env.EXPO_ROUTER_DISABLE_RN_NAVIGATION_CHECK = "1";

module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: ['react-native-reanimated/plugin'],
  };
};
