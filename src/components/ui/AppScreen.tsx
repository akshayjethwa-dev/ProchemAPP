import React from 'react';
import { 
  View, 
  ScrollView, 
  StyleSheet, 
  StyleProp, 
  ViewStyle, 
  KeyboardAvoidingView, 
  Platform 
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../theme';

interface AppScreenProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  scroll?: boolean;
  keyboardAvoiding?: boolean;
  noHeader?: boolean;
  edges?: Array<'top' | 'right' | 'bottom' | 'left'>;
  bottomCTA?: React.ReactNode; // For fixed sticky footers
}

export const AppScreen: React.FC<AppScreenProps> = ({ 
  children, 
  style, 
  scroll = false,
  keyboardAvoiding = false,
  noHeader = false,
  edges,
  bottomCTA 
}) => {
  const insets = useSafeAreaInsets();
  
  // If the screen hides the navigation header, we must pad the top edge. 
  // Otherwise, react-navigation headers handle the top safe area automatically.
  const defaultEdges: Array<'top' | 'right' | 'bottom' | 'left'> = noHeader 
    ? ['top', 'left', 'right'] 
    : ['left', 'right'];

  const content = scroll ? (
    <ScrollView 
      contentContainerStyle={[styles.scrollContent, style]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.container, style]}>
      {children}
    </View>
  );

  const wrapper = keyboardAvoiding ? (
    <KeyboardAvoidingView 
      style={styles.keyboardAvoiding} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {content}
    </KeyboardAvoidingView>
  ) : content;

  return (
    <SafeAreaView style={styles.safeArea} edges={edges || defaultEdges}>
      {wrapper}
      
      {bottomCTA && (
        <View style={[
          styles.fixedFooter, 
          // Ensure the CTA does not overlap with the home indicator (safe area bottom)
          { paddingBottom: Math.max(insets.bottom, theme.spacing.md) }
        ]}>
          {bottomCTA}
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardAvoiding: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: theme.spacing.md,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md, // Breathing room at top/bottom of scroll views
  },
  fixedFooter: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  }
});