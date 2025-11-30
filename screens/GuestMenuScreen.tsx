import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";

import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useUserProfile } from "@/context/UserProfileContext";
import { useApiKey } from "@/context/ApiKeyContext";
import { generateGuestMenuWithGemini } from "@/utils/api";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { HomeStackParamList } from "@/navigation/HomeStackNavigator";
import { Recipe, ShoppingItem } from "@/types";

type NavigationProp = NativeStackNavigationProp<HomeStackParamList>;

type Budget = "economy" | "standard" | "premium";

const BUDGET_OPTIONS: { id: Budget; name: string; range: string; color: string }[] = [
  { id: "economy", name: "Эконом", range: "650-1100 сом/чел", color: "#4CAF50" },
  { id: "standard", name: "Стандарт", range: "1100-1800 сом/чел", color: "#FF9800" },
  { id: "premium", name: "Премиум", range: "1800+ сом/чел", color: "#9C27B0" },
];

const CITIES = [
  "Бишкек", "Ош", "Джалал-Абад", "Каракол", "Токмок", "Нарын", "Талас"
];

interface GeneratedMenu {
  appetizers: { name: string; portions: number; cost: number }[];
  mains: { name: string; portions: number; cost: number }[];
  desserts: { name: string; portions: number; cost: number }[];
  beverages: { name: string; portions: number; cost: number }[];
  totalCost: number;
  shoppingList: { name: string; quantity: string }[];
}

