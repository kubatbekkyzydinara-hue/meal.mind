import React, { useCallback, useState } from "react";
import { 
  View, 
  StyleSheet, 
  Pressable, 
  RefreshControl,
  Alert,
  Linking,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useShoppingList } from "@/hooks/useAppState";
import { Spacing, BorderRadius } from "@/constants/theme";
import { ShoppingStackParamList } from "@/navigation/ShoppingStackNavigator";
import { ShoppingItem, CATEGORY_LABELS } from "@/types";
import { getDeliveryLinks } from "@/utils/api";

type NavigationProp = NativeStackNavigationProp<ShoppingStackParamList, "Shopping">;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ShoppingItemCardProps {
  item: ShoppingItem;
  onToggle: () => void;
  onDelete: () => void;
}

function ShoppingItemCard({ item, onToggle, onDelete }: ShoppingItemCardProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleToggle = () => {
    scale.value = withSpring(0.95, {}, () => {
      scale.value = withSpring(1);
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle();
  };

  return (
    <AnimatedPressable
      onPress={handleToggle}
      onLongPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Alert.alert(
          "Удалить товар",
          `Удалить "${item.name}" из списка?`,
          [
            { text: "Отмена", style: "cancel" },
            { text: "Удалить", style: "destructive", onPress: onDelete },
          ]
        );
      }}
      style={[
        styles.itemCard,
        { 
          backgroundColor: theme.backgroundDefault,
          opacity: item.checked ? 0.6 : 1,
        },
        animatedStyle,
      ]}
    >
      <View style={[
        styles.checkbox,
        { 
          borderColor: item.checked ? theme.statusGreen : theme.border,
          backgroundColor: item.checked ? theme.statusGreen : "transparent",
        },
      ]}>
        {item.checked ? (
          <Feather name="check" size={14} color="#FFFFFF" />
        ) : null}
      </View>
      
      <View style={styles.itemContent}>
        <ThemedText 
          type="body" 
          style={[
            item.checked && { 
              textDecorationLine: "line-through",
              opacity: 0.7,
            },
          ]}
        >
          {item.name}
        </ThemedText>
        <ThemedText type="caption" secondary>
          {item.quantity} {item.unit} {item.fromRecipe ? `(${item.fromRecipe})` : ""}
        </ThemedText>
      </View>
    </AnimatedPressable>
  );
}

