// File: src/components/ui/AppText.tsx
import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { theme } from '../../theme';

type TextVariant = 
  | 'pageTitle' 
  | 'sectionTitle' 
  | 'bodyLarge' 
  | 'body' 
  | 'label' 
  | 'caption' 
  | 'button';

interface AppTextProps extends TextProps {
  variant?: TextVariant;
  color?: string;
  align?: 'auto' | 'left' | 'right' | 'center' | 'justify';
  weight?: keyof typeof theme.typography.weights;
  children: React.ReactNode;
}

export const AppText: React.FC<AppTextProps> = ({
  variant = 'body',
  color = theme.colors.textPrimary,
  align = 'left',
  weight,
  style,
  children,
  ...rest
}) => {
  return (
    <Text
      allowFontScaling={true}
      // Caps system font scaling at 1.5x to prevent broken/clipped layouts on dense B2B screens
      maxFontSizeMultiplier={1.5} 
      style={[
        styles[variant],
        { color, textAlign: align },
        weight ? { fontWeight: theme.typography.weights[weight] } : null,
        style,
      ]}
      {...rest}
    >
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  pageTitle: {
    fontSize: theme.typography.sizes.pageTitle,
    fontWeight: theme.typography.weights.bold,
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.sectionTitle,
    fontWeight: theme.typography.weights.semiBold,
  },
  bodyLarge: {
    fontSize: theme.typography.sizes.bodyLarge,
    fontWeight: theme.typography.weights.regular,
  },
  body: {
    fontSize: theme.typography.sizes.body,
    fontWeight: theme.typography.weights.regular,
  },
  label: {
    fontSize: theme.typography.sizes.label,
    fontWeight: theme.typography.weights.medium,
  },
  caption: {
    fontSize: theme.typography.sizes.caption,
    fontWeight: theme.typography.weights.regular,
  },
  button: {
    fontSize: theme.typography.sizes.bodyLarge,
    fontWeight: theme.typography.weights.semiBold,
  },
});