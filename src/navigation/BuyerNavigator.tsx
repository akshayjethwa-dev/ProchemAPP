import React from 'react';
import { View, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { IconButton, Badge, useTheme } from 'react-native-paper';
import { useAppStore } from '../store/appStore';

// Import Your 5 Tab Screens
import BuyerHome from '../screens/BuyerHome';
import CategoriesScreen from '../screens/CategoriesScreen';
import CartScreen from '../screens/CartScreen';
import OrderHistoryScreen from '../screens/OrderHistoryScreen';
import AccountScreen from '../screens/AccountScreen';

const Tab = createBottomTabNavigator();

export default function BuyerNavigator() {
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
        name="Home" 
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