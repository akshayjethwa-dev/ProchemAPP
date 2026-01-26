import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { IconButton } from 'react-native-paper';

import AdminDashboard from '../screens/admin/AdminDashboard';
import AdminUsersScreen from '../screens/admin/AdminUsersScreen';
import AdminProductsScreen from '../screens/admin/AdminProductsScreen';
import AdminOrderVerification from '../screens/admin/AdminOrderVerification';

const Tab = createBottomTabNavigator();

export default function AdminNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#1E293B' }, // Dark theme for Admin
        tabBarActiveTintColor: '#4FC3F7',
        tabBarInactiveTintColor: '#94A3B8'
      }}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={AdminDashboard} 
        options={{ tabBarIcon: ({color}) => <IconButton icon="view-dashboard" iconColor={color} /> }} 
      />
      <Tab.Screen 
        name="Users" 
        component={AdminUsersScreen} 
        options={{ tabBarIcon: ({color}) => <IconButton icon="account-group" iconColor={color} /> }} 
      />
      <Tab.Screen 
        name="Moderation" 
        component={AdminProductsScreen} 
        options={{ tabBarIcon: ({color}) => <IconButton icon="shield-check" iconColor={color} /> }} 
      />
      <Tab.Screen 
  name="Orders" 
  component={AdminOrderVerification} 
  options={{ 
    tabBarLabel: 'Verification',
    tabBarIcon: ({color}) => <IconButton icon="file-certificate" iconColor={color} /> 
  }} 
/>
    </Tab.Navigator>
  );
}