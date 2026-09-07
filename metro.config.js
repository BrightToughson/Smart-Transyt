const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(
  (function () {
    const configWithAlias = { ...config };
    const originalResolveRequest = configWithAlias.resolver.resolveRequest;

    configWithAlias.resolver.resolveRequest = (context, moduleName, platform) => {
      if (platform === 'web' && moduleName === 'react-native/Libraries/Utilities/codegenNativeComponent') {
        return {
          filePath: require.resolve('./shim.js'),
          type: 'sourceFile',
        };
      }
      return originalResolveRequest
        ? originalResolveRequest(context, moduleName, platform)
        : context.resolveRequest(context, moduleName, platform);
    };

    return configWithAlias;
  })(),
  { input: './src/global.css' }
);
