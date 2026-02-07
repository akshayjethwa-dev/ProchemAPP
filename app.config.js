export default {
  expo: {
    name: "Prochem Marketplace",
    slug: "prochem-app",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.prochem.app"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: "com.prochem.app",
      // ✅ UPDATED: Reads from EAS Secret if available, otherwise uses local file
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON || "./google-services.json"
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