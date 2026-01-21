import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

export default function SplashScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const theme = useTheme();

  // ✅ Auto-redirect after 2.5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('Login');
    }, 2500);

    return () => clearTimeout(timer); // Cleanup
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Text variant="displayLarge" style={styles.logoText}>P</Text>
        </View>
        <Text variant="displayMedium" style={styles.title}>Prochem</Text>
        <Text variant="titleMedium" style={styles.subtitle}>
          Chemical Marketplace for Professionals
        </Text>
      </View>
      
      <View style={styles.footer}>
        <Button 
          mode="contained" 
          onPress={() => navigation.replace('Login')}
          style={styles.button}
          contentStyle={{height: 56}}
          labelStyle={{fontSize: 18, fontWeight: 'bold'}}
        >
          Continue
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#004AAD' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  logoContainer: { 
    width: 120, height: 120, backgroundColor: 'white', borderRadius: 30, 
    alignItems: 'center', justifyContent: 'center', marginBottom: 24, elevation: 8 
  },
  logoText: { color: '#004AAD', fontWeight: 'bold' },
  title: { color: 'white', fontWeight: 'bold', marginBottom: 8 },
  subtitle: { color: '#BFDBFE', textAlign: 'center' },
  footer: { padding: 24 },
  button: { borderRadius: 16, backgroundColor: 'white' },
});