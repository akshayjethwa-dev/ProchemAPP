import React, { useState } from 'react';
import { View, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { Text, TextInput, Button, Surface, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { loginUser } from '../services/authService';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

export default function LoginScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const theme = useTheme();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      await loginUser(email, password);
      // Navigation handled by auth listener in RootNavigator
    } catch (err: any) {
      Alert.alert('Login Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text variant="displaySmall" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>Prochem</Text>
          <Text variant="bodyLarge" style={styles.subtitle}>B2B Chemical Marketplace</Text>
        </View>

        <Surface style={styles.card} elevation={2}>
          <TextInput
            label="Email Address"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
          />
          
          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            secureTextEntry
            style={styles.input}
          />

          <Button 
            mode="contained" 
            onPress={handleLogin} 
            loading={loading}
            style={styles.button}
            contentStyle={{ paddingVertical: 8 }}
          >
            Login
          </Button>

          <Button 
            mode="text" 
            onPress={() => navigation.navigate('RoleSelection')}
            style={styles.textButton}
          >
            New User? Create Account
          </Button>
        </Surface>

        {/* ✅ Legal Pages Link */}
        <TouchableOpacity 
          onPress={() => navigation.navigate('LegalPages' as any)} 
          style={styles.legalLink}
        >
          <Text variant="labelMedium" style={{color: '#666', textDecorationLine: 'underline'}}>
            Legal & Compliance
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  content: { flex: 1, padding: 20, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 40 },
  subtitle: { color: '#666', marginTop: 8 },
  card: { padding: 24, borderRadius: 16, backgroundColor: 'white' },
  input: { marginBottom: 16, backgroundColor: 'white' },
  button: { marginTop: 8, borderRadius: 8 },
  textButton: { marginTop: 16 },
  legalLink: { marginTop: 40, alignItems: 'center' }
});