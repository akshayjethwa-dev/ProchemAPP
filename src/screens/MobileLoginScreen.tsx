import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Image, Alert } from 'react-native';
import { Text, TextInput, Button, HelperText, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

export default function MobileLoginScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOTP = async () => {
    setError('');
    if (!phone || phone.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    // Temporary alert to allow the app to build successfully without the deprecated package.
    Alert.alert(
      "Update Required",
      "Phone authentication is currently being updated to the modern native SDK. Please use email login temporarily."
    );
  };

  return (
    <View style={styles.mainContainer}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
      </SafeAreaView>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          <Image 
            source={require('../../assets/logo.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
          <Text variant="headlineMedium" style={styles.title}>Continue with Mobile</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Enter your mobile number to login or create a new account. We'll send you an OTP to verify.
          </Text>

          <TextInput
            label="Mobile Number"
            value={phone}
            onChangeText={(text) => {
              setPhone(text.replace(/[^0-9]/g, ''));
              setError('');
            }}
            mode="outlined"
            keyboardType="phone-pad"
            maxLength={10}
            style={styles.input}
            outlineStyle={styles.inputOutline}
            left={<TextInput.Affix text="+91 " />}
            error={!!error}
          />

          {error ? (
            <HelperText type="error" visible={!!error} style={styles.errorText}>
              {error}
            </HelperText>
          ) : null}

          <Button
            mode="contained"
            onPress={handleSendOTP}
            loading={loading}
            disabled={loading}
            icon="message-processing-outline"
            style={styles.btn}
            contentStyle={styles.btnContent}
            labelStyle={styles.btnLabel}
          >
            Send OTP
          </Button>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { 
    flex: 1, 
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 10,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  logo: {
    width: 120,
    height: 40,
    marginBottom: 24,
  },
  title: {
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 8,
  },
  subtitle: {
    color: '#64748B',
    marginBottom: 32,
    lineHeight: 22,
  },
  input: { 
    backgroundColor: '#F8FAFC', 
    fontSize: 16,
    marginBottom: 8,
  },
  inputOutline: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  errorText: {
    paddingHorizontal: 0,
    marginBottom: 16,
  },
  btn: { 
    borderRadius: 12, 
    backgroundColor: '#2563EB',
    marginTop: 16,
  },
  btnContent: { 
    paddingVertical: 10,
  },
  btnLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});