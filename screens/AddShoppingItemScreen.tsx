import React, { useState } from "react";
import { 
  View, 
  StyleSheet, 
  Pressable, 
  TextInput,
  ScrollView,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ScreenKeyboardAwareScrollView } from "@/components/ScreenKeyboardAwareScrollView";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useShoppingList } from "@/hooks/useAppState";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { ShoppingStackParamList } from "@/navigation/ShoppingStackNavigator";
import { ShoppingItem, ProductCategory, CATEGORY_LABELS, CATEGORY_ICONS } from "@/types";
import { generateId } from "@/utils/helpers";

type NavigationProp = NativeStackNavigationProp<ShoppingStackParamList, "AddShoppingItem">;

const UNITS = ["шт", "кг", "г", "л", "мл", "упак"];

export default function AddShoppingItemScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const { addItem } = useShoppingList();

  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("шт");
  const [category, setCategory] = useState<ProductCategory>("other");

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Ошибка", "Введите название товара");
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const newItem: ShoppingItem = {
      id: generateId(),
      name: name.trim(),
      quantity,
      unit,
      category,
      checked: false,
      addedAt: new Date().toISOString(),
    };

    await addItem(newItem);
    navigation.goBack();
  };

  const inputStyle = [
    styles.input,
    { 
      backgroundColor: theme.backgroundDefault,
      color: theme.text,
      borderColor: theme.border,
    },
  ];

  return (
    <ScreenKeyboardAwareScrollView>
      <View style={styles.field}>
        <ThemedText type="h4" style={styles.label}>Название</ThemedText>
        <TextInput
          style={inputStyle}
          value={name}
          onChangeText={setName}
          placeholder="Например: Хлеб белый"
          placeholderTextColor={theme.placeholder}
          autoFocus
        />
      </View>

      <View style={styles.row}>
        <View style={[styles.field, { flex: 1 }]}>
          <ThemedText type="h4" style={styles.label}>Количество</ThemedText>
          <TextInput
            style={inputStyle}
            value={quantity}
            onChangeText={setQuantity}
            placeholder="1"
            placeholderTextColor={theme.placeholder}
            keyboardType="numeric"
          />
        </View>

        <View style={[styles.field, { flex: 1 }]}>
          <ThemedText type="h4" style={styles.label}>Единица</ThemedText>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.unitsScroll}
          >
            {UNITS.map((u) => (
              <Pressable
                key={u}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setUnit(u);
                }}
                style={[
                  styles.unitPill,
                  { 
                    backgroundColor: unit === u ? theme.primary : theme.backgroundDefault,
                    borderColor: unit === u ? theme.primary : theme.border,
                  },
                ]}
              >
                <ThemedText 
                  type="small"
                  style={{ color: unit === u ? "#FFFFFF" : theme.text }}
                >
                  {u}
                </ThemedText>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>

      <View style={styles.field}>
        <ThemedText type="h4" style={styles.label}>Категория</ThemedText>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesScroll}
        >
          {(Object.keys(CATEGORY_LABELS) as ProductCategory[]).map((cat) => (
            <Pressable
              key={cat}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setCategory(cat);
              }}
              style={[
                styles.categoryPill,
                { 
                  backgroundColor: category === cat ? theme.primary : theme.backgroundDefault,
                  borderColor: category === cat ? theme.primary : theme.border,
                },
              ]}
            >
              <Feather 
                name={CATEGORY_ICONS[cat] as any} 
                size={16} 
                color={category === cat ? "#FFFFFF" : theme.textSecondary} 
              />
              <ThemedText 
                type="small"
                style={{ 
                  color: category === cat ? "#FFFFFF" : theme.text,
                  marginLeft: 6,
                }}
              >
                {CATEGORY_LABELS[cat]}
              </ThemedText>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <Pressable
        onPress={handleSave}
        style={({ pressed }) => [
          styles.saveButton,
          { 
            backgroundColor: theme.primary,
            opacity: pressed ? 0.9 : 1,
          },
        ]}
      >
        <Feather name="plus" size={20} color="#FFFFFF" />
        <ThemedText style={styles.saveButtonText}>
          Добавить в список
        </ThemedText>
      </Pressable>
    </ScreenKeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  field: {
    marginBottom: Spacing.xl,
  },
  label: {
    marginBottom: Spacing.sm,
  },
  input: {
    height: Spacing.inputHeight,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.lg,
    fontSize: Typography.body.fontSize,
  },
  row: {
    flexDirection: "row",
    gap: Spacing.lg,
  },
  unitsScroll: {
    marginTop: Spacing.xs,
  },
  unitPill: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginRight: Spacing.sm,
  },
  categoriesScroll: {
    marginHorizontal: -Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
  categoryPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginRight: Spacing.sm,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 52,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.lg,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
    marginLeft: Spacing.sm,
  },
});
