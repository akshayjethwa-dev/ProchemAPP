import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { IconButton, Badge, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { collection, query, where, onSnapshot } from 'firebase/firestore'; // 🚀 Added Firebase for real-time badge
import { db } from '../config/firebase'; // 🚀 Added Firebase
import { useAppStore } from '../store/appStore';

import BuyerHome from '../screens/BuyerHome';
import CategoriesScreen from '../screens/CategoriesScreen';
import CartScreen from '../screens/CartScreen';
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

export type BuyerStackParamList = {
  BuyerTabs: undefined;
  ProductDetail: { product: any };
  Checkout: undefined;
  AddressList: undefined;
  AddAddress: undefined;
  InvoiceViewer: { order: any };
  OrderTracking: { orderId: string };
  NegotiationsList: undefined;
  NegotiationRoom: { rfqId?: string };
  PostRequirement: undefined;
  PaymentSuccess: any; // ✅ FIXED: Added PaymentSuccess to the param list
  Compare: undefined;
};

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator<BuyerStackParamList>();

function BuyerTabs() {
  const theme = useTheme();
  const cartCount = useAppStore(state => state.cart.length);
  const { user } = useAppStore(); // 🚀 Get user to listen for their quotes
  const insets = useSafeAreaInsets();

  // 🚀 NEW: State to track active negotiations for the notification badge
  const [activeNegotiations, setActiveNegotiations] = useState(0);

  useEffect(() => {
    if (!user?.uid) return;

    // Listen for quotes belonging to this buyer where the supplier has replied (NEGOTIATING)
    const q = query(
      collection(db, 'rfqs'),
      where('buyerId', '==', user.uid),
      where('status', '==', 'NEGOTIATING') 
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setActiveNegotiations(snapshot.docs.length);
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
      <Tab.Screen 
        name="Cart" 
        component={CartScreen} 
        options={{
          tabBarLabel: 'Cart',
          tabBarIcon: ({ color }) => (
            <View>
              <IconButton icon="cart" iconColor={color} size={24} />
              {cartCount > 0 && (
                <Badge style={{ position: 'absolute', top: 4, right: 4 }} size={16}>{cartCount}</Badge>
              )}
            </View>
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
              {/* 🚀 RED DOT NOTIFICATION: Shows if there are active negotiations */}
              {activeNegotiations > 0 && (
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
        options={{ headerShown: false, gestureEnabled: false }} // Prevent swiping back to checkout
      />
      <Stack.Screen name="NegotiationsList" component={NegotiationsListScreen} options={{ headerShown: false }} />
      <Stack.Screen name="NegotiationRoom" component={NegotiationRoomScreen} options={{ headerShown: false }} />
      <Stack.Screen name="PostRequirement" component={PostRequirementScreen} options={{ headerShown: true, title: 'Post Custom Requirement' }} />
      {/* 🚀 NEW COMPARE SCREEN */}
      <Stack.Screen 
        name="Compare" 
        component={CompareScreen} 
        options={{ headerShown: true, title: 'Compare Products' }} 
      />
    </Stack.Navigator>
  );
}