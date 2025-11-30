import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HistoryScreen from "@/screens/HistoryScreen";
import RecipeDetailScreen from "@/screens/RecipeDetailScreen";
import { useTheme } from "@/hooks/useTheme";
import { getCommonScreenOptions } from "@/navigation/screenOptions";
import { Recipe } from "@/types";

export type HistoryStackParamList = {
  History: undefined;
  RecipeDetail: { recipe: Recipe };
};

const Stack = createNativeStackNavigator<HistoryStackParamList>();

export default function HistoryStackNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        ...getCommonScreenOptions({ theme, isDark }),
      }}
    >
      <Stack.Screen
        name="History"
        component={HistoryScreen}
        options={{ headerTitle: "История рецептов" }}
      />
      <Stack.Screen
        name="RecipeDetail"
        component={RecipeDetailScreen}
        options={{ headerTitle: "" }}
      />
    </Stack.Navigator>
  );
}
