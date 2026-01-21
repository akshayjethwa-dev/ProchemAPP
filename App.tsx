import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider, MD3LightTheme } from 'react-native-paper';
import { RootNavigator } from './src/navigation/RootNavigator';

// Optional: Define your custom theme colors here
const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#004AAD',
    secondary: '#FF6B00',
  },
};

export default function App() {
  return (
    // 1. SafeAreaProvider prevents content from hiding behind the notch/status bar
    <SafeAreaProvider>
      {/* 2. PaperProvider enables the UI components we used (Buttons, Cards, etc.) */}
      <PaperProvider theme={theme}>
        {/* 3. StatusBar controls the battery/time icons color */}
        <StatusBar style="dark" />
        
        {/* 4. The main navigation structure */}
        <RootNavigator />
      </PaperProvider>
    </SafeAreaProvider>
  );
}