import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppTheme } from '../hooks/useTheme';
import { HomeScreen } from '../screens/HomeScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { SavedScreen } from '../screens/SavedScreen';
import { ConnectScreen } from '../screens/ConnectScreen';
import { SwapScreen } from '../screens/SwapScreen';
import { TokenDetailScreen } from '../screens/TokenDetailScreen';

const Tab = createBottomTabNavigator();
const SearchStack = createStackNavigator();

const SearchStackScreen: React.FC = () => (
  <SearchStack.Navigator screenOptions={{ headerShown: false }}>
    <SearchStack.Screen name="SearchMain" component={SearchScreen} />
    <SearchStack.Screen name="TokenDetail" component={TokenDetailScreen} />
  </SearchStack.Navigator>
);

export const AppNavigator: React.FC = () => {
  const { colors, isDark } = useAppTheme();

  return (
    <NavigationContainer
      theme={{
        dark: isDark,
        colors: {
          primary: colors.primary,
          background: colors.background,
          card: colors.background,
          text: colors.text,
          border: 'transparent',
          notification: colors.accent,
        },
        fonts: {
          regular: { fontFamily: 'System', fontWeight: '400' as const },
          medium: { fontFamily: 'System', fontWeight: '500' as const },
          bold: { fontFamily: 'System', fontWeight: '700' as const },
          heavy: { fontFamily: 'System', fontWeight: '900' as const },
        },
      }}
    >
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.background,
            borderTopWidth: 0,
            elevation: 0,
            paddingTop: 4,
            paddingBottom: 8,
          },
          tabBarActiveTintColor: '#FFFFFF',
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '500',
          },
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            tabBarIcon: ({ color }) => (
              <MaterialCommunityIcons name="home-outline" size={22} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Search"
          component={SearchStackScreen}
          options={{
            tabBarIcon: ({ color }) => (
              <MaterialCommunityIcons name="magnify" size={22} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Saved"
          component={SavedScreen}
          options={{
            tabBarIcon: ({ color }) => (
              <MaterialCommunityIcons name="bookmark-outline" size={22} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Swap"
          component={SwapScreen}
          options={{
            tabBarIcon: ({ color }) => (
              <MaterialCommunityIcons name="swap-horizontal" size={22} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Connect"
          component={ConnectScreen}
          options={{
            tabBarIcon: ({ color }) => (
              <MaterialCommunityIcons name="wallet-outline" size={22} color={color} />
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
};
