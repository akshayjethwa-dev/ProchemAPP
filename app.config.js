export default {
  expo: {
    name: "Prochem Marketplace",
    slug: "prochem-app",
    version: "1.0.1",
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
      bundleIdentifier: "com.prochem.app" // Recommended to match Android package
    },
    android: {
      package: "com.prochem.app", // Updated to be slightly more unique
      versionCode: 1, // ✅ ADDED: Mandatory integer for Google Play updates
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
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    extra: {
      eas: {
        projectId: "7a075ff7-f9b3-47cf-ab49-523d173d19ae"
      }
    }
  }
};