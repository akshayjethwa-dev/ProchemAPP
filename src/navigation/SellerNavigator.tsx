import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { IconButton, useTheme } from 'react-native-paper';

// Screens
import SellerDashboard from '../screens/SellerDashboard';
import SellerOrdersScreen from '../screens/SellerOrdersScreen';
import SellerManageChemicals from '../screens/SellerManageChemicals';
import SellerAddChemical from '../screens/SellerAddChemical';
import AccountScreen from '../screens/AccountScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// ✅ 1. Define Tabs separately
function SellerTabs() {
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
        name="Dashboard" // Changed from "Home" to match Dashboard logic usually
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
        name="MyListings" // Renamed to match the navigation calls from Dashboard
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

// ✅ 2. Export the Stack (Tabs + Add Chemical Screen)
export default function SellerNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* The Main Tabs */}
      <Stack.Screen name="SellerHome" component={SellerTabs} />
      
      {/* ✅ The Standalone "Add Chemical" Screen */}
      <Stack.Screen 
        name="AddChemical" 
        component={SellerAddChemical} 
        options={{ 
          headerShown: true, 
          title: 'Add New Chemical',
          headerBackTitle: 'Back'
        }} 
      />
    </Stack.Navigator>
  );
}