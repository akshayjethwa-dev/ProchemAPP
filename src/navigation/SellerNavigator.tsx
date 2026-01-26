import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { IconButton, useTheme } from 'react-native-paper';

// Screens
import SellerDashboard from '../screens/SellerDashboard';
import SellerOrdersScreen from '../screens/SellerOrdersScreen';
import SellerManageChemicals from '../screens/SellerManageChemicals';
import AccountScreen from '../screens/AccountScreen';

const Tab = createBottomTabNavigator();

export default function SellerNavigator() {
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: '#64748B',
        tabBarStyle: { height: 65, paddingBottom: 10, paddingTop: 10, backgroundColor: 'white' },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700' }
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={SellerDashboard} 
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color }) => <IconButton icon="view-dashboard" iconColor={color} size={24} />
        }}
      />
      <Tab.Screen 
        name="Orders" 
        component={SellerOrdersScreen}
        options={{
          tabBarLabel: 'Orders',
          tabBarIcon: ({ color }) => <IconButton icon="clipboard-list" iconColor={color} size={24} />
        }}
      />
      <Tab.Screen 
        name="Inventory" 
        component={SellerManageChemicals} 
        options={{
          tabBarLabel: 'My Listings',
          tabBarIcon: ({ color }) => <IconButton icon="flask" iconColor={color} size={24} />
        }}
      />
      <Tab.Screen 
        name="Account" 
        component={AccountScreen} 
        options={{
          tabBarLabel: 'Account',
          tabBarIcon: ({ color }) => <IconButton icon="account" iconColor={color} size={24} />
        }}
      />
    </Tab.Navigator>
  );
}