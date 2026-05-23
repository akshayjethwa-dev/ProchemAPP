// src/theme.ts

export const theme = {
  // 8-Point Grid System for strict spacing
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 40,
  },
  
  // Standardized Typography
  typography: {
    sizes: {
      small: 12,       // For tiny badges or legal text
      base: 14,        // Standard for high data density (B2B apps)
      reading: 16,     // For longer reading paragraphs
      heading: 20,     // For section headers
      title: 24,       // For main page titles
    },
    weights: {
      regular: '400' as const,
      medium: '500' as const,
      bold: '700' as const,
    },
  },

  // Global Icon Sizes
  iconSizes: {
    inline: 16,   // Small checkmarks, location pins inside buttons
    standard: 24, // Main UI icons (home, cart, profile)
    large: 32,    // Empty state illustrations
  },

  // Color Palette focusing on contrast and hierarchy
  colors: {
    textPrimary: '#1F2937',   // Dark gray for primary text (less harsh than pure black)
    textSecondary: '#6B7280', // Light gray for supporting text
    border: '#E5E7EB',        // Very subtle border color
    background: '#F3F4F6',    // App background
    surface: '#FFFFFF',       // Card/White background
  },

  // Standardized Card & Shadow Design (Flat & Clean)
  cardStyle: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    // Extremely soft shadow (max elevation 2 as requested)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1, 
  }
};