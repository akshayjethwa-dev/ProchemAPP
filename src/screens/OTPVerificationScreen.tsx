import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Text, TextInput, Button, IconButton, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

export default function OTPVerificationScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<any>();
  const mobile = route.params?.mobile || '';
  const theme = useTheme();

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);

  useEffect(() => {
    const timer = setInterval(() => {
      setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      Alert.alert('Error', 'Please enter a 6-digit OTP');
      return;
    }

    setLoading(true);
    // Simulate API Call
    setTimeout(() => {
      setLoading(false);
      if (otp === '123456') {
        // Navigate to Role Selection after success
        navigation.replace('RoleSelection');
      } else {
        Alert.alert('Error', 'Invalid OTP. Try 123456');
      }
    }, 1500);
  };

  const handleResend = () => {
    setResendTimer(30);
    Alert.alert('Sent', 'OTP resent successfully!');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.content}>
        <Text variant="displaySmall" style={styles.title}>Enter OTP</Text>
        <Text variant="bodyLarge" style={styles.subtitle}>Sent to {mobile}</Text>

        <View style={styles.inputContainer}>
          <TextInput
            mode="outlined"
            label="6-Digit Code"
            value={otp}
            onChangeText={(text) => setOtp(text.replace(/[^0-9]/g, '').slice(0, 6))}
            keyboardType="number-pad"
            maxLength={6}
            style={styles.input}
            contentStyle={styles.inputText}
          />
          <Text style={styles.hint}>For testing use: 123456</Text>
        </View>

        <Button 
          mode="contained" 
          onPress={handleVerify} 
          loading={loading}
          disabled={loading || otp.length !== 6}
          style={styles.verifyBtn}
          contentStyle={{ height: 50 }}
        >
          Verify OTP
        </Button>

        <TouchableOpacity 
          onPress={handleResend} 
          disabled={resendTimer > 0}
          style={styles.resendContainer}
        >
          <Text style={{ color: resendTimer > 0 ? '#999' : theme.colors.primary, fontWeight: 'bold' }}>
            {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : "Didn't receive code? Resend"}
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  header: { paddingHorizontal: 10 },
  content: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { fontWeight: 'bold', color: '#111827', marginBottom: 8 },
  subtitle: { color: '#6B7280', marginBottom: 40 },
  inputContainer: { marginBottom: 30 },
  input: { backgroundColor: '#F9FAFB', fontSize: 24, fontWeight: 'bold', textAlign: 'center' },
  inputText: { textAlign: 'center', letterSpacing: 4, fontSize: 24 },
  hint: { textAlign: 'center', color: '#9CA3AF', marginTop: 10 },
  verifyBtn: { borderRadius: 12, marginBottom: 20 },
  resendContainer: { alignItems: 'center', padding: 10 },
});