import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { IconButton, Badge, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { collection, query, where, onSnapshot } from 'firebase/firestore'; 
import { db } from '../config/firebase'; 
import { useAppStore } from '../store/appStore';

import BuyerHome from '../screens/BuyerHome';
import CategoriesScreen from '../screens/CategoriesScreen';
import OrderHistoryScreen from '../screens/OrderHistoryScreen';
import AccountScreen from '../screens/AccountScreen';
import CheckoutScreen from '../screens/CheckoutScreen';
import AddressListScreen from '../screens/AddressListScreen';
import AddAddressScreen from '../screens/AddAddressScreen';
import ProductDetail from '../screens/ProductDetail';
import InvoiceViewerScreen from '../screens/InvoiceViewerScreen';
import OrderTracking from '../screens/OrderTracking';
import NegotiationsListScreen from '../screens/NegotiationsListScreen';
import NegotiationRoomScreen from '../screens/NegotiationRoomScreen';
import PostRequirementScreen from '../screens/PostRequirementScreen';
import PaymentSuccessScreen from '../screens/PaymentSuccessScreen';
import CompareScreen from '../screens/CompareScreen';
import BuyerRequirementsScreen from '../screens/BuyerRequirementsScreen'; 

// ✅ New Screen Imports
import CartScreen from '../screens/CartScreen'; // Moved to Stack
import BusinessGrowthScreen from '../screens/BusinessGrowthScreen';

export type BuyerStackParamList = {
  BuyerTabs: undefined;
  ProductDetail: { product: any };
  Cart: undefined; // Added here since it's no longer a tab
  Checkout: { negotiatedItem?: any }; 
  AddressList: undefined;
  AddAddress: undefined;
  InvoiceViewer: { order: any };
  OrderTracking: { orderId: string };
  NegotiationsList: undefined;
  NegotiationRoom: { rfqId?: string };
  PostRequirement: undefined;
  PaymentSuccess: any; 
  Compare: undefined;
  BuyerRequirements: undefined;
};

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator<BuyerStackParamList>();

function BuyerTabs() {
  const theme = useTheme();
  const { user } = useAppStore(); 
  const insets = useSafeAreaInsets();

  const [activeNegotiations, setActiveNegotiations] = useState(0);
  const [quotedRequirements, setQuotedRequirements] = useState(0);

  useEffect(() => {
    if (!user?.uid) return;

    // 1. Listen for standard RFQ negotiations
    const qRfq = query(
      collection(db, 'rfqs'),
      where('buyerId', '==', user.uid),
      where('status', '==', 'NEGOTIATING') 
    );

    const unsubRfq = onSnapshot(qRfq, (snapshot) => {
      setActiveNegotiations(snapshot.docs.length);
    });

    // 2. Listen for Custom Requirements that have received a Quote
    const qReq = query(
      collection(db, 'customRequirements'),
      where('buyerId', '==', user.uid),
      where('status', '==', 'QUOTED') 
    );

    const unsubReq = onSnapshot(qReq, (snapshot) => {
      setQuotedRequirements(snapshot.docs.length);
    });

    return () => {
      unsubRfq();
      unsubReq();
    };
  }, [user?.uid]);

  const totalAlerts = activeNegotiations + quotedRequirements;

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
        name="HomeTab" 
        component={BuyerHome} 
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => <IconButton icon="home" iconColor={color} size={24} />
        }}
      />
      <Tab.Screen 
        name="Categories" 
        component={CategoriesScreen} 
        options={{
          tabBarLabel: 'Categories',
          tabBarIcon: ({ color }) => <IconButton icon="view-grid" iconColor={color} size={24} />
        }}
      />
      {/* ✅ Premium Growth Package Tab (Replaces Cart) */}
      <Tab.Screen 
        name="Growth" 
        component={BusinessGrowthScreen} 
        options={{
          tabBarLabel: 'Premium',
          tabBarIcon: ({ color }) => (
            <IconButton icon="crown" iconColor="#EAB308" size={28} style={{ margin: 0 }} />
          )
        }}
      />
      <Tab.Screen 
        name="Orders" 
        component={OrderHistoryScreen} 
        options={{
          tabBarLabel: 'Orders',
          tabBarIcon: ({ color }) => <IconButton icon="clipboard-text" iconColor={color} size={24} />
        }}
      />
      <Tab.Screen 
        name="Account" 
        component={AccountScreen} 
        options={{
          tabBarLabel: 'Account',
          tabBarIcon: ({ color }) => (
            <View>
              <IconButton icon="account" iconColor={color} size={24} />
              {totalAlerts > 0 && (
                <Badge 
                  style={{ position: 'absolute', top: 6, right: 6, backgroundColor: '#EF4444' }} 
                  size={10} 
                />
              )}
            </View>
          )
        }}
      />
    </Tab.Navigator>
  );
}

export default function BuyerNavigator() {
  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        headerBackTitle: '' 
      }}
    >
      <Stack.Screen name="BuyerTabs" component={BuyerTabs} />
      <Stack.Screen name="ProductDetail" component={ProductDetail} />
      
      {/* ✅ Added Cart to Stack Navigator */}
      <Stack.Screen 
        name="Cart" 
        component={CartScreen} 
        options={{ headerShown: true, title: 'Your Cart' }} 
      />

      <Stack.Screen 
        name="Checkout" 
        component={CheckoutScreen} 
        options={{ headerShown: true, title: 'Checkout' }} 
      />
      <Stack.Screen 
        name="AddressList" 
        component={AddressListScreen} 
        options={{ headerShown: true, title: 'Select Address' }} 
      />
      <Stack.Screen 
        name="AddAddress" 
        component={AddAddressScreen} 
        options={{ headerShown: true, title: 'Add New Address' }} 
      />
      
      <Stack.Screen name="InvoiceViewer" component={InvoiceViewerScreen} />
      <Stack.Screen 
        name="OrderTracking" 
        component={OrderTracking} 
        options={{ title: 'Order Details' }} 
      />
      <Stack.Screen 
        name="PaymentSuccess" 
        component={PaymentSuccessScreen} 
        options={{ headerShown: false, gestureEnabled: false }} 
      />
      <Stack.Screen name="NegotiationsList" component={NegotiationsListScreen} options={{ headerShown: false }} />
      <Stack.Screen name="NegotiationRoom" component={NegotiationRoomScreen} options={{ headerShown: false }} />
      <Stack.Screen name="PostRequirement" component={PostRequirementScreen} options={{ headerShown: true, title: 'Post Custom Requirement' }} />
      <Stack.Screen 
        name="Compare" 
        component={CompareScreen} 
        options={{ headerShown: true, title: 'Compare Products' }} 
      />
      <Stack.Screen 
        name="BuyerRequirements" 
        component={BuyerRequirementsScreen} 
        options={{ headerShown: true, title: 'My Sourcing Requests' }} 
      />
    </Stack.Navigator>
  );
}