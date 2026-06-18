// File: src/theme.ts

export const theme = {
  colors: {
    primary: '#0EA5E9',
    secondary: '#64748B',
    background: '#F8FAFC',
    surface: '#FFFFFF',
    textPrimary: '#0F172A',
    textSecondary: '#64748B',
    border: '#E2E8F0',
    error: '#EF4444',
    success: '#22C55E',
    warning: '#EAB308',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  // New Unified Typography Scale
  typography: {
    sizes: {
      pageTitle: 24,
      sectionTitle: 18,
      bodyLarge: 16, // For primary readable text
      body: 14,      // Standard text
      label: 13,     // Field labels, tags
      caption: 12,   // Helper text, small prints
    },
    weights: {
      bold: '700' as const,
      semiBold: '600' as const,
      medium: '500' as const,
      regular: '400' as const,
    },
  },
};