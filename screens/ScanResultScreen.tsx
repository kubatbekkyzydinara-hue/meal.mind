import React, { useState } from "react";
import { 
  View, 
  StyleSheet, 
  Pressable, 
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useProducts, useUserStats, useRecipes } from "@/hooks/useAppState";
import { useApiKey } from "@/context/ApiKeyContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { HomeStackParamList } from "@/navigation/HomeStackNavigator";
import { Product, CATEGORY_LABELS } from "@/types";
import { formatDate } from "@/utils/helpers";
import { generateRecipeWithGemini } from "@/utils/api";

type NavigationProp = NativeStackNavigationProp<HomeStackParamList, "ScanResult">;
type RouteProps = RouteProp<HomeStackParamList, "ScanResult">;

interface ProductResultItemProps {
  product: Product;
  selected: boolean;
  onToggle: () => void;
  onEdit: () => void;
}

function ProductResultItem({ product, selected, onToggle, onEdit }: ProductResultItemProps) {
  const { theme } = useTheme();
  const confidence = Math.round((product.confidence || 0.8) * 100);

  return (
    <Pressable
      onPress={onToggle}
      style={[
        styles.productItem,
        { 
          backgroundColor: theme.backgroundDefault,
          borderColor: selected ? theme.primary : "transparent",
          borderWidth: 2,
        },
      ]}
    >
      <View style={[
        styles.checkbox,
        { 
          backgroundColor: selected ? theme.primary : "transparent",
          borderColor: selected ? theme.primary : theme.border,
        },
      ]}>
        {selected ? (
          <Feather name="check" size={14} color="#FFFFFF" />
        ) : null}
      </View>

      <View style={styles.productInfo}>
        <ThemedText type="h4">{product.name}</ThemedText>
        <View style={styles.productMeta}>
          <ThemedText type="caption" secondary>
            {product.quantity} {product.unit}
          </ThemedText>
          <View style={[styles.categoryBadge, { backgroundColor: theme.backgroundSecondary }]}>
            <ThemedText type="caption" secondary>
              {CATEGORY_LABELS[product.category]}
            </ThemedText>
          </View>
        </View>
        <View style={styles.confidenceRow}>
          <View style={[styles.confidenceBar, { backgroundColor: theme.backgroundSecondary }]}>
            <View 
              style={[
                styles.confidenceFill, 
                { 
                  backgroundColor: confidence > 70 ? theme.statusGreen : theme.statusYellow,
                  width: `${confidence}%`,
                },
              ]} 
            />
          </View>
          <ThemedText type="caption" secondary>
            {confidence}%
          </ThemedText>
        </View>
      </View>

      <Pressable
        onPress={(e) => {
          e.stopPropagation();
          onEdit();
        }}
        style={styles.editButton}
        hitSlop={8}
      >
        <Feather name="edit-2" size={18} color={theme.textSecondary} />
      </Pressable>
    </Pressable>
  );
}