function MenuSection({ 
  title, 
  icon, 
  items, 
  color 
}: { 
  title: string; 
  icon: keyof typeof Feather.glyphMap;
  items: { name: string; portions: number; cost: number }[];
  color: string;
}) {
  const { theme } = useTheme();
  
  if (items.length === 0) return null;
  
  return (
    <View style={[styles.menuSection, { backgroundColor: theme.backgroundDefault }]}>
      <View style={styles.menuSectionHeader}>
        <View style={[styles.menuSectionIcon, { backgroundColor: color + "20" }]}>
          <Feather name={icon} size={18} color={color} />
        </View>
        <ThemedText type="h4">{title}</ThemedText>
      </View>
      
      {items.map((item, index) => (
        <View key={index} style={[styles.menuItem, { borderBottomColor: theme.border }]}>
          <View style={styles.menuItemInfo}>
            <ThemedText type="body">{item.name}</ThemedText>
            <ThemedText type="caption" secondary>
              {item.portions} порций
            </ThemedText>
          </View>
          <ThemedText type="body" style={{ fontWeight: "600" }}>
            {item.cost} сом
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

export default function GuestMenuScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const { profile } = useUserProfile();
  const { apiKey } = useApiKey();
  
  const [guestCount, setGuestCount] = useState(6);
  const [budget, setBudget] = useState<Budget>("standard");
  const [city, setCity] = useState(profile?.city || "Бишкек");
  const [loading, setLoading] = useState(false);
  const [menu, setMenu] = useState<GeneratedMenu | null>(null);
  
  const handleGenerate = async () => {
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      const result = await generateGuestMenuWithGemini(guestCount, budget, city, apiKey);
      const formattedMenu: GeneratedMenu = {
        appetizers: result.appetizers.map(r => ({ name: r.title, portions: guestCount, cost: Math.round(result.totalCost / 8) })),
        mains: result.mains.map(r => ({ name: r.title, portions: guestCount, cost: Math.round(result.totalCost / 4) })),
        desserts: result.desserts.map(r => ({ name: r.title, portions: guestCount, cost: Math.round(result.totalCost / 10) })),
        beverages: result.beverages.map(b => ({ name: b.name, portions: guestCount, cost: Math.round(result.totalCost / 12) })),
        totalCost: result.totalCost,
        shoppingList: result.shoppingList.map(i => ({ name: i.name, quantity: `${i.quantity} ${i.unit}` })),
      };
      setMenu(formattedMenu);
    } catch (error) {
      console.error("Error generating menu:", error);
      Alert.alert(
        "Ошибка генерации",
        "Не удалось сгенерировать меню. Проверьте подключение к интернету и попробуйте снова.",
        [
          { text: "Повторить", onPress: handleGenerate },
          { text: "Отмена", style: "cancel" },
        ]
      );
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddToShopping = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    navigation.goBack();
  };

  return (
    <ScreenScrollView>
      {menu === null ? (
        <>
          <View style={[styles.section, { backgroundColor: theme.backgroundDefault }]}>
            <ThemedText type="h3" style={styles.sectionTitle}>
              Город
            </ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.cityOptions}>
                {CITIES.map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setCity(c);
                    }}
                    style={[
                      styles.cityChip,
                      { 
                        backgroundColor: city === c ? theme.primary : theme.border,
                      },
                    ]}
                  >
                    <ThemedText 
                      type="caption" 
                      style={{ color: city === c ? "#fff" : theme.text }}
                    >
                      {c}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>
          
          <View style={[styles.section, { backgroundColor: theme.backgroundDefault }]}>
            <ThemedText type="h3" style={styles.sectionTitle}>
              Количество гостей
            </ThemedText>
            
            <View style={styles.counterRow}>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setGuestCount(Math.max(1, guestCount - 1));
                }}
                style={[styles.counterButton, { backgroundColor: theme.border }]}
              >
                <Feather name="minus" size={24} color={theme.text} />
              </Pressable>
              
              <View style={styles.counterDisplay}>
                <ThemedText type="h1" style={{ color: theme.primary }}>
                  {guestCount}
                </ThemedText>
                <ThemedText type="caption" secondary>
                  {guestCount === 1 ? "гость" : guestCount < 5 ? "гостя" : "гостей"}
                </ThemedText>
              </View>
              
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setGuestCount(Math.min(20, guestCount + 1));
                }}
                style={[styles.counterButton, { backgroundColor: theme.primary }]}
              >
                <Feather name="plus" size={24} color="#fff" />
              </Pressable>
            </View>
          </View>
          
          <View style={[styles.section, { backgroundColor: theme.backgroundDefault }]}>
            <ThemedText type="h3" style={styles.sectionTitle}>
              Бюджет на человека
            </ThemedText>
            
            {BUDGET_OPTIONS.map((option) => (
              <Pressable
                key={option.id}
                onPress={() => {
                  Haptics.selectionAsync();
                  setBudget(option.id);
                }}
                style={[
                  styles.budgetOption,
                  { 
                    borderColor: budget === option.id ? option.color : theme.border,
                    backgroundColor: budget === option.id ? option.color + "10" : "transparent",
                  },
                ]}
              >
                <View style={[styles.budgetIcon, { backgroundColor: option.color + "20" }]}>
                  <Feather 
                    name={option.id === "economy" ? "dollar-sign" : option.id === "standard" ? "star" : "award"} 
                    size={20} 
                    color={option.color} 
                  />
                </View>
                <View style={styles.budgetInfo}>
                  <ThemedText type="body" style={{ fontWeight: "600" }}>
                    {option.name}
                  </ThemedText>
                  <ThemedText type="caption" secondary>
                    {option.range}
                  </ThemedText>
                </View>
                {budget === option.id ? (
                  <Feather name="check-circle" size={24} color={option.color} />
                ) : null}
              </Pressable>
            ))}
          </View>
          
          <Pressable
            onPress={handleGenerate}
            disabled={loading}
            style={[
              styles.generateButton, 
              { backgroundColor: theme.primary },
              loading && { opacity: 0.7 },
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Feather name="zap" size={20} color="#fff" />
                <ThemedText type="body" style={styles.generateButtonText}>
                  Сгенерировать меню для гостей
                </ThemedText>
              </>
            )}
          </Pressable>
        </>
      ) : (
        <>
          <Animated.View entering={FadeInDown.delay(0).duration(400)}>
            <View style={[styles.summaryCard, { backgroundColor: theme.primary }]}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Feather name="users" size={24} color="#fff" />
                  <ThemedText type="h3" style={styles.summaryText}>
                    {guestCount} гостей
                  </ThemedText>
                </View>
                <View style={styles.summaryItem}>
                  <Feather name="map-pin" size={24} color="#fff" />
                  <ThemedText type="h3" style={styles.summaryText}>
                    {city}
                  </ThemedText>
                </View>
              </View>
              <View style={styles.totalCostRow}>
                <ThemedText type="body" style={{ color: "rgba(255,255,255,0.8)" }}>
                  Общая стоимость:
                </ThemedText>
                <ThemedText type="h2" style={styles.totalCost}>
                  {menu.totalCost.toLocaleString()} сом
                </ThemedText>
              </View>
            </View>
          </Animated.View>
          
          <Animated.View entering={FadeInDown.delay(100).duration(400)}>
            <MenuSection 
              title="Закуски" 
              icon="coffee" 
              items={menu.appetizers}
              color="#4CAF50"
            />
          </Animated.View>
          
          <Animated.View entering={FadeInDown.delay(200).duration(400)}>
            <MenuSection 
              title="Основные блюда" 
              icon="award" 
              items={menu.mains}
              color={theme.primary}
            />
          </Animated.View>
          
          <Animated.View entering={FadeInDown.delay(300).duration(400)}>
            <MenuSection 
              title="Десерты" 
              icon="heart" 
              items={menu.desserts}
              color="#E91E63"
            />
          </Animated.View>
          
          <Animated.View entering={FadeInDown.delay(400).duration(400)}>
            <MenuSection 
              title="Напитки" 
              icon="droplet" 
              items={menu.beverages}
              color="#2196F3"
            />
          </Animated.View>
          
          <Animated.View entering={FadeInDown.delay(500).duration(400)}>
            <View style={[styles.shoppingSection, { backgroundColor: theme.backgroundDefault }]}>
              <ThemedText type="h3" style={styles.sectionTitle}>
                Список покупок ({menu.shoppingList.length})
              </ThemedText>
              
              {menu.shoppingList.map((item, index) => (
                <View key={index} style={[styles.shoppingItem, { borderBottomColor: theme.border }]}>
                  <Feather name="circle" size={16} color={theme.textSecondary} />
                  <ThemedText type="body" style={{ flex: 1, marginLeft: Spacing.sm }}>
                    {item.name}
                  </ThemedText>
                  <ThemedText type="body" secondary>
                    {item.quantity}
                  </ThemedText>
                </View>
              ))}
            </View>
          </Animated.View>
          
          <View style={styles.buttonGroup}>
            <Pressable
              onPress={handleAddToShopping}
              style={[styles.actionButton, { backgroundColor: theme.primary }]}
            >
              <Feather name="shopping-cart" size={20} color="#fff" />
              <ThemedText type="body" style={styles.actionButtonText}>
                Добавить в список покупок
              </ThemedText>
            </Pressable>
            
            <Pressable
              onPress={() => setMenu(null)}
              style={[styles.secondaryButton, { borderColor: theme.border }]}
            >
              <ThemedText type="body" style={{ color: theme.primary }}>
                Изменить параметры
              </ThemedText>
            </Pressable>
          </View>
        </>
      )}
      
      <View style={{ height: 40 }} />
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  section: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  cityOptions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  cityChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  counterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xl,
  },
  counterButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  counterDisplay: {
    alignItems: "center",
    minWidth: 100,
  },
  budgetOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    marginBottom: Spacing.sm,
  },
  budgetIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  budgetInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  generateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  generateButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  summaryCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: Spacing.md,
  },
  summaryItem: {
    alignItems: "center",
    gap: Spacing.xs,
  },
  summaryText: {
    color: "#fff",
  },
  totalCostRow: {
    alignItems: "center",
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.3)",
  },
  totalCost: {
    color: "#fff",
    marginTop: Spacing.xs,
  },
  menuSection: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  menuSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  menuSectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  menuItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  menuItemInfo: {
    flex: 1,
  },
  shoppingSection: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  shoppingItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  buttonGroup: {
    gap: Spacing.md,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  actionButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  secondaryButton: {
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
});
