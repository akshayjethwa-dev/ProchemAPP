import React, { useRef } from 'react';
import { Text, StyleSheet, ActivityIndicator, Animated, Pressable } from 'react-native';
import { theme } from '../../theme';

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  isLoading?: boolean;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({ title, onPress, isLoading }) => {
  // 1. Initialize an animated value for the scale
  const scaleValue = useRef(new Animated.Value(1)).current;

  // 2. Define the animation for when the button is pressed down
  const handlePressIn = () => {
    if (isLoading) return;
    Animated.spring(scaleValue, {
      toValue: 0.95, // Shrink slightly to 95% size
      useNativeDriver: true, // Use native driver for 60fps performance
    }).start();
  };

  // 3. Define the animation for when the button is released
  const handlePressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1, // Bounce back to 100% size
      friction: 4, // Controls the "bounciness"
      tension: 40, // Controls the speed
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable 
      onPress={onPress} 
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isLoading}
      style={{ width: '100%' }} // Ensure the pressable area takes full available width
    >
      {/* 4. Apply the animated scale to the button view */}
      <Animated.View style={[styles.button, { transform: [{ scale: scaleValue }] }]}>
        {isLoading ? (
          <ActivityIndicator color={theme.colors.surface} />
        ) : (
          <Text style={styles.text}>{title}</Text>
        )}
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    ...theme.cardStyle, 
    backgroundColor: '#3B82F6', 
    borderWidth: 0,             
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: theme.colors.surface,
    fontSize: theme.typography.sizes.reading,
    fontWeight: theme.typography.weights.medium,
  },
});