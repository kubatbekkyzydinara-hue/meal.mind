import React from "react";
import { View, Pressable, StyleSheet, Alert } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import HomeScreen from "@/screens/HomeScreen";
import StockScreen from "@/screens/StockScreen";
import RecipeDetailScreen from "@/screens/RecipeDetailScreen";
import ScanScreen from "@/screens/ScanScreen";
import ScanResultScreen from "@/screens/ScanResultScreen";
import AddProductScreen from "@/screens/AddProductScreen";
import GenerateRecipeScreen from "@/screens/GenerateRecipeScreen";
import MealPlanScreen from "@/screens/MealPlanScreen";
import GuestMenuScreen from "@/screens/GuestMenuScreen";
import ChefChatScreen from "@/screens/ChefChatScreen";
import { HeaderTitle } from "@/components/HeaderTitle";
import { useTheme } from "@/hooks/useTheme";
import { getCommonScreenOptions } from "@/navigation/screenOptions";
import { Spacing } from "@/constants/theme";
import { Product, Recipe } from "@/types";

export type HomeStackParamList = {
  Home: undefined;
  Stock: undefined;
  RecipeDetail: { recipe: Recipe };
  ChefChat: { recipe: Recipe };
  Scan: undefined;
  ScanResult: { products: Product[]; imageUri: string };
  AddProduct: { product?: Product } | undefined;
  GenerateRecipe: undefined;
  MealPlan: undefined;
  GuestMenu: undefined;
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

function HeaderRightButtons() {
  const { theme } = useTheme();
  
  return (
    <View style={styles.headerRight}>
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          Alert.alert("Уведомления", "У вас нет новых уведомлений");
        }}
        style={({ pressed }) => [styles.headerButton, { opacity: pressed ? 0.7 : 1 }]}
      >
        <Feather name="bell" size={22} color={theme.text} />
      </Pressable>
    </View>
  );
}

export default function HomeStackNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        ...getCommonScreenOptions({ theme, isDark }),
      }}
    >
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{
          headerTitle: () => <HeaderTitle title="MealMind" />,
          headerRight: () => <HeaderRightButtons />,
        }}
      />
      <Stack.Screen
        name="Stock"
        component={StockScreen}
        options={{ headerTitle: "Мой холодильник" }}
      />
      <Stack.Screen
        name="RecipeDetail"
        component={RecipeDetailScreen}
        options={{ headerTitle: "" }}
      />
      <Stack.Screen
        name="Scan"
        component={ScanScreen}
        options={{ 
          headerTitle: "Сканирование",
          presentation: "fullScreenModal",
        }}
      />
      <Stack.Screen
        name="ScanResult"
        component={ScanResultScreen}
        options={{ headerTitle: "Результаты сканирования" }}
      />
      <Stack.Screen
        name="AddProduct"
        component={AddProductScreen}
        options={{ 
          headerTitle: "Добавить продукт",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="GenerateRecipe"
        component={GenerateRecipeScreen}
        options={{ headerTitle: "Генерация рецепта" }}
      />
      <Stack.Screen
        name="MealPlan"
        component={MealPlanScreen}
        options={{ headerTitle: "План питания" }}
      />
      <Stack.Screen
        name="GuestMenu"
        component={GuestMenuScreen}
        options={{ headerTitle: "Меню для гостей" }}
      />
      <Stack.Screen
        name="ChefChat"
        component={ChefChatScreen}
        options={{ headerTitle: "AI Шеф-помощник" }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  headerButton: {
    padding: Spacing.xs,
  },
});
