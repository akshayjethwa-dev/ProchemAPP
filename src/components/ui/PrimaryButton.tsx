import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { theme } from '../../theme';

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  isLoading?: boolean;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({ title, onPress, isLoading }) => {
  return (
    <TouchableOpacity 
      style={styles.button} 
      onPress={onPress} 
      disabled={isLoading}
      activeOpacity={0.8}
    >
      {isLoading ? (
        <ActivityIndicator color={theme.colors.surface} />
      ) : (
        <Text style={styles.text}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    // 1. Base card styles (gives us the standardized soft shadow)
    ...theme.cardStyle, 
    
    // 2. Button-specific overrides (these now safely override the card defaults)
    backgroundColor: '#3B82F6', // Standard blue
    borderWidth: 0,             // Remove the gray card border
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    // We removed the duplicate borderRadius: 8 here since theme.cardStyle already provides it!
  },
  text: {
    color: theme.colors.surface,
    fontSize: theme.typography.sizes.reading,
    fontWeight: theme.typography.weights.medium,
  },
});