import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { IconButton } from 'react-native-paper';

// Screens
import AdminDashboard from '../screens/admin/AdminDashboard';
import AdminUsersScreen from '../screens/admin/AdminUsersScreen';
import AdminUserDetailsScreen from '../screens/admin/AdminUserDetailsScreen';
import AdminProductsScreen from '../screens/admin/AdminProductsScreen';
import AdminOrderVerification from '../screens/admin/AdminOrderVerification';
import AdminPaymentsScreen from '../screens/admin/AdminPaymentsScreen';
// ✅ IMPORT INVOICE VIEWER
import InvoiceViewerScreen from '../screens/InvoiceViewerScreen';

// ✅ DEFINE PARAM LIST FOR ADMIN
export type AdminStackParamList = {
  UsersList: undefined;
  AdminUserDetails: { user: any };
  InvoiceViewer: { order: any }; // ✅ Added this
};

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator<AdminStackParamList>(); // ✅ PASS TYPE HERE

// 1. User Stack (List -> Detail -> Invoice)
function UserStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="UsersList" component={AdminUsersScreen} />
      <Stack.Screen name="AdminUserDetails" component={AdminUserDetailsScreen} />
      {/* ✅ ADD INVOICE VIEWER HERE SO USER DETAILS CAN NAVIGATE TO IT */}
      <Stack.Screen name="InvoiceViewer" component={InvoiceViewerScreen} />
    </Stack.Navigator>
  );
}

// 2. Main Admin Tabs
export default function AdminNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { 
          backgroundColor: '#1E293B',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8
        }, 
        tabBarActiveTintColor: '#4FC3F7',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarLabelStyle: { fontSize: 10, fontWeight: 'bold' }
      }}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={AdminDashboard} 
        options={{ 
          tabBarIcon: ({color}) => <IconButton icon="view-dashboard" iconColor={color} size={24} /> 
        }} 
      />
      
      <Tab.Screen 
        name="Users" 
        component={UserStackNavigator} 
        options={{ 
          tabBarIcon: ({color}) => <IconButton icon="account-group" iconColor={color} size={24} /> 
        }} 
      />
      
      <Tab.Screen 
        name="Moderation" 
        component={AdminProductsScreen} 
        options={{ 
          tabBarIcon: ({color}) => <IconButton icon="shield-check" iconColor={color} size={24} /> 
        }} 
      />
      
      <Tab.Screen 
        name="Orders" 
        component={AdminOrderVerification} 
        options={{ 
          tabBarLabel: 'Verification',
          tabBarIcon: ({color}) => <IconButton icon="file-certificate" iconColor={color} size={24} /> 
        }} 
      />

      <Tab.Screen 
        name="Payments" 
        component={AdminPaymentsScreen} 
        options={{
          tabBarLabel: 'Finance',
          tabBarIcon: ({ color }) => <IconButton icon="finance" iconColor={color} size={24} />
        }} 
      />
    </Tab.Navigator>
  );
}