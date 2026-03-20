// src/navigation/SellerNavigator.tsx
import React, { useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { IconButton, useTheme, Badge } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View } from 'react-native';
import { collection, query, where, onSnapshot } from 'firebase/firestore'; 
import { db } from '../config/firebase'; 
import { useAppStore } from '../store/appStore';

// Screens
import SellerDashboard from '../screens/SellerDashboard';
import SellerOrdersScreen from '../screens/SellerOrdersScreen';
import SellerManageChemicals from '../screens/SellerManageChemicals';
import SellerAddChemical from '../screens/SellerAddChemical';
import AccountScreen from '../screens/AccountScreen';
import InvoiceViewerScreen from '../screens/InvoiceViewerScreen';
import NegotiationsListScreen from '../screens/NegotiationsListScreen';
import NegotiationRoomScreen from '../screens/NegotiationRoomScreen';

// 🔥 IMPORT NEW LIVE LEADS SCREEN
import SellerLiveLeadsScreen from '../screens/SellerLiveLeadsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function SellerTabs() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAppStore();
  
  const [pendingQuotesCount, setPendingQuotesCount] = useState(0);

  useEffect(() => {
    if (!user?.uid) return;
    
    const q = query(
      collection(db, 'rfqs'),
      where('sellerId', '==', user.uid),
      where('status', '==', 'PENDING')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPendingQuotesCount(snapshot.docs.length);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: '#64748B',
        tabBarStyle: { 
          height: 65 + insets.bottom, 
          paddingBottom: 10 + insets.bottom, 
          paddingTop: 10, 
          backgroundColor: 'white' 
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700' }
      }}
    >
      <Tab.Screen 
        name="Dashboard" 
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
        name="Quotes" 
        component={NegotiationsListScreen}
        options={{
          tabBarLabel: 'Quotes',
          tabBarIcon: ({ color }) => (
            <View>
              <IconButton icon="message-text" iconColor={color} size={24} />
              {pendingQuotesCount > 0 && (
                <Badge style={{ position: 'absolute', top: 4, right: 4 }} size={16}>{pendingQuotesCount}</Badge>
              )}
            </View>
          )
        }}
      />

      <Tab.Screen 
        name="MyListings" 
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

export default function SellerNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SellerHome" component={SellerTabs} />
      
      <Stack.Screen 
        name="AddChemical" 
        component={SellerAddChemical} 
        options={{ 
          headerShown: true, 
          title: 'Add New Chemical',
          headerBackTitle: 'Back'
        }} 
      />
      <Stack.Screen name="InvoiceViewer" component={InvoiceViewerScreen} options={{ headerShown: false }} />
      <Stack.Screen name="NegotiationRoom" component={NegotiationRoomScreen} options={{ headerShown: false }} />
      
      {/* 🔥 ADDED: Live Market Screen via Stack Navigation */}
      <Stack.Screen 
        name="SellerLiveLeads" 
        component={SellerLiveLeadsScreen} 
        options={{ 
          headerShown: true, 
          title: 'Live Market',
          headerBackTitle: 'Back'
        }} 
      />
    </Stack.Navigator>
  );
}