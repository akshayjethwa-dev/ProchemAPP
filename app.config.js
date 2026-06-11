import { withAndroidManifest } from '@expo/config-plugins';

// 👇 CUSTOM PLUGIN TO FIX ANDROID 11+ UPI PACKAGE VISIBILITY 👇
const withUPIIntents = (config) => {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    
    // Ensure the queries array exists
    if (!androidManifest.manifest.queries) {
      androidManifest.manifest.queries = [];
    }

    // Add query intents to allow Razorpay to see installed UPI apps
    androidManifest.manifest.queries.push({
      intent: [
        {
          action: [{ $: { "android:name": "android.intent.action.VIEW" } }],
          data: [{ $: { "android:scheme": "upi" } }]
        },
        {
          action: [{ $: { "android:name": "android.intent.action.VIEW" } }],
          data: [{ $: { "android:scheme": "tez" } }] // Google Pay
        },
        {
          action: [{ $: { "android:name": "android.intent.action.VIEW" } }],
          data: [{ $: { "android:scheme": "paytmmp" } }] // Paytm
        },
        {
          action: [{ $: { "android:name": "android.intent.action.VIEW" } }],
          data: [{ $: { "android:scheme": "phonepe" } }] // PhonePe
        }
      ]
    });

    return config;
  });
};

export default ({ config }) => {
  const baseConfig = {
    ...config,
    name: "Prochem Marketplace",
    slug: "prochem-app",
    version: "2.1.2",
    orientation: "default",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    
    // 👇 ADDED FOR EAS UPDATE 👇
    updates: {
      url: "https://u.expo.dev/7a075ff7-f9b3-47cf-ab49-523d173d19ae"
    },
    runtimeVersion: {
      policy: "appVersion"
    },
    // 👆 END EAS UPDATE CONFIG 👆

    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.prochem.app", // Recommended to match Android package
      // 👇 ADDED TO ALLOW IOS TO OPEN UPI APPS 👇
      infoPlist: {
        LSApplicationQueriesSchemes: [
          "tez",      // Google Pay
          "phonepe",  // PhonePe
          "paytmmp",  // Paytm
          "bhim",     // BHIM
          "upi"       // Generic UPI
        ]
      }
    },
    android: {
      package: "com.prochem.app", // Updated to be slightly more unique
      // Removed versionCode as EAS remote versioning is handling it
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      // Reads from EAS Secret if available, otherwise uses local file
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON || "./google-services.json",
      compileSdkVersion: 34,
      targetSdkVersion: 34,
      // Note: This intentFilter makes YOUR app respond to upi:// links. 
      intentFilters: [
        {
          action: "VIEW",
          data: [
            { scheme: "upi" },
            { scheme: "tez" },
            { scheme: "phonepe" },
            { scheme: "paytmmp" }
          ]
        }
      ]
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    extra: {
      eas: {
        projectId: "7a075ff7-f9b3-47cf-ab49-523d173d19ae"
      }
    }
  };

  // ✅ Apply the custom Android UPI intent plugin to the config before exporting
  return withUPIIntents(baseConfig);
};