import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Product } from '../types';
import { theme } from '../theme';

// Import our Design System Components
import { AppScreen } from './ui/AppScreen';
import { SectionCard } from './ui/SectionCard';
import { PrimaryButton } from './ui/PrimaryButton';
import { StatusChip } from './ui/StatusChip';
import { AppText } from './ui/AppText'; // Import the new AppText

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
        <AppText variant="pageTitle">Home</AppText>
        <StatusChip label="Active" />
      </View>

      <SectionCard>
        <AppText variant="body" color={theme.colors.textSecondary} style={{ marginBottom: theme.spacing.xs }}>
          Total Products Available
        </AppText>
        <AppText variant="pageTitle" color={theme.colors.primary}>
          {allProducts.length}
        </AppText>
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
  }
});

export default HomeTab;