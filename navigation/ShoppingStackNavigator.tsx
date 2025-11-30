import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ShoppingScreen from "@/screens/ShoppingScreen";
import AddShoppingItemScreen from "@/screens/AddShoppingItemScreen";
import DeliveryScreen from "@/screens/DeliveryScreen";
import { useTheme } from "@/hooks/useTheme";
import { getCommonScreenOptions } from "@/navigation/screenOptions";

export type ShoppingStackParamList = {
  Shopping: undefined;
  AddShoppingItem: undefined;
  Delivery: undefined;
};

const Stack = createNativeStackNavigator<ShoppingStackParamList>();

export default function ShoppingStackNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        ...getCommonScreenOptions({ theme, isDark }),
      }}
    >
      <Stack.Screen
        name="Shopping"
        component={ShoppingScreen}
        options={{ headerTitle: "Список покупок" }}
      />
      <Stack.Screen
        name="AddShoppingItem"
        component={AddShoppingItemScreen}
        options={{ 
          headerTitle: "Добавить товар",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="Delivery"
        component={DeliveryScreen}
        options={{ 
          headerTitle: "Оформление заказа",
        }}
      />
    </Stack.Navigator>
  );
}
