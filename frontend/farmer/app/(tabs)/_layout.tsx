// app/(tabs)/_layout.tsx
// Bottom tab navigator for the farmer app: Home, Milk, Managers, Assistant,
// Profile. Ionicons — filled when focused, outline when unfocused; active
// tint is forest, inactive is sage. Styling follows the theme tokens; labels
// stay in Bricolage Grotesque semibold.
import React from 'react';
import { Tabs } from 'expo-router';
import { ColorValue } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/theme/colors';
import { font } from '../../src/theme/theme';

function makeIcon(iconName: string, iconNameOutline: string) {
  return function TabBarIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
    return (
      <Ionicons
        name={focused ? (iconName as any) : (iconNameOutline as any)}
        size={25}
        color={color}
      />
    );
  };
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.cream,
          borderTopColor: colors.line,
        },
        tabBarActiveTintColor: colors.forest,
        tabBarInactiveTintColor: colors.sage,
        tabBarLabelStyle: {
          fontFamily: font.semibold,
          fontSize: 13,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: makeIcon('home', 'home-outline'),
        }}
      />
      <Tabs.Screen
        name="milk"
        options={{
          title: 'Milk',
          tabBarIcon: makeIcon('water', 'water-outline'),
        }}
      />
      <Tabs.Screen
        name="managers"
        options={{
          title: 'Managers',
          tabBarIcon: makeIcon('people', 'people-outline'),
        }}
      />
      <Tabs.Screen
        name="assistant"
        options={{
          title: 'Assistant',
          tabBarIcon: makeIcon('chatbubbles', 'chatbubbles-outline'),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: makeIcon('person', 'person-outline'),
        }}
      />
    </Tabs>
  );
}
