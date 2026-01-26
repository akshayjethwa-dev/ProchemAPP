import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack'; // ✅ Import Stack
import { IconButton } from 'react-native-paper';

// Screens
import TransporterDashboard from '../screens/TransporterDashboard';
import TransporterProfile from '../screens/TransporterProfile';
import TransporterNewOrders from '../screens/TransporterNewOrders'; 
import TransporterTrip from '../screens/TransporterTrip'; 

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// ✅ Create a stack for the Dashboard tab to handle sub-screens
function DashboardStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DashboardMain" component={TransporterDashboard} />
      <Stack.Screen name="NewOrders" component={TransporterNewOrders} />
      <Stack.Screen name="Trip" component={TransporterTrip} />
    </Stack.Navigator>
  );
}

export default function TransporterNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: 'white', height: 65, paddingBottom: 10 },
        tabBarActiveTintColor: '#1E293B',
      }}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardStack} // ✅ Use the Stack instead of just the screen
        options={{
          tabBarLabel: 'My Loads',
          tabBarIcon: ({color}) => <IconButton icon="truck-delivery" iconColor={color} />
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={TransporterProfile} 
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({color}) => <IconButton icon="account-hard-hat" iconColor={color} />
        }}
      />
    </Tab.Navigator>
  );
}