export default function ScanResultScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { addProducts } = useProducts();
  const { incrementStat } = useUserStats();
  const { addToHistory } = useRecipes();
  const { apiKey, isConfigured } = useApiKey();
  
  const { products: scannedProducts, imageUri } = route.params;
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(scannedProducts.map((p) => p.id))
  );
  const [isGeneratingMenu, setIsGeneratingMenu] = useState(false);

  const toggleProduct = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAll = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (selectedIds.size === scannedProducts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(scannedProducts.map((p) => p.id)));
    }
  };

  const handleSave = async () => {
    const selectedProducts = scannedProducts.filter((p) => selectedIds.has(p.id));
    
    if (selectedProducts.length === 0) {
      Alert.alert("Выберите продукты", "Выберите хотя бы один продукт для добавления");
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    await addProducts(selectedProducts);
    await incrementStat("productsScanned", selectedProducts.length);

    Alert.alert(
      "Продукты добавлены",
      `Добавлено ${selectedProducts.length} продуктов в ваш холодильник`,
      [
        { 
          text: "Отлично", 
          onPress: () => navigation.navigate("Stock"),
        },
      ]
    );
  };

  const handleEdit = (product: Product) => {
    navigation.navigate("AddProduct", { product });
  };

  const handleGenerateMenu = async () => {
    if (!isConfigured) {
      Alert.alert("API ключ не настроен", "Перейдите в Настройки и добавьте ваш Google Gemini API ключ");
      return;
    }

    const selectedProducts = scannedProducts.filter((p) => selectedIds.has(p.id));
    
    if (selectedProducts.length === 0) {
      Alert.alert("Выберите продукты", "Выберите хотя бы один продукт для создания меню");
      return;
    }

    setIsGeneratingMenu(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const recipe = await generateRecipeWithGemini(selectedProducts, apiKey, {
        servings: 4,
        maxTime: 45,
      });
      
      await addToHistory(recipe);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      navigation.navigate("RecipeDetail", { recipe });
    } catch (error: any) {
      Alert.alert("Ошибка", error.message || "Не удалось создать меню");
    } finally {
      setIsGeneratingMenu(false);
    }
  };

  return (
    <>
      <ScreenScrollView>
        {imageUri ? (
          <View style={styles.imageContainer}>
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
          </View>
        ) : null}

        <View style={styles.header}>
          <ThemedText type="h3">
            Найдено {scannedProducts.length} продуктов
          </ThemedText>
          <Pressable onPress={toggleAll}>
            <ThemedText type="link">
              {selectedIds.size === scannedProducts.length ? "Снять все" : "Выбрать все"}
            </ThemedText>
          </Pressable>
        </View>

        <View style={styles.productsList}>
          {scannedProducts.map((product) => (
            <ProductResultItem
              key={product.id}
              product={product}
              selected={selectedIds.has(product.id)}
              onToggle={() => toggleProduct(product.id)}
              onEdit={() => handleEdit(product)}
            />
          ))}
        </View>

        <View style={{ height: 160 }} />
      </ScreenScrollView>

      <View style={[styles.footer, { backgroundColor: theme.backgroundRoot, paddingBottom: Math.max(insets.bottom, 20) + Spacing.md }]}>
        <Pressable
          onPress={handleSave}
          disabled={isGeneratingMenu}
          style={({ pressed }) => [
            styles.actionButton,
            { 
              backgroundColor: theme.primary,
              opacity: pressed || isGeneratingMenu ? 0.7 : 1,
            },
          ]}
        >
          <Feather name="package" size={20} color="#FFFFFF" />
          <ThemedText style={styles.actionButtonText}>
            Добавить в запасы ({selectedIds.size})
          </ThemedText>
        </Pressable>

        <Pressable
          onPress={handleGenerateMenu}
          disabled={isGeneratingMenu || selectedIds.size === 0}
          style={({ pressed }) => [
            styles.actionButton,
            { 
              backgroundColor: theme.statusGreen,
              opacity: pressed || isGeneratingMenu || selectedIds.size === 0 ? 0.7 : 1,
            },
          ]}
        >
          {isGeneratingMenu ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Feather name="book-open" size={20} color="#FFFFFF" />
          )}
          <ThemedText style={styles.actionButtonText}>
            {isGeneratingMenu ? "Генерация..." : "Сгенерировать меню"}
          </ThemedText>
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  imageContainer: {
    marginBottom: Spacing.xl,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  previewImage: {
    width: "100%",
    height: 200,
    resizeMode: "cover",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  productsList: {
    gap: Spacing.md,
  },
  productItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  productInfo: {
    flex: 1,
  },
  productMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  categoryBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  confidenceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  confidenceBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  confidenceFill: {
    height: "100%",
    borderRadius: 2,
  },
  editButton: {
    padding: Spacing.sm,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 52,
    borderRadius: BorderRadius.md,
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
    marginLeft: Spacing.sm,
  },
});
