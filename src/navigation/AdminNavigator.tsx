import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Screens
import AdminDashboard from '../screens/admin/AdminDashboard';
import AdminUsersScreen from '../screens/admin/AdminUsersScreen';
import AdminUserDetailsScreen from '../screens/admin/AdminUserDetailsScreen';
import AdminProductsScreen from '../screens/admin/AdminProductsScreen';
import AdminOrderVerification from '../screens/admin/AdminOrderVerification';
import AdminPaymentsScreen from '../screens/admin/AdminPaymentsScreen';
import InvoiceViewerScreen from '../screens/InvoiceViewerScreen';
import AdminSendNotificationScreen from '../screens/admin/AdminSendNotificationScreen';
import AdminPayment from '../screens/admin/AdminPayment';

export type AdminStackParamList = {
  UsersList: undefined;
  AdminUserDetails: { user: any };
  InvoiceViewer: { order: any }; 
  AdminDashboard: undefined;
  SendNotification: undefined;
};

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator<AdminStackParamList>();

function UserStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="UsersList" component={AdminUsersScreen} />
      <Stack.Screen name="AdminUserDetails" component={AdminUserDetailsScreen} />
      <Stack.Screen name="InvoiceViewer" component={InvoiceViewerScreen} />
    </Stack.Navigator>
  );
}

function DashboardStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
      <Stack.Screen name="SendNotification" component={AdminSendNotificationScreen} />
    </Stack.Navigator>
  );
}

export default function AdminNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { 
          backgroundColor: '#1E293B',
          height: 60 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 8
        }, 
        tabBarActiveTintColor: '#4FC3F7',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarLabelStyle: { fontSize: 10, fontWeight: 'bold' }
      }}
    >
      <Tab.Screen 
        name="DashboardTab" 
        component={DashboardStackNavigator} 
        options={{ 
          tabBarLabel: 'Dashboard',
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
        name="NAPayments" 
        component={AdminPaymentsScreen} 
        options={{
          tabBarLabel: 'Finance',
          tabBarIcon: ({ color }) => <IconButton icon="finance" iconColor={color} size={24} />
        }} 
      />
      <Tab.Screen 
        name="Payments"
        component={AdminPayment} 
        options={{
          tabBarLabel: 'Finance',
          tabBarIcon: ({ color }) => <IconButton icon="cash-multiple" iconColor={color} size={24} />
        }} 
      />
    </Tab.Navigator>
  );
}