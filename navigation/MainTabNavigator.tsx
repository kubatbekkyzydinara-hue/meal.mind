import React from "react";
import { View, StyleSheet, Pressable, Platform } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import HomeStackNavigator from "@/navigation/HomeStackNavigator";
import HistoryStackNavigator from "@/navigation/HistoryStackNavigator";
import ShoppingStackNavigator from "@/navigation/ShoppingStackNavigator";
import ProfileStackNavigator from "@/navigation/ProfileStackNavigator";
import { useTheme } from "@/hooks/useTheme";
import { useShoppingList } from "@/hooks/useAppState";
import { Colors, Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";

export type MainTabParamList = {
  HomeTab: undefined;
  HistoryTab: undefined;
  ScanTab: undefined;
  ShoppingTab: undefined;
  ProfileTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

function ScanPlaceholder() {
  return null;
}

export default function MainTabNavigator() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { totalCount } = useShoppingList();

  return (
    <Tab.Navigator
      initialRouteName="HomeTab"
      screenOptions={{
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.tabIconDefault,
        tabBarStyle: {
          position: "absolute",
          height: 56 + insets.bottom,
          backgroundColor: Platform.select({
            ios: "transparent",
            android: theme.backgroundRoot,
          }),
          borderTopWidth: 0,
          elevation: 0,
        },
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView
              intensity={100}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : null,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "500",
          marginBottom: Platform.OS === "ios" ? 0 : 4,
        },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNavigator}
        options={{
          title: "Главная",
          tabBarIcon: ({ color, size }) => (
            <Feather name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="HistoryTab"
        component={HistoryStackNavigator}
        options={{
          title: "История",
          tabBarIcon: ({ color, size }) => (
            <Feather name="clock" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ScanTab"
        component={ScanPlaceholder}
        options={{
          title: "",
          tabBarIcon: () => null,
          tabBarButton: () => null,
        }}
      />
      <Tab.Screen
        name="ShoppingTab"
        component={ShoppingStackNavigator}
        options={{
          title: "Корзина",
          tabBarIcon: ({ color, size }) => (
            <Feather name="shopping-cart" size={size} color={color} />
          ),
          tabBarBadge: totalCount > 0 ? totalCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: theme.primary,
            color: "#FFFFFF",
            fontSize: 10,
            minWidth: 18,
            height: 18,
          },
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStackNavigator}
        options={{
          title: "Профиль",
          tabBarIcon: ({ color, size }) => (
            <Feather name="user" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

interface ScanFABProps {
  onPress: () => void;
}

export function ScanFAB({ onPress }: ScanFABProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.fab,
        {
          backgroundColor: theme.primary,
          bottom: 56 + insets.bottom - 28,
          transform: [{ scale: pressed ? 0.95 : 1 }],
          opacity: pressed ? 0.9 : 1,
        },
        Shadows.fab,
      ]}
    >
      <Feather name="camera" size={28} color="#FFFFFF" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    alignSelf: "center",
    width: Spacing.fabSize,
    height: Spacing.fabSize,
    borderRadius: Spacing.fabSize / 2,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
});
