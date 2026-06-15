// File: src/navigation/AdminNavigator.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ✅ FIXED: Using useAppStore instead of useAuthStore
import { useAppStore } from '../store/appStore';

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
import AdminCustomRequirementsScreen from '../screens/admin/AdminCustomRequirementsScreen';
import AdminWhatsAppLogsScreen from '../screens/admin/AdminWhatsAppLogsScreen'; // NEW: Import Logs Screen
import AdminManualInvoiceScreen from '../screens/admin/AdminManualInvoiceScreen';

// Negotiation Screens
import NegotiationsListScreen from '../screens/NegotiationsListScreen';
import NegotiationRoomScreen from '../screens/NegotiationRoomScreen';
import AdminBroadcastBidsScreen from '../screens/admin/AdminBroadcastBidsScreen';

export type AdminStackParamList = {
  UsersList: undefined;
  AdminUserDetails: { user: any };
  InvoiceViewer: { order: any }; 
  AdminDashboard: undefined;
  SendNotification: undefined;
  AdminCustomRequirements: undefined;
  AdminNegotiations: { isAdminView: boolean }; 
  NegotiationRoom: { negotiationId: string; title: string }; 
  AdminBroadcastBids: undefined; 
  AdminWhatsAppLogs: undefined; // NEW: Add to Param List
  AdminManualInvoice: undefined;
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
      <Stack.Screen name="AdminCustomRequirements" component={AdminCustomRequirementsScreen} />
      
      <Stack.Screen 
        name="AdminNegotiations" 
        component={NegotiationsListScreen} 
        options={{ headerShown: true, title: 'Monitor Negotiations' }}
      />
      <Stack.Screen 
        name="NegotiationRoom" 
        component={NegotiationRoomScreen} 
        options={{ headerShown: true, title: 'Price Discussion' }}
      />

      <Stack.Screen 
        name="AdminBroadcastBids" 
        component={AdminBroadcastBidsScreen} 
        options={{ headerShown: true, title: 'Supplier Bids', headerBackTitle: 'Back' }}
      />

      {/* NEW: WhatsApp Logs Screen Route */}
      <Stack.Screen 
        name="AdminWhatsAppLogs" 
        component={AdminWhatsAppLogsScreen} 
        options={{ headerShown: true, title: 'WhatsApp Logs', headerBackTitle: 'Back' }}
      />
      <Stack.Screen name="AdminManualInvoice" component={AdminManualInvoiceScreen} options={{ headerShown: true, title: 'Custom Invoice Generator', headerBackTitle: 'Back' }} />
    </Stack.Navigator>
  );
}

export default function AdminNavigator() {
  const insets = useSafeAreaInsets();
  
  // ✅ Get user from appStore to accurately check sub_admin role
  const user = useAppStore((state) => state.user);
  const isSubAdmin = user?.userType === 'sub_admin';

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { 
          backgroundColor: '#1E293B',
          // 🚀 FIX: Standardize safe area spacing for Android/iOS
          height: 60 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 10),
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
      
      {/* 🛑 HIDE: Do not show Users tab for sub_admin */}
      {!isSubAdmin && (
        <Tab.Screen 
          name="Users" 
          component={UserStackNavigator} 
          options={{ 
            tabBarIcon: ({color}) => <IconButton icon="account-group" iconColor={color} size={24} /> 
          }} 
        />
      )}
      
      {/* 🛑 HIDE: Do not show Modification tab for sub_admin */}
      {!isSubAdmin && (
        <Tab.Screen 
          name="Moderation" 
          component={AdminProductsScreen} 
          options={{ 
            tabBarIcon: ({color}) => <IconButton icon="shield-check" iconColor={color} size={24} /> 
          }} 
        />
      )}
      
      {/* ✅ KEEP: Order management (Verification Tab) */}
      <Tab.Screen 
        name="Orders" 
        component={AdminOrderVerification} 
        options={{ 
          tabBarLabel: 'Verification',
          tabBarIcon: ({color}) => <IconButton icon="file-certificate" iconColor={color} size={24} /> 
        }} 
      />

      {/* 🛑 HIDE: Remove Finance tabs for sub_admin */}
      {!isSubAdmin && (
        <Tab.Screen 
          name="NAPayments" 
          component={AdminPaymentsScreen} 
          options={{
            tabBarLabel: 'Finance',
            tabBarIcon: ({ color }) => <IconButton icon="finance" iconColor={color} size={24} />
          }} 
        />
      )}
      
      {!isSubAdmin && (
        <Tab.Screen 
          name="Payments"
          component={AdminPayment} 
          options={{
            tabBarLabel: 'Finance',
            tabBarIcon: ({ color }) => <IconButton icon="cash-multiple" iconColor={color} size={24} />
          }} 
        />
      )}
    </Tab.Navigator>
  );
}