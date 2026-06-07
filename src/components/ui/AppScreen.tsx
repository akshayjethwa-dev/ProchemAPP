import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
// 1. IMPORT SafeAreaView FROM react-native-safe-area-context
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';

interface AppScreenProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const AppScreen: React.FC<AppScreenProps> = ({ children, style }) => {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={[styles.container, style]}>
        {children}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    padding: theme.spacing.md,
  },
});