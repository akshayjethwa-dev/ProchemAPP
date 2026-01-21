import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { UserRole } from '../types';

export default function RoleSelectionScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleSelect = (role: UserRole) => {
    navigation.navigate('Registration', { role, mobile: '' });
  };

  const roles = [
    { 
      type: 'buyer' as UserRole,
      title: 'Business Account', 
      desc: 'Buy and Sell industrial chemicals in a single unified platform.', 
      icon: '🏢',
      color: '#EFF6FF', // blue-50
      borderColor: '#BFDBFE' // blue-200
    },
    { 
      type: 'seller' as UserRole,
      title: 'Seller Account',
      desc: 'Logistics company or driver providing professional chemical transport services.', 
      icon: '🚛',
      color: '#F0FDF4', // green-50
      borderColor: '#BBF7D0' // green-200
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Select Account Type</Text>
        <Text style={styles.subtitle}>Choose how you want to interact with Prochem.</Text>

        <View style={styles.list}>
          {roles.map((r) => (
            <TouchableOpacity 
              key={r.type}
              onPress={() => handleSelect(r.type)}
              style={[styles.card, { backgroundColor: r.color, borderColor: r.borderColor }]}
            >
              <Text style={styles.icon}>{r.icon}</Text>
              <View style={styles.textContainer}>
                <Text style={styles.cardTitle}>{r.title}</Text>
                <Text style={styles.cardDesc}>{r.desc}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  content: { padding: 24, flex: 1 },
  backBtn: { marginBottom: 24, width: 80 },
  backText: { color: '#4B5563', fontSize: 16, fontWeight: '500' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#6B7280', marginBottom: 32 },
  list: { gap: 16 },
  card: { padding: 24, borderRadius: 20, borderWidth: 2, flexDirection: 'row', alignItems: 'flex-start' },
  icon: { fontSize: 32, marginRight: 16 },
  textContainer: { flex: 1 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
  cardDesc: { fontSize: 14, color: '#4B5563', lineHeight: 20 },
});