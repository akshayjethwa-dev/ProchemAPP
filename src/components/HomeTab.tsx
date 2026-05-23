import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Product } from '../types';
import { theme } from '../theme';

// Import our new Design System Components
import { AppScreen } from './ui/AppScreen';
import { SectionCard } from './ui/SectionCard';
import { PrimaryButton } from './ui/PrimaryButton';
import { StatusChip } from './ui/StatusChip';

interface Props {
  profile: any;
  allProducts: Product[];
  onProductSelect: (p: Product) => void;
  onCategorySelect: any;
  onNotifications: () => void;
}

const HomeTab: React.FC<Props> = ({ profile, allProducts, onProductSelect, onCategorySelect, onNotifications }) => {
  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={styles.title}>Home</Text>
        <StatusChip label="Active" />
      </View>

      <SectionCard>
        <Text style={styles.cardText}>Total Products Available</Text>
        <Text style={styles.dataText}>{allProducts.length}</Text>
      </SectionCard>

      <PrimaryButton 
        title="View Notifications" 
        onPress={onNotifications} 
      />
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: theme.typography.sizes.title,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textPrimary,
  },
  cardText: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  dataText: {
    fontSize: theme.typography.sizes.heading,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textPrimary,
  },
});

export default HomeTab;