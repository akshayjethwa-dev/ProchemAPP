import React from 'react';
import { View, StyleSheet } from 'react-native';
import { theme } from '../../theme';
import { AppText } from './AppText';

interface StatusChipProps {
  label: string;
  status?: 'active' | 'pending' | 'error' | 'success';
}

export const StatusChip: React.FC<StatusChipProps> = ({ label, status = 'success' }) => {
  
  // Set up standard color profiles based on status
  let bgColor = theme.colors.success + '20'; // Adds 20% opacity to the hex color
  let textColor = theme.colors.success;

  if (status === 'error') {
    bgColor = theme.colors.error + '20';
    textColor = theme.colors.error;
  } else if (status === 'pending') {
    bgColor = theme.colors.warning + '20';
    textColor = theme.colors.warning;
  } else if (status === 'active') {
    bgColor = theme.colors.primary + '20';
    textColor = theme.colors.primary;
  }

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <AppText variant="caption" color={textColor} weight="semiBold">
        {label}
      </AppText>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: 16,
    alignSelf: 'flex-start',
  }
});