export default function ShoppingScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const { 
    items, 
    refresh, 
    toggleItem, 
    deleteItem, 
    clearChecked,
    checkedCount,
    totalCount,
  } = useShoppingList();
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

  const uncheckedItems = items.filter((i) => !i.checked);
  const checkedItems = items.filter((i) => i.checked);

  const handleDelivery = (service: "glovo" | "namba") => {
    const itemNames = uncheckedItems.map((i) => i.name);
    if (itemNames.length === 0) {
      Alert.alert("Список пуст", "Добавьте товары в список покупок");
      return;
    }
    
    const links = getDeliveryLinks(itemNames);
    const url = service === "glovo" ? links.glovo : links.nambaFood;
    Linking.openURL(url);
  };

  const handleClearChecked = () => {
    if (checkedCount === 0) return;
    
    Alert.alert(
      "Очистить купленные",
      `Удалить ${checkedCount} купленных товаров из списка?`,
      [
        { text: "Отмена", style: "cancel" },
        { text: "Очистить", onPress: clearChecked },
      ]
    );
  };

  const progress = totalCount > 0 ? checkedCount / totalCount : 0;

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
        {totalCount > 0 ? (
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <ThemedText type="body">
                {checkedCount} из {totalCount} куплено
              </ThemedText>
              {checkedCount > 0 ? (
                <Pressable onPress={handleClearChecked}>
                  <ThemedText type="link">Очистить</ThemedText>
                </Pressable>
              ) : null}
            </View>
            <View style={[styles.progressBar, { backgroundColor: theme.backgroundSecondary }]}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    backgroundColor: theme.statusGreen,
                    width: `${progress * 100}%`,
                  },
                ]} 
              />
            </View>
          </View>
        ) : null}

        {items.length > 0 ? (
          <>
            <View style={styles.deliverySection}>
              <View style={[styles.promoBanner, { backgroundColor: theme.primary }]}>
                <View style={styles.promoContent}>
                  <View>
                    <ThemedText type="h4" style={{ color: "#fff" }}>
                      Спецпредложение
                    </ThemedText>
                    <ThemedText type="caption" style={{ color: "rgba(255,255,255,0.8)" }}>
                      Скидка 30% на первый заказ
                    </ThemedText>
                  </View>
                  <Pressable
                    onPress={() => navigation.navigate("Delivery")}
                    style={styles.promoButton}
                  >
                    <Feather name="shopping-cart" size={16} color={theme.primary} />
                    <ThemedText type="body" style={{ color: theme.primary, fontWeight: "600", marginLeft: 4 }}>
                      Заказать
                    </ThemedText>
                  </Pressable>
                </View>
              </View>
              
              <ThemedText type="h4" style={styles.deliveryTitle}>
                Быстрый переход
              </ThemedText>
              <View style={styles.deliveryButtons}>
                <Pressable
                  onPress={() => handleDelivery("glovo")}
                  style={[styles.deliveryButton, { backgroundColor: "#FFC244" }]}
                >
                  <ThemedText style={{ color: "#000", fontWeight: "600" }}>
                    Glovo
                  </ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => handleDelivery("namba")}
                  style={[styles.deliveryButton, { backgroundColor: "#FF4B4B" }]}
                >
                  <ThemedText style={{ color: "#FFF", fontWeight: "600" }}>
                    NambaFood
                  </ThemedText>
                </Pressable>
              </View>
            </View>

            {uncheckedItems.length > 0 ? (
              <>
                <ThemedText type="h3" style={styles.sectionTitle}>
                  Нужно купить ({uncheckedItems.length})
                </ThemedText>
                <View style={styles.itemsList}>
                  {uncheckedItems.map((item) => (
                    <ShoppingItemCard
                      key={item.id}
                      item={item}
                      onToggle={() => toggleItem(item.id)}
                      onDelete={() => deleteItem(item.id)}
                    />
                  ))}
                </View>
              </>
            ) : null}

            {checkedItems.length > 0 ? (
              <>
                <ThemedText type="h3" style={styles.sectionTitle}>
                  Куплено ({checkedItems.length})
                </ThemedText>
                <View style={styles.itemsList}>
                  {checkedItems.map((item) => (
                    <ShoppingItemCard
                      key={item.id}
                      item={item}
                      onToggle={() => toggleItem(item.id)}
                      onDelete={() => deleteItem(item.id)}
                    />
                  ))}
                </View>
              </>
            ) : null}
          </>
        ) : (
          <View style={[styles.emptyState, { backgroundColor: theme.backgroundDefault }]}>
            <Feather name="shopping-cart" size={64} color={theme.textSecondary} />
            <ThemedText type="h3" style={styles.emptyTitle}>
              Список пуст
            </ThemedText>
            <ThemedText type="body" secondary style={styles.emptyText}>
              Добавьте продукты в список покупок или сгенерируйте рецепт
            </ThemedText>
            <Pressable
              onPress={() => navigation.navigate("AddShoppingItem")}
              style={[styles.addButton, { backgroundColor: theme.primary }]}
            >
              <Feather name="plus" size={20} color="#FFFFFF" />
              <ThemedText style={{ color: "#FFFFFF", marginLeft: 8, fontWeight: "600" }}>
                Добавить товар
              </ThemedText>
            </Pressable>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScreenScrollView>

      {items.length > 0 ? (
        <Pressable
          onPress={() => navigation.navigate("AddShoppingItem")}
          style={({ pressed }) => [
            styles.fab,
            { 
              backgroundColor: theme.primary,
              opacity: pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.96 : 1 }],
            },
          ]}
        >
          <Feather name="plus" size={24} color="#FFFFFF" />
        </Pressable>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  progressSection: {
    marginBottom: Spacing.xl,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  deliverySection: {
    marginBottom: Spacing.xl,
  },
  promoBanner: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  promoContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  promoButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  deliveryTitle: {
    marginBottom: Spacing.md,
  },
  deliveryButtons: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  deliveryButton: {
    flex: 1,
    height: 44,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  itemsList: {
    gap: Spacing.sm,
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
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
  itemContent: {
    flex: 1,
  },
  emptyState: {
    alignItems: "center",
    padding: Spacing["3xl"],
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.xl,
  },
  emptyTitle: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  fab: {
    position: "absolute",
    bottom: 100,
    right: Spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
});
