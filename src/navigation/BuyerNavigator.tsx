import React, { useEffect, useState } from 'react';
import { View, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { IconButton, Badge, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { collection, query, where, onSnapshot } from 'firebase/firestore'; 
import { db, auth } from '../config/firebase'; 
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

import CartScreen from '../screens/CartScreen'; 
import BusinessGrowthScreen from '../screens/BusinessGrowthScreen';

export type BuyerStackParamList = {
  BuyerTabs: undefined;
  ProductDetail: { product: any };
  Cart: undefined; 
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
    const currentUser = auth.currentUser;
    if (!user?.uid || !currentUser) return;

    const qRfq = query(
      collection(db, 'rfqs'),
      where('buyerId', '==', user.uid),
      where('status', '==', 'NEGOTIATING') 
    );

    const unsubRfq = onSnapshot(qRfq, (snapshot) => {
        setActiveNegotiations(snapshot.docs.length);
      }, (error: any) => console.warn(error.message));

    const qReq = query(
      collection(db, 'customRequirements'),
      where('buyerId', '==', user.uid),
      where('status', '==', 'QUOTED') 
    );

    const unsubReq = onSnapshot(qReq, (snapshot) => {
        setQuotedRequirements(snapshot.docs.length);
      }, (error: any) => console.warn(error.message));

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
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: { 
          // 2. APPLY INSETS TO BOTH PLATFORMS
          height: 60 + insets.bottom, 
          paddingBottom: Math.max(insets.bottom, 10), 
          paddingTop: 10, 
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB', 
          elevation: 0, 
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' }
      }}
    >
      <Tab.Screen name="HomeTab" component={BuyerHome} options={{ tabBarLabel: 'Home', tabBarIcon: ({ color }) => <IconButton icon="home" iconColor={color} size={24} style={{ margin: 0 }} /> }} />
      <Tab.Screen name="Categories" component={CategoriesScreen} options={{ tabBarLabel: 'Categories', tabBarIcon: ({ color }) => <IconButton icon="view-grid" iconColor={color} size={24} style={{ margin: 0 }} /> }} />
      <Tab.Screen name="Growth" component={BusinessGrowthScreen} options={{ tabBarLabel: 'Premium', tabBarIcon: ({ color }) => <IconButton icon="crown" iconColor="#EAB308" size={24} style={{ margin: 0 }} /> }} />
      <Tab.Screen name="Orders" component={OrderHistoryScreen} options={{ tabBarLabel: 'Orders', tabBarIcon: ({ color }) => <IconButton icon="clipboard-text" iconColor={color} size={24} style={{ margin: 0 }} /> }} />
      <Tab.Screen name="Account" component={AccountScreen} options={{
          tabBarLabel: 'Account',
          tabBarIcon: ({ color }) => (
            <View>
              <IconButton icon="account" iconColor={color} size={24} style={{ margin: 0 }} />
              {totalAlerts > 0 && <Badge style={{ position: 'absolute', top: 2, right: 2, backgroundColor: '#EF4444' }} size={10} />}
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
        headerBackTitle: '', 
        headerTintColor: '#1F2937', 
        headerShadowVisible: false, 
        headerStyle: { backgroundColor: '#FFFFFF' },
        headerTitleStyle: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
        headerTitleAlign: 'center', 
      }}
    >
      <Stack.Screen name="BuyerTabs" component={BuyerTabs} />
      <Stack.Screen name="ProductDetail" component={ProductDetail} />
      <Stack.Screen name="Cart" component={CartScreen} options={{ headerShown: true, title: 'Your Cart' }} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ headerShown: true, title: 'Checkout' }} />
      <Stack.Screen name="AddressList" component={AddressListScreen} options={{ headerShown: true, title: 'Select Address' }} />
      <Stack.Screen name="AddAddress" component={AddAddressScreen} options={{ headerShown: true, title: 'Add New Address' }} />
      <Stack.Screen name="InvoiceViewer" component={InvoiceViewerScreen} />
      <Stack.Screen name="OrderTracking" component={OrderTracking} options={{ headerShown: true, title: 'Order Details' }} />
      <Stack.Screen name="PaymentSuccess" component={PaymentSuccessScreen} options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="NegotiationsList" component={NegotiationsListScreen} options={{ headerShown: false }} />
      <Stack.Screen name="NegotiationRoom" component={NegotiationRoomScreen} options={{ headerShown: false }} />
      <Stack.Screen name="PostRequirement" component={PostRequirementScreen} options={{ headerShown: true, title: 'Post Custom Requirement' }} />
      <Stack.Screen name="Compare" component={CompareScreen} options={{ headerShown: true, title: 'Compare Products' }} />
      <Stack.Screen name="BuyerRequirements" component={BuyerRequirementsScreen} options={{ headerShown: true, title: 'My Sourcing Requests' }} />
    </Stack.Navigator>
  );
}