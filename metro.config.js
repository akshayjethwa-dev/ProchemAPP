// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add support for modern ES modules
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs', 'cjs'];

// Force Metro to resolve specific problematic imports
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // 1. Handle Zustand CommonJS resolution
  if (moduleName === 'zustand' || moduleName.startsWith('zustand/')) {
    return {
      filePath: require.resolve(moduleName),
      type: 'sourceFile',
    };
  }
  
  // 2. FIX: Handle Cashfree SDK's missing package.json import
  if (moduleName === '../package.json' && context.originModulePath.includes('react-native-cashfree-pg-sdk')) {
    return {
      filePath: path.join(__dirname, 'node_modules', 'react-native-cashfree-pg-sdk', 'package.json'),
      type: 'sourceFile',
    };
  }

  // Otherwise chain to the standard Metro resolver
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;