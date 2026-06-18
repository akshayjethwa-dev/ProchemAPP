import React from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, ViewStyle, TextStyle, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, Card, useTheme, Avatar } from 'react-native-paper';
import { AppTheme } from '../../theme';

// 1. AppScreen: Standardized screen wrapper with background color
export const AppScreen = ({ children, style, scrollable = true }: { children: React.ReactNode, style?: ViewStyle, scrollable?: boolean }) => {
  const theme = useTheme<AppTheme>();
  const content = (
    <View style={[{ flex: 1, backgroundColor: theme.colors.background, padding: theme.spacing.md }, style]}>
      {children}
    </View>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      {scrollable ? <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>{content}</ScrollView> : content}
    </KeyboardAvoidingView>
  );
};

// 2. SectionBlock: Standard wrapper for page sections
export const SectionBlock = ({ children, style }: { children: React.ReactNode, style?: ViewStyle }) => {
  const theme = useTheme<AppTheme>();
  return <View style={[{ marginBottom: theme.spacing.lg }, style]}>{children}</View>;
};

// 3. AppHeaderSection: Standardized section title
export const AppHeaderSection = ({ title, style }: { title: string, style?: TextStyle }) => {
  const theme = useTheme<AppTheme>();
  return (
    <Text variant="titleMedium" style={[{ fontWeight: 'bold', marginBottom: theme.spacing.sm, color: theme.colors.textPrimary }, style]}>
      {title}
    </Text>
  );
};

// 4. AppCard: Standardized card with unified elevation and radius
export const AppCard = ({ children, style, onPress }: { children: React.ReactNode, style?: ViewStyle, onPress?: () => void }) => {
  const theme = useTheme<AppTheme>();
  const cardContent = (
    <Card style={[{ backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, elevation: theme.elevation.level1 }, style]}>
      {children}
    </Card>
  );
  return onPress ? <TouchableOpacity activeOpacity={0.8} onPress={onPress}>{cardContent}</TouchableOpacity> : cardContent;
};

// 5. AppTextField: Shared text input wrapper
export const AppTextField = (props: React.ComponentProps<typeof TextInput>) => {
  const theme = useTheme<AppTheme>();
  return (
    <TextInput
      mode="outlined"
      outlineColor={theme.colors.border}
      activeOutlineColor={theme.colors.primary}
      style={[{ backgroundColor: theme.colors.surface, marginBottom: theme.spacing.md }, props.style]}
      {...props}
    />
  );
};

// 6. FormRow: For side-by-side inputs
export const FormRow = ({ children, style }: { children: React.ReactNode, style?: ViewStyle }) => {
  const theme = useTheme<AppTheme>();
  return (
    <View style={[{ flexDirection: 'row', justifyContent: 'space-between', gap: theme.spacing.sm }, style]}>
      {React.Children.map(children, child => (
        <View style={{ flex: 1 }}>{child}</View>
      ))}
    </View>
  );
};

// 7. PrimaryButton & Sticky Footer
export const PrimaryButton = ({ title, onPress, loading, style, disabled, icon }: any) => {
  const theme = useTheme<AppTheme>();
  return (
    <Button
      mode="contained"
      onPress={onPress}
      loading={loading}
      disabled={disabled}
      icon={icon}
      style={[{ borderRadius: theme.radius.md, backgroundColor: disabled ? theme.colors.surfaceMuted : theme.colors.primary }, style]}
      contentStyle={{ height: 50 }}
      labelStyle={{ fontSize: theme.typography.sizes.bodyLarge, fontWeight: 'bold' }}
    >
      {title}
    </Button>
  );
};

// 8. UploadTile: Standardized upload box
export const UploadTile = ({ title, onPress, hasFile, style }: { title: string, onPress: () => void, hasFile?: boolean, style?: ViewStyle }) => {
  const theme = useTheme<AppTheme>();
  return (
    <TouchableOpacity 
      activeOpacity={0.7} 
      onPress={onPress} 
      style={[{ 
        height: 120, 
        borderRadius: theme.radius.md, 
        backgroundColor: hasFile ? theme.colors.success + '15' : theme.colors.surface, 
        borderWidth: 1, 
        borderColor: hasFile ? theme.colors.success : theme.colors.border, 
        borderStyle: 'dashed', 
        justifyContent: 'center', 
        alignItems: 'center' 
      }, style]}
    >
      <Avatar.Icon 
        size={48} 
        icon={hasFile ? "check-circle" : "cloud-upload"} 
        style={{ backgroundColor: 'transparent' }} 
        color={hasFile ? theme.colors.success : theme.colors.primary} 
      />
      <Text style={{ color: hasFile ? theme.colors.success : theme.colors.primary, fontWeight: 'bold', marginTop: theme.spacing.xs }}>
        {hasFile ? 'File Selected' : title}
      </Text>
    </TouchableOpacity>
  );
};