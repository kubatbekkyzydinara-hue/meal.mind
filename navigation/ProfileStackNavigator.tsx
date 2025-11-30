import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ProfileScreen from "@/screens/ProfileScreen";
import SettingsScreen from "@/screens/SettingsScreen";
import OnboardingScreen from "@/screens/OnboardingScreen";
import { useTheme } from "@/hooks/useTheme";
import { getCommonScreenOptions } from "@/navigation/screenOptions";

export type ProfileStackParamList = {
  Profile: undefined;
  Settings: undefined;
  Onboarding: undefined;
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export default function ProfileStackNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        ...getCommonScreenOptions({ theme, isDark }),
      }}
    >
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ headerTitle: "Профиль" }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ headerTitle: "Настройки" }}
      />
      <Stack.Screen
        name="Onboarding"
        component={OnboardingScreen}
        options={{ 
          headerShown: false,
          presentation: "fullScreenModal",
        }}
      />
    </Stack.Navigator>
  );
}
