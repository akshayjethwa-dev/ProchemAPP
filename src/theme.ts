// File: src/theme.ts
import { MD3LightTheme as DefaultTheme } from 'react-native-paper';

export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#004AAD',
    secondary: '#FF6B00',
    background: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceMuted: '#F1F5F9',
    textPrimary: '#1E293B',
    textSecondary: '#64748B',
    warning: '#F59E0B',
    success: '#10B981',
    border: '#E2E8F0',
    error: '#D32F2F',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  radius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
  },
  elevation: {
    level1: 2,
    level2: 4,
  },
  typography: {
    sizes: {
      caption: 12,
      body: 14,
      label: 14,
      bodyLarge: 16,
      title: 18,
      sectionTitle: 18,
      header: 24,
      pageTitle: 24,
    },
    weights: {
      regular: '400' as const,
      medium: '500' as const,
      semiBold: '600' as const,
      bold: '700' as const,
    }
  },
};

export type AppTheme = typeof theme;