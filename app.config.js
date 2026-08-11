import { withAndroidManifest } from '@expo/config-plugins';

// 👇 CUSTOM PLUGIN TO FIX ANDROID 11+ UPI PACKAGE VISIBILITY (Android only)
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
    
    scheme: "prochem", // Deep link scheme
    
    orientation: "default",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    
    // EAS Update configuration
    updates: {
      url: "https://u.expo.dev/7a075ff7-f9b3-47cf-ab49-523d173d19ae"
    },
    runtimeVersion: {
      policy: "appVersion"
    },

    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },

    // ========== iOS CONFIGURATION ==========
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.prochemapp.prochem", // Must match your App ID in Apple Developer
      
      // Firebase iOS config file (must be placed in the project root)
      googleServicesFile: "./GoogleService-Info.plist",

      // Universal Links – allows your app to open from https://app.prochemapp.com
      associatedDomains: [
        "applinks:app.prochemapp.com"
      ],
      
      // Allow iOS to open external UPI payment apps
      infoPlist: {
        LSApplicationQueriesSchemes: [
          "tez",      // Google Pay
          "phonepe",  // PhonePe
          "paytmmp",  // Paytm
          "bhim",     // BHIM
          "upi"       // Generic UPI
        ],
        // ✅ ADDED: Encryption exemption declaration
        "ITSAppUsesNonExemptEncryption": false
      }
    },
    // ===================================================

    android: {
      package: "com.prochem.app",
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON || "./google-services.json",
      compileSdkVersion: 34,
      targetSdkVersion: 34,
      
      intentFilters: [
        // Handle UPI schemes (Android)
        {
          action: "VIEW",
          data: [
            { scheme: "upi" },
            { scheme: "tez" },
            { scheme: "phonepe" },
            { scheme: "paytmmp" }
          ]
        },
        // Handle deep links from https://app.prochemapp.com (Android)
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            { scheme: "https", host: "app.prochemapp.com", pathPrefix: "/negotiation" },
            { scheme: "https", host: "app.prochemapp.com", pathPrefix: "/orders" }
          ],
          category: ["BROWSABLE", "DEFAULT"]
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
    },

    // Plugins – important for Firebase and static frameworks
    plugins: [
      "@react-native-firebase/app",
      [
        "expo-build-properties",
        {
          ios: {
            useFrameworks: "static", // Required for Firebase on iOS
            forceStaticLinking: [
              "RNFBApp",
              "RNFBAuth",
              "RNFBFirestore",
            ],
          }
        }
      ]
    ]
  };

  // Apply the Android-only UPI plugin (does not affect iOS)
  return withUPIIntents(baseConfig);
};