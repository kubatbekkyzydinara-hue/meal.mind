import React, { useState } from "react";
import { 
  View, 
  StyleSheet, 
  Pressable, 
  TextInput,
  ScrollView,
  Alert,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ScreenKeyboardAwareScrollView } from "@/components/ScreenKeyboardAwareScrollView";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useProducts } from "@/hooks/useAppState";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { HomeStackParamList } from "@/navigation/HomeStackNavigator";
import { 
  Product, 
  ProductCategory, 
  CATEGORY_LABELS, 
  CATEGORY_ICONS,
} from "@/types";
import { generateId, addDaysToDate, getDefaultExpiryDays } from "@/utils/helpers";

type NavigationProp = NativeStackNavigationProp<HomeStackParamList, "AddProduct">;
type RouteProps = RouteProp<HomeStackParamList, "AddProduct">;

const UNITS = ["шт", "кг", "г", "л", "мл", "упак"];

export default function AddProductScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { theme, isDark } = useTheme();
  const { addProduct, updateProduct } = useProducts();

  const existingProduct = route.params?.product;
  const isEditing = !!existingProduct;

  const [name, setName] = useState(existingProduct?.name || "");
  const [quantity, setQuantity] = useState(existingProduct?.quantity || "1");
  const [unit, setUnit] = useState(existingProduct?.unit || "шт");
  const [category, setCategory] = useState<ProductCategory>(
    existingProduct?.category || "other"
  );
  const [expiryDays, setExpiryDays] = useState(
    existingProduct 
      ? Math.ceil(
          (new Date(existingProduct.expiryDate).getTime() - Date.now()) / 
          (1000 * 60 * 60 * 24)
        ).toString()
      : "7"
  );

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Ошибка", "Введите название продукта");
      return;
    }

    const days = parseInt(expiryDays) || getDefaultExpiryDays(category);
    const expiryDate = addDaysToDate(new Date(), days).toISOString();

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (isEditing && existingProduct) {
      await updateProduct(existingProduct.id, {
        name: name.trim(),
        quantity,
        unit,
        category,
        expiryDate,
      });
    } else {
      const newProduct: Product = {
        id: generateId(),
        name: name.trim(),
        quantity,
        unit,
        category,
        expiryDate,
        addedAt: new Date().toISOString(),
      };
      await addProduct(newProduct);
    }

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
          placeholder="Например: Молоко 2.5%"
          placeholderTextColor={theme.placeholder}
          autoFocus={!isEditing}
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
                if (!isEditing) {
                  setExpiryDays(getDefaultExpiryDays(cat).toString());
                }
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

      <View style={styles.field}>
        <ThemedText type="h4" style={styles.label}>Срок годности (дней)</ThemedText>
        <View style={styles.expiryRow}>
          <Pressable
            onPress={() => {
              const val = Math.max(1, parseInt(expiryDays) - 1);
              setExpiryDays(val.toString());
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={[styles.expiryButton, { backgroundColor: theme.backgroundDefault }]}
          >
            <Feather name="minus" size={20} color={theme.text} />
          </Pressable>
          <TextInput
            style={[inputStyle, styles.expiryInput]}
            value={expiryDays}
            onChangeText={setExpiryDays}
            keyboardType="numeric"
            textAlign="center"
          />
          <Pressable
            onPress={() => {
              const val = parseInt(expiryDays) + 1;
              setExpiryDays(val.toString());
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={[styles.expiryButton, { backgroundColor: theme.backgroundDefault }]}
          >
            <Feather name="plus" size={20} color={theme.text} />
          </Pressable>
        </View>
      </View>

      <View style={styles.quickExpiry}>
        {[3, 7, 14, 30].map((days) => (
          <Pressable
            key={days}
            onPress={() => {
              setExpiryDays(days.toString());
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={[
              styles.quickExpiryPill,
              { 
                backgroundColor: expiryDays === days.toString() 
                  ? theme.primary 
                  : theme.backgroundDefault,
                borderColor: expiryDays === days.toString() 
                  ? theme.primary 
                  : theme.border,
              },
            ]}
          >
            <ThemedText 
              type="small"
              style={{ 
                color: expiryDays === days.toString() ? "#FFFFFF" : theme.text,
              }}
            >
              {days} дн.
            </ThemedText>
          </Pressable>
        ))}
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
        <Feather name="check" size={20} color="#FFFFFF" />
        <ThemedText style={styles.saveButtonText}>
          {isEditing ? "Сохранить изменения" : "Добавить продукт"}
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
  expiryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  expiryButton: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  expiryInput: {
    flex: 1,
    textAlign: "center",
  },
  quickExpiry: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing["2xl"],
  },
  quickExpiryPill: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: "center",
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
