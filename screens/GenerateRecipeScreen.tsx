import React, { useState, useEffect } from "react";
import { 
  View, 
  StyleSheet, 
  Pressable, 
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useProducts, useRecipes, useUserStats } from "@/hooks/useAppState";
import { useApiKey } from "@/context/ApiKeyContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { HomeStackParamList } from "@/navigation/HomeStackNavigator";
import { Product, Recipe } from "@/types";
import { generateRecipeWithGemini } from "@/utils/api";
import { getExpiryStatus, sortProductsByExpiry } from "@/utils/helpers";

type NavigationProp = NativeStackNavigationProp<HomeStackParamList, "GenerateRecipe">;

const LOADING_MESSAGES = [
  "AI анализирует ваши продукты...",
  "Подбираем лучший рецепт...",
  "Учитываем срок годности...",
  "Создаем вкусное блюдо...",
  "Почти готово...",
];

interface ProductSelectItemProps {
  product: Product;
  selected: boolean;
  onToggle: () => void;
}

function ProductSelectItem({ product, selected, onToggle }: ProductSelectItemProps) {
  const { theme } = useTheme();
  const status = getExpiryStatus(product.expiryDate);
  const statusColor = 
    status === 'critical' ? theme.statusRed : 
    status === 'warning' ? theme.statusYellow : 
    theme.statusGreen;

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
      <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
      <View style={styles.productInfo}>
        <ThemedText type="body" numberOfLines={1}>{product.name}</ThemedText>
        <ThemedText type="caption" secondary>
          {product.quantity} {product.unit}
        </ThemedText>
      </View>
      <View style={[
        styles.checkbox,
        { 
          backgroundColor: selected ? theme.primary : "transparent",
          borderColor: selected ? theme.primary : theme.border,
        },
      ]}>
        {selected ? <Feather name="check" size={14} color="#FFFFFF" /> : null}
      </View>
    </Pressable>
  );
}

