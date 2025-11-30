import React, { useState, useCallback } from "react";
import { 
  View, 
  StyleSheet, 
  Pressable, 
  Alert,
  RefreshControl,
  ScrollView,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useProducts } from "@/hooks/useAppState";
import { Spacing, BorderRadius } from "@/constants/theme";
import { HomeStackParamList } from "@/navigation/HomeStackNavigator";
import { 
  Product, 
  ExpiryStatus, 
  CATEGORY_LABELS,
  ProductCategory,
} from "@/types";
import { 
  getExpiryStatus, 
  formatExpiryText, 
  groupProductsByCategory,
  sortProductsByExpiry,
} from "@/utils/helpers";

type NavigationProp = NativeStackNavigationProp<HomeStackParamList, "Stock">;

type FilterType = "all" | "critical" | "warning" | "fresh";

const FILTERS: { key: FilterType; label: string }[] = [
  { key: "all", label: "Все" },
  { key: "critical", label: "Критично" },
  { key: "warning", label: "Скоро" },
  { key: "fresh", label: "Свежее" },
];

interface FilterPillProps {
  label: string;
  active: boolean;
  color?: string;
  onPress: () => void;
}

function FilterPill({ label, active, color, onPress }: FilterPillProps) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={[
        styles.filterPill,
        {
          backgroundColor: active ? (color || theme.primary) : theme.backgroundDefault,
          borderColor: active ? (color || theme.primary) : theme.border,
        },
      ]}
    >
      <ThemedText
        type="small"
        style={{ 
          color: active ? "#FFFFFF" : theme.text,
          fontWeight: active ? "600" : "400",
        }}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

interface SwipeableProductItemProps {
  product: Product;
  onDelete: () => void;
  onEdit: () => void;
}

