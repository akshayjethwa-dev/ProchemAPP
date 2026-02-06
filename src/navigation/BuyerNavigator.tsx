import React from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { IconButton, Badge, useTheme } from 'react-native-paper';
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

// ✅ FIXED: Added InvoiceViewer to the param list
export type BuyerStackParamList = {
  BuyerTabs: undefined;
  ProductDetail: { product: any };
  Checkout: undefined;
  AddressList: undefined;
  AddAddress: undefined;
  InvoiceViewer: { order: any }; // <--- Added this line
  OrderTracking: { orderId: string };
};

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator<BuyerStackParamList>();

function BuyerTabs() {
  const theme = useTheme();
  const cartCount = useAppStore(state => state.cart.length);

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
          tabBarIcon: ({ color }) => <IconButton icon="account" iconColor={color} size={24} />
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
      
      {/* This screen caused the error because it was missing in the type def above */}
      <Stack.Screen name="InvoiceViewer" component={InvoiceViewerScreen} />
      <Stack.Screen 
        name="OrderTracking" 
        component={OrderTracking} 
        options={{ title: 'Order Details' }} 
      />
    </Stack.Navigator>
  );
}