export default function GenerateRecipeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { products } = useProducts();
  const { addToHistory } = useRecipes();
  const { incrementStat } = useUserStats();
  const { apiKey, isConfigured } = useApiKey();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [servings, setServings] = useState(4);

  const pulseOpacity = useSharedValue(1);

  useEffect(() => {
    if (isGenerating) {
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.5, { duration: 800 }),
          withTiming(1, { duration: 800 })
        ),
        -1,
        false
      );

      const interval = setInterval(() => {
        setLoadingMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [isGenerating]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  const sortedProducts = sortProductsByExpiry(products);
  
  useEffect(() => {
    const expiringIds = sortedProducts
      .filter((p) => getExpiryStatus(p.expiryDate) !== 'fresh')
      .slice(0, 5)
      .map((p) => p.id);
    setSelectedIds(new Set(expiringIds));
  }, [products]);

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

  const handleGenerate = async () => {
    if (!isConfigured) {
      Alert.alert(
        "API ключ не настроен",
        "Перейдите в Профиль > Настройки и добавьте ваш Google Gemini API ключ"
      );
      return;
    }

    setIsGenerating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const selectedProducts = selectedIds.size > 0 
        ? products.filter((p) => selectedIds.has(p.id))
        : [];
      const recipe = await generateRecipeWithGemini(selectedProducts, apiKey, { servings });

      await addToHistory(recipe);
      await incrementStat("recipesGenerated");
      await incrementStat("timeSaved", recipe.cookTime);
      await incrementStat("moneySaved", 150 * selectedProducts.filter(
        (p) => getExpiryStatus(p.expiryDate) === 'critical'
      ).length);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.replace("RecipeDetail", { recipe });
    } catch (error: any) {
      console.error("Generate error:", error);
      Alert.alert(
        "Ошибка генерации",
        error.message || "Не удалось сгенерировать рецепт. Попробуйте еще раз."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  if (isGenerating) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.backgroundRoot }]}>
        <Animated.View style={[styles.loadingContent, animatedStyle]}>
          <View style={[styles.loadingIcon, { backgroundColor: theme.primary + "20" }]}>
            <Feather name="zap" size={48} color={theme.primary} />
          </View>
          <ThemedText type="h2" style={styles.loadingTitle}>
            {LOADING_MESSAGES[loadingMessageIndex]}
          </ThemedText>
          <ThemedText type="body" secondary style={styles.loadingSubtitle}>
            Gemini 2.0 Flash создает рецепт специально для вас
          </ThemedText>
        </Animated.View>
        <ActivityIndicator size="large" color={theme.primary} style={styles.spinner} />
      </View>
    );
  }

  return (
    <>
      <ScreenScrollView>
        <View style={[styles.infoCard, { backgroundColor: theme.primary + "15" }]}>
          <Feather name="info" size={20} color={theme.primary} />
          <View style={styles.infoContent}>
            <ThemedText type="h4">Умная генерация</ThemedText>
            <ThemedText type="small" secondary>
              AI приоритетно использует продукты, которые скоро испортятся
            </ThemedText>
          </View>
        </View>

        <View style={styles.servingsSection}>
          <ThemedText type="h4">Количество порций</ThemedText>
          <View style={styles.servingsRow}>
            <Pressable
              onPress={() => {
                setServings(Math.max(1, servings - 1));
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={[styles.servingsButton, { backgroundColor: theme.backgroundDefault }]}
            >
              <Feather name="minus" size={20} color={theme.text} />
            </Pressable>
            <ThemedText type="h2" style={styles.servingsValue}>{servings}</ThemedText>
            <Pressable
              onPress={() => {
                setServings(servings + 1);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={[styles.servingsButton, { backgroundColor: theme.backgroundDefault }]}
            >
              <Feather name="plus" size={20} color={theme.text} />
            </Pressable>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <ThemedText type="h3">
            Выберите продукты ({selectedIds.size})
          </ThemedText>
          <Pressable
            onPress={() => {
              if (selectedIds.size === products.length) {
                setSelectedIds(new Set());
              } else {
                setSelectedIds(new Set(products.map((p) => p.id)));
              }
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }}
          >
            <ThemedText type="link">
              {selectedIds.size === products.length ? "Снять все" : "Выбрать все"}
            </ThemedText>
          </Pressable>
        </View>

        {sortedProducts.length > 0 ? (
          <View style={styles.productsList}>
            {sortedProducts.map((product) => (
              <ProductSelectItem
                key={product.id}
                product={product}
                selected={selectedIds.has(product.id)}
                onToggle={() => toggleProduct(product.id)}
              />
            ))}
          </View>
        ) : (
          <View style={[styles.emptyState, { backgroundColor: theme.backgroundDefault }]}>
            <Feather name="inbox" size={48} color={theme.textSecondary} />
            <ThemedText type="h4" style={styles.emptyTitle}>
              Нет продуктов
            </ThemedText>
            <ThemedText type="body" secondary>
              Сначала добавьте продукты в холодильник
            </ThemedText>
          </View>
        )}

        <View style={{ height: 140 }} />
      </ScreenScrollView>

      <View style={[
        styles.footer, 
        { 
          backgroundColor: theme.backgroundRoot,
          paddingBottom: Math.max(insets.bottom, 20) + Spacing.md,
        }
      ]}>
        <Pressable
          onPress={handleGenerate}
          style={({ pressed }) => [
            styles.generateButton,
            { 
              backgroundColor: theme.primary,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <Feather name="zap" size={20} color="#FFFFFF" />
          <ThemedText style={styles.generateButtonText}>
            {products.length > 0 && selectedIds.size > 0 
              ? "Сгенерировать рецепт" 
              : "Сгенерировать случайный рецепт"}
          </ThemedText>
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
  },
  loadingContent: {
    alignItems: "center",
  },
  loadingIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xl,
  },
  loadingTitle: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  loadingSubtitle: {
    textAlign: "center",
  },
  spinner: {
    marginTop: Spacing["3xl"],
  },
  infoCard: {
    flexDirection: "row",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xl,
  },
  infoContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  servingsSection: {
    marginBottom: Spacing.xl,
  },
  servingsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.md,
    gap: Spacing.xl,
  },
  servingsButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  servingsValue: {
    minWidth: 48,
    textAlign: "center",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  productsList: {
    gap: Spacing.sm,
  },
  productItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: Spacing.md,
  },
  productInfo: {
    flex: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    alignItems: "center",
    padding: Spacing["2xl"],
    borderRadius: BorderRadius.md,
  },
  emptyTitle: {
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
  },
  generateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 52,
    borderRadius: BorderRadius.md,
  },
  generateButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
    marginLeft: Spacing.sm,
  },
});