function SwipeableProductItem({ product, onDelete, onEdit }: SwipeableProductItemProps) {
  const { theme } = useTheme();
  const translateX = useSharedValue(0);
  const status = getExpiryStatus(product.expiryDate);
  const statusColor = 
    status === 'critical' ? theme.statusRed : 
    status === 'warning' ? theme.statusYellow : 
    theme.statusGreen;

  const gesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = Math.max(-120, Math.min(0, event.translationX));
    })
    .onEnd((event) => {
      if (translateX.value < -80) {
        translateX.value = withSpring(-120);
      } else {
        translateX.value = withSpring(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const actionsStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.abs(translateX.value) / 60),
  }));

  const handleDelete = () => {
    Alert.alert(
      "Удалить продукт",
      `Вы уверены, что хотите удалить "${product.name}"?`,
      [
        { text: "Отмена", style: "cancel" },
        { 
          text: "Удалить", 
          style: "destructive",
          onPress: onDelete,
        },
      ]
    );
  };

  return (
    <View style={styles.swipeableContainer}>
      <Animated.View style={[styles.swipeActions, actionsStyle]}>
        <Pressable
          onPress={onEdit}
          style={[styles.swipeAction, { backgroundColor: theme.primary }]}
        >
          <Feather name="edit-2" size={20} color="#FFFFFF" />
        </Pressable>
        <Pressable
          onPress={handleDelete}
          style={[styles.swipeAction, { backgroundColor: theme.statusRed }]}
        >
          <Feather name="trash-2" size={20} color="#FFFFFF" />
        </Pressable>
      </Animated.View>

      <GestureDetector gesture={gesture}>
        <Animated.View
          style={[
            styles.productItem,
            { backgroundColor: theme.backgroundDefault },
            animatedStyle,
          ]}
        >
          <View style={[styles.statusBorder, { backgroundColor: statusColor }]} />
          <View style={styles.productContent}>
            <View style={styles.productInfo}>
              <ThemedText type="h4">{product.name}</ThemedText>
              <ThemedText type="small" secondary>
                {product.quantity} {product.unit}
              </ThemedText>
            </View>
            <View style={styles.expiryInfo}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <ThemedText type="caption" style={{ color: statusColor }}>
                {formatExpiryText(product.expiryDate)}
              </ThemedText>
            </View>
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

export default function StockScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const { products, refresh, deleteProduct, loading } = useProducts();
  const [filter, setFilter] = useState<FilterType>("all");
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const filteredProducts = products.filter((p) => {
    if (filter === "all") return true;
    return getExpiryStatus(p.expiryDate) === filter;
  });

  const sortedProducts = sortProductsByExpiry(filteredProducts);

  const getFilterColor = (key: FilterType): string | undefined => {
    switch (key) {
      case "critical": return theme.statusRed;
      case "warning": return theme.statusYellow;
      case "fresh": return theme.statusGreen;
      default: return undefined;
    }
  };

  const handleGenerateRecipe = () => {
    navigation.navigate("GenerateRecipe");
  };

  return (
    <>
      <ScreenScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
          />
        }
      >
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filtersContainer}
          contentContainerStyle={styles.filtersContent}
        >
          {FILTERS.map((f) => (
            <FilterPill
              key={f.key}
              label={f.label}
              active={filter === f.key}
              color={getFilterColor(f.key)}
              onPress={() => setFilter(f.key)}
            />
          ))}
        </ScrollView>

        <View style={styles.summary}>
          <ThemedText type="body" secondary>
            {sortedProducts.length} {sortedProducts.length === 1 ? 'продукт' : 'продуктов'}
          </ThemedText>
        </View>

        {sortedProducts.length > 0 ? (
          <View style={styles.productsList}>
            {sortedProducts.map((product) => (
              <SwipeableProductItem
                key={product.id}
                product={product}
                onDelete={() => deleteProduct(product.id)}
                onEdit={() => navigation.navigate("AddProduct", { product })}
              />
            ))}
          </View>
        ) : (
          <View style={[styles.emptyState, { backgroundColor: theme.backgroundDefault }]}>
            <Feather name="inbox" size={64} color={theme.textSecondary} />
            <ThemedText type="h3" style={styles.emptyTitle}>
              Холодильник пуст
            </ThemedText>
            <ThemedText type="body" secondary style={styles.emptyText}>
              Отсканируйте ваш холодильник или добавьте продукты вручную
            </ThemedText>
            <Pressable
              onPress={() => navigation.navigate("Scan")}
              style={[styles.emptyButton, { backgroundColor: theme.primary }]}
            >
              <Feather name="camera" size={20} color="#FFFFFF" />
              <ThemedText style={{ color: "#FFFFFF", marginLeft: 8, fontWeight: "600" }}>
                Сканировать
              </ThemedText>
            </Pressable>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScreenScrollView>

      {sortedProducts.length > 0 ? (
        <Pressable
          onPress={handleGenerateRecipe}
          style={({ pressed }) => [
            styles.fab,
            { 
              backgroundColor: theme.primary,
              opacity: pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.96 : 1 }],
            },
          ]}
        >
          <Feather name="zap" size={24} color="#FFFFFF" />
          <ThemedText style={styles.fabText}>Сгенерировать рецепт</ThemedText>
        </Pressable>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  filtersContainer: {
    marginHorizontal: -Spacing.xl,
    marginBottom: Spacing.lg,
  },
  filtersContent: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  filterPill: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  summary: {
    marginBottom: Spacing.lg,
  },
  productsList: {
    gap: Spacing.md,
  },
  swipeableContainer: {
    position: "relative",
    overflow: "hidden",
    borderRadius: BorderRadius.md,
  },
  swipeActions: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
  },
  swipeAction: {
    width: 60,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  productItem: {
    flexDirection: "row",
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  statusBorder: {
    width: 4,
  },
  productContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
  },
  productInfo: {
    flex: 1,
  },
  expiryInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.sm,
  },
  emptyState: {
    alignItems: "center",
    padding: Spacing["3xl"],
    borderRadius: BorderRadius.lg,
    marginTop: Spacing["2xl"],
  },
  emptyTitle: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  fab: {
    position: "absolute",
    bottom: 100,
    left: Spacing.xl,
    right: Spacing.xl,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 52,
    borderRadius: BorderRadius.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    color: "#FFFFFF",
    fontWeight: "600",
    marginLeft: Spacing.sm,
    fontSize: 16,
  },
});
