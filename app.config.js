// File: app.config.js
import 'dotenv/config'; // 👈 loads .env when EAS CLI runs this in a subprocess
import { withAndroidManifest } from '@expo/config-plugins';

// 👇 CUSTOM PLUGIN TO FIX ANDROID 11+ UPI PACKAGE VISIBILITY (Android only)
const withUPIIntents = (config) => {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;

    // Ensure the queries array exists
    if (!androidManifest.manifest.queries) {
      androidManifest.manifest.queries = [];
    }

    // Prevent duplicate schemes if the plugin runs more than once
    const existingSchemes = new Set(
      androidManifest.manifest.queries.flatMap((q) =>
        (q.intent || []).flatMap((i) =>
          (i.data || [])
            .map((d) => d?.$?.['android:scheme'])
            .filter(Boolean)
        )
      )
    );

    const upiSchemes = ['upi', 'tez', 'paytmmp', 'phonepe'];

    const newIntents = upiSchemes
      .filter((scheme) => !existingSchemes.has(scheme))
      .map((scheme) => ({
        action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
        data: [{ $: { 'android:scheme': scheme } }],
      }));

    if (newIntents.length > 0) {
      androidManifest.manifest.queries.push({ intent: newIntents });
    }

    return config;
  });
};

export default ({ config }) => {
  return {
    ...config,
    name: 'Prochem Marketplace',
    slug: 'prochem-app',
    version: '2.1.2',

    scheme: 'prochem',

    orientation: 'default',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: true,

    updates: {
      url: 'https://u.expo.dev/7a075ff7-f9b3-47cf-ab49-523d173d19ae',
    },
    runtimeVersion: {
      policy: 'appVersion',
    },

    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },

    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.prochemapp.prochem',
      googleServicesFile: './GoogleService-Info.plist',
      associatedDomains: ['applinks:app.prochemapp.com'],
      infoPlist: {
        LSApplicationQueriesSchemes: ['tez', 'phonepe', 'paytmmp', 'bhim', 'upi'],
        ITSAppUsesNonExemptEncryption: false,
      },
    },

    android: {
      package: 'com.prochem.app',
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      googleServicesFile:
        process.env.GOOGLE_SERVICES_JSON || './google-services.json',
      compileSdkVersion: 34,
      targetSdkVersion: 34,
      intentFilters: [
        {
          action: 'VIEW',
          data: [
            { scheme: 'upi' },
            { scheme: 'tez' },
            { scheme: 'phonepe' },
            { scheme: 'paytmmp' },
          ],
        },
        {
          action: 'VIEW',
          autoVerify: true,
          data: [
            { scheme: 'https', host: 'app.prochemapp.com', pathPrefix: '/negotiation' },
            { scheme: 'https', host: 'app.prochemapp.com', pathPrefix: '/orders' },
          ],
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
    },

    web: {
      favicon: './assets/favicon.png',
    },

    extra: {
      clientId: process.env.EXPO_PUBLIC_JUSPAY_CLIENT_ID || '',
      eas: {
        projectId: '7a075ff7-f9b3-47cf-ab49-523d173d19ae',
      },
      juspay: {
        merchantId: process.env.EXPO_PUBLIC_JUSPAY_MERCHANT_ID || '',
        clientId: process.env.EXPO_PUBLIC_JUSPAY_CLIENT_ID || '',
        environment: process.env.EXPO_PUBLIC_JUSPAY_ENVIRONMENT || 'production',
        apiUrl:
          process.env.EXPO_PUBLIC_JUSPAY_API_URL ||
          'https://api.dbs.bank.in/session',
      },
    },

    plugins: [
      "expo-font",
      '@react-native-firebase/app',
      [
        'expo-build-properties',
        {
          ios: {
            useFrameworks: 'static',
            forceStaticLinking: ['RNFBApp', 'RNFBAuth', 'RNFBFirestore'],
          },
        },
      ],
      'hyper-sdk-expo-plugin',
      withUPIIntents, // 👈 plugin registered here (NOT called)
    ],
  };
};