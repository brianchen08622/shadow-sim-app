import React, { useEffect } from 'react';
import { AppState } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as Updates from 'expo-updates';

import SimulatorScreen from './src/screens/SimulatorScreen';
import LearnScreen from './src/screens/LearnScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  useEffect(() => {
    const checkUpdate = async () => {
      if (__DEV__) return;
      try {
        const update = await Updates.checkForUpdateAsync();
        if (!update.isAvailable) return;
        await Updates.fetchUpdateAsync();
        await Updates.reloadAsync();
      } catch {}
    };
    checkUpdate();
    const sub = AppState.addEventListener('change', s => { if (s === 'active') checkUpdate(); });
    return () => sub.remove();
  }, []);

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: '#66BB6A',
          tabBarInactiveTintColor: '#4A6A4A',
          tabBarStyle: {
            backgroundColor: '#0D1117',
            borderTopColor: '#1E2E1E',
            borderTopWidth: 1,
          },
          tabBarIcon: ({ focused, color, size }) => {
            const icons = {
              '模擬': focused ? 'cube' : 'cube-outline',
              '知識庫': focused ? 'book' : 'book-outline',
            };
            return <Ionicons name={icons[route.name]} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="模擬" component={SimulatorScreen} />
        <Tab.Screen name="知識庫" component={LearnScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
