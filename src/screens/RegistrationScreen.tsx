import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { Text, TextInput, Button, HelperText, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { registerUser } from '../services/authService';

export default function RegisterScreen() {
  const navigation = useNavigation<any>();
  const theme = useTheme();
  
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [secureTextEntry, setSecureTextEntry] = useState(true);

  // Error States
  const [errors, setErrors] = useState({
    companyName: '',
    email: '',
    phoneNumber: '',
    password: ''
  });

  const validate = () => {
    let isValid = true;
    let newErrors = { companyName: '', email: '', phoneNumber: '', password: '' };

    if (!companyName.trim()) {
      newErrors.companyName = 'Company Name is required';
      isValid = false;
    }

    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Valid Email is required';
      isValid = false;
    }

    if (!phoneNumber.trim() || phoneNumber.length < 10) {
      newErrors.phoneNumber = 'Valid 10-digit Phone Number is required';
      isValid = false;
    }

    if (!password || password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleRegister = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      await registerUser({
        email: email.trim(), 
        password, 
        companyName: companyName.trim(), 
        phoneNumber: phoneNumber.trim(),
        userType: 'dual' // Setting 'dual' so they can buy AND sell immediately
      });
      
      // Navigate to Login or let the Auth Listener handle the redirect
      Alert.alert("Success", "Account created successfully! Please login.");
      navigation.navigate('Login');
      
    } catch (error: any) {
      console.error("Registration Error:", error);
      Alert.alert('Registration Failed', error.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
      style={{flex: 1, backgroundColor: 'white'}}
    >
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        <View style={styles.headerContainer}>
          <Text variant="displaySmall" style={{fontWeight: 'bold', color: theme.colors.primary}}>
            Create Account
          </Text>
          <Text variant="bodyLarge" style={{color: '#64748B', marginTop: 5}}>
            Join the Chemical Marketplace
          </Text>
        </View>

        <View style={styles.formContainer}>
          {/* Company Name */}
          <TextInput 
            label="Company Name" 
            value={companyName} 
            onChangeText={(text) => {
              setCompanyName(text);
              if(errors.companyName) setErrors({...errors, companyName: ''});
            }} 
            mode="outlined" 
            left={<TextInput.Icon icon="domain" />}
            error={!!errors.companyName}
            style={styles.input} 
          />
          <HelperText type="error" visible={!!errors.companyName}>
            {errors.companyName}
          </HelperText>

          {/* Email */}
          <TextInput 
            label="Email Address" 
            value={email} 
            onChangeText={(text) => {
              setEmail(text);
              if(errors.email) setErrors({...errors, email: ''});
            }} 
            mode="outlined" 
            keyboardType="email-address"
            autoCapitalize="none"
            left={<TextInput.Icon icon="email-outline" />}
            error={!!errors.email}
            style={styles.input} 
          />
          <HelperText type="error" visible={!!errors.email}>
            {errors.email}
          </HelperText>

          {/* Phone Number - NEW FIELD */}
          <TextInput 
            label="Phone Number" 
            value={phoneNumber} 
            onChangeText={(text) => {
              // Only allow numbers
              const numericText = text.replace(/[^0-9]/g, '');
              setPhoneNumber(numericText);
              if(errors.phoneNumber) setErrors({...errors, phoneNumber: ''});
            }} 
            mode="outlined" 
            keyboardType="phone-pad"
            maxLength={10}
            placeholder="9876543210"
            left={<TextInput.Icon icon="phone" />}
            error={!!errors.phoneNumber}
            style={styles.input} 
          />
          <HelperText type="error" visible={!!errors.phoneNumber}>
            {errors.phoneNumber}
          </HelperText>

          {/* Password */}
          <TextInput 
            label="Password" 
            value={password} 
            onChangeText={(text) => {
              setPassword(text);
              if(errors.password) setErrors({...errors, password: ''});
            }} 
            mode="outlined" 
            secureTextEntry={secureTextEntry}
            left={<TextInput.Icon icon="lock-outline" />}
            right={<TextInput.Icon icon={secureTextEntry ? "eye" : "eye-off"} onPress={() => setSecureTextEntry(!secureTextEntry)} />}
            error={!!errors.password}
            style={styles.input} 
          />
          <HelperText type="error" visible={!!errors.password}>
            {errors.password}
          </HelperText>

          {/* Register Button */}
          <Button 
            mode="contained" 
            onPress={handleRegister} 
            loading={loading} 
            disabled={loading}
            style={styles.btn}
            contentStyle={{height: 50}}
          >
            Sign Up
          </Button>

          {/* Login Link */}
          <View style={styles.footer}>
            <Text style={{color: '#64748B'}}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={{color: theme.colors.primary, fontWeight: 'bold'}}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flexGrow: 1, 
    justifyContent: 'center', 
    padding: 24, 
    backgroundColor: 'white' 
  },
  headerContainer: {
    marginBottom: 30,
    alignItems: 'center'
  },
  formContainer: {
    width: '100%',
  },
  input: { 
    backgroundColor: 'white',
    fontSize: 15
  },
  btn: { 
    marginTop: 10, 
    borderRadius: 8,
    backgroundColor: '#004AAD'
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20
  }
});