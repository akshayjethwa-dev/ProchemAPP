import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

export default function LegalPagesScreen() {
  const navigation = useNavigation();
  return (
    <SafeAreaView style={{flex:1, backgroundColor:'white'}}>
      <View style={{flexDirection:'row', alignItems:'center', padding: 8}}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text variant="headlineSmall" style={{fontWeight:'bold'}}>Legal & Compliance</Text>
      </View>
      <ScrollView contentContainerStyle={{padding: 20}}>
        <Text variant="titleMedium" style={{fontWeight:'bold'}}>Terms of Service</Text>
        <Text style={{marginBottom: 20, color:'#666'}}>
          By using Prochem, you agree to comply with all chemical safety regulations...
        </Text>
        <Text variant="titleMedium" style={{fontWeight:'bold'}}>Privacy Policy</Text>
        <Text style={{marginBottom: 20, color:'#666'}}>
          We collect data solely for B2B verification purposes...
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}