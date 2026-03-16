const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add support for modern ES modules
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs', 'cjs'];

// Force Metro to resolve Zustand (and similar packages) using CommonJS
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'zustand' || moduleName.startsWith('zustand/')) {
    return {
      filePath: require.resolve(moduleName),
      type: 'sourceFile',
    };
  }
  // Otherwise chain to the standard Metro resolver
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;