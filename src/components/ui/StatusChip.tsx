import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../theme';

interface StatusChipProps {
  label: string;
}

export const StatusChip: React.FC<StatusChipProps> = ({ label }) => {
  return (
    <View style={styles.chip}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  chip: {
    backgroundColor: '#DBEAFE', // Light blue background
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  text: {
    color: '#1D4ED8', // Dark blue text
    fontSize: theme.typography.sizes.small,
    fontWeight: theme.typography.weights.medium,
  },
});