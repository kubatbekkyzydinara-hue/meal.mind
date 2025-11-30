import React, { useState, useCallback } from "react";
import { View, StyleSheet, Pressable, Alert, ScrollView, ActivityIndicator } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useProducts, useRecipes, useShoppingList } from "@/hooks/useAppState";
import { useApiKey } from "@/context/ApiKeyContext";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { HomeStackParamList } from "@/navigation/HomeStackNavigator";
import { Recipe, ShoppingItem } from "@/types";
import { generateRecipeWithGemini, generateGuestMenuWithGemini } from "@/utils/api";
import { generateId } from "@/utils/helpers";

type NavigationProp = NativeStackNavigationProp<HomeStackParamList>;

const WEEKDAYS = ["Пон", "Вто", "Сре", "Чет", "Пят", "Суб", "Вос"];
const MEALS = ["Завтрак", "Обед", "Ужин"];
const MEAL_ICONS = ["sunrise", "sun", "moon"];

const CITIES = ["Бишкек", "Ош", "Джалал-Абад", "Каракол", "Токмок"];
const BUDGET_OPTIONS = [
  { id: "economy", label: "Эконом", range: "650-1100 сом", min: 650, max: 1100 },
  { id: "standard", label: "Стандарт", range: "1100-1800 сом", min: 1100, max: 1800 },
  { id: "premium", label: "Премиум", range: "1800+ сом", min: 1800, max: 3000 },
];

interface MealPlan {
  day: number;
  meals: {
    type: string;
    recipe: Recipe | null;
  }[];
}

interface GuestMenu {
  appetizers: Recipe[];
  mains: Recipe[];
  desserts: Recipe[];
  beverages: { name: string; quantity: string }[];
  shoppingList: ShoppingItem[];
  totalCost: number;
  perPersonCost: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function TabSelector({ activeTab, onTabChange }: { activeTab: "week" | "guests"; onTabChange: (tab: "week" | "guests") => void }) {
  const { theme } = useTheme();
  
  return (
    <View style={styles.tabContainer}>
      <Pressable
        onPress={() => onTabChange("week")}
        style={[
          styles.tab,
          activeTab === "week" && { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
          activeTab === "week" && styles.activeTab,
        ]}
      >
        <Feather name="calendar" size={16} color={activeTab === "week" ? theme.text : theme.textSecondary} />
        <ThemedText type="body" style={[styles.tabText, activeTab === "week" && { fontWeight: "600" }]}>
          План на 7 дней
        </ThemedText>
      </Pressable>
      <Pressable
        onPress={() => onTabChange("guests")}
        style={[
          styles.tab,
          activeTab === "guests" && { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
          activeTab === "guests" && styles.activeTab,
        ]}
      >
        <Feather name="users" size={16} color={activeTab === "guests" ? theme.text : theme.textSecondary} />
        <ThemedText type="body" style={[styles.tabText, activeTab === "guests" && { fontWeight: "600" }]}>
          Для гостей
        </ThemedText>
      </Pressable>
    </View>
  );
}

function CoverageCard({ available, total, onAddToCart }: { available: number; total: number; onAddToCart: () => void }) {
  const { theme } = useTheme();
  const percent = total > 0 ? Math.round((available / total) * 100) : 0;
  const missing = total - available;
  
  return (
    <View style={[styles.coverageCard, { backgroundColor: theme.backgroundDefault }]}>
      <View style={styles.coverageHeader}>
        <View style={[styles.coverageIconContainer, { backgroundColor: theme.statusGreen + "20" }]}>
          <Feather name="package" size={24} color={theme.statusGreen} />
        </View>
        <View style={styles.coverageInfo}>
          <ThemedText type="body" style={{ fontWeight: "600" }}>Покрытие запасов</ThemedText>
          <ThemedText type="caption" secondary>
            {available} из {total} ингредиентов в наличии
          </ThemedText>
        </View>
        <View style={[styles.percentBadge, { backgroundColor: theme.statusGreen }]}>
          <ThemedText type="body" style={{ color: "#FFF", fontWeight: "700" }}>{percent}%</ThemedText>
        </View>
      </View>
      
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBarBg, { backgroundColor: theme.border }]}>
          <View 
            style={[
              styles.progressBarFill, 
              { backgroundColor: theme.statusGreen, width: `${percent}%` }
            ]} 
          />
        </View>
      </View>
      
      <View style={styles.coverageStats}>
        <View style={styles.coverageStat}>
          <Feather name="check-circle" size={14} color={theme.statusGreen} />
          <ThemedText type="caption" style={{ marginLeft: 4 }}>{available} в наличии</ThemedText>
        </View>
        <View style={styles.coverageStat}>
          <Feather name="alert-circle" size={14} color={theme.statusYellow} />
          <ThemedText type="caption" style={{ marginLeft: 4, color: theme.statusYellow }}>{missing} нужно купить</ThemedText>
        </View>
      </View>
    </View>
  );
}

function DaySelector({ selectedDay, onDaySelect }: { selectedDay: number; onDaySelect: (day: number) => void }) {
  const { theme } = useTheme();
  
  return (
    <View style={styles.daySelector}>
      {WEEKDAYS.map((day, index) => (
        <Pressable
          key={day}
          onPress={() => {
            Haptics.selectionAsync();
            onDaySelect(index);
          }}
          style={[
            styles.dayButton,
            selectedDay === index && { backgroundColor: theme.text },
          ]}
        >
          <ThemedText 
            type="caption" 
            style={[
              styles.dayButtonText,
              selectedDay === index && { color: theme.background },
            ]}
          >
            {day}
          </ThemedText>
        </Pressable>
      ))}
    </View>
  );
}

function MealCard({ meal, recipe, onPress, onGenerate, isGenerating }: { 
  meal: string; 
  recipe: Recipe | null; 
  onPress: () => void;
  onGenerate: () => void;
  isGenerating: boolean;
}) {
  const { theme } = useTheme();
  const mealIndex = MEALS.indexOf(meal);
  const icon = MEAL_ICONS[mealIndex] || "coffee";
  
  return (
    <View style={[styles.mealCard, { backgroundColor: theme.backgroundDefault }]}>
      <View style={styles.mealHeader}>
        <Feather name={icon as any} size={16} color={theme.primary} />
        <ThemedText type="body" style={{ marginLeft: Spacing.sm, fontWeight: "600" }}>{meal}</ThemedText>
      </View>
      
      {recipe ? (
        <Pressable onPress={onPress} style={styles.recipeRow}>
          <View style={[styles.recipeThumbnail, { backgroundColor: theme.border }]}>
            <Feather name="image" size={20} color={theme.textSecondary} />
          </View>
          <View style={styles.recipeInfo}>
            <ThemedText type="body" numberOfLines={1} style={{ fontWeight: "500" }}>
              {recipe.title}
            </ThemedText>
            <View style={styles.recipeStats}>
              <Feather name="clock" size={12} color={theme.textSecondary} />
              <ThemedText type="caption" secondary style={{ marginLeft: 4, marginRight: 12 }}>
                {recipe.cookTime} мин
              </ThemedText>
              <ThemedText type="caption" secondary>
                {recipe.ingredients.reduce((acc, i) => acc + (parseInt(i.amount) || 50), 0)} cal
              </ThemedText>
            </View>
            <View style={styles.ingredientTags}>
              {recipe.ingredients.slice(0, 2).map((ing, i) => (
                <View key={i} style={[styles.ingredientTag, { backgroundColor: ing.available ? theme.statusGreen + "20" : theme.statusYellow + "20" }]}>
                  {ing.available ? (
                    <Feather name="check" size={10} color={theme.statusGreen} />
                  ) : null}
                  <ThemedText type="caption" style={{ marginLeft: ing.available ? 2 : 0, fontSize: 11 }}>
                    {ing.name}
                  </ThemedText>
                </View>
              ))}
              {recipe.ingredients.length > 2 ? (
                <ThemedText type="caption" secondary>+{recipe.ingredients.length - 2}</ThemedText>
              ) : null}
            </View>
          </View>
        </Pressable>
      ) : (
        <Pressable 
          onPress={onGenerate} 
          disabled={isGenerating}
          style={[styles.addMealButton, { borderColor: theme.border }]}
        >
          {isGenerating ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <>
              <Feather name="plus" size={20} color={theme.textSecondary} />
              <ThemedText type="caption" secondary style={{ marginLeft: Spacing.xs }}>
                Добавить блюдо
              </ThemedText>
            </>
          )}
        </Pressable>
      )}
    </View>
  );
}

function GuestSettings({ 
  guestCount, 
  setGuestCount, 
  budget, 
  setBudget, 
  city, 
  setCity,
  onGenerate,
  isGenerating 
}: {
  guestCount: number;
  setGuestCount: (count: number) => void;
  budget: string;
  setBudget: (b: string) => void;
  city: string;
  setCity: (c: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
}) {
  const { theme } = useTheme();
  
  return (
    <View style={styles.guestSettings}>
      <View style={[styles.settingCard, { backgroundColor: theme.backgroundDefault }]}>
        <ThemedText type="body" style={{ fontWeight: "600", marginBottom: Spacing.md }}>Локация</ThemedText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.citySelector}>
            {CITIES.map((c) => (
              <Pressable
                key={c}
                onPress={() => {
                  Haptics.selectionAsync();
                  setCity(c);
                }}
                style={[
                  styles.cityChip,
                  { borderColor: theme.border },
                  city === c && { backgroundColor: theme.primary, borderColor: theme.primary },
                ]}
              >
                <ThemedText type="caption" style={city === c ? { color: "#FFF" } : undefined}>
                  {c}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>

      <View style={[styles.settingCard, { backgroundColor: theme.backgroundDefault }]}>
        <View style={styles.settingHeader}>
          <ThemedText type="body" style={{ fontWeight: "600" }}>Количество гостей</ThemedText>
          <View style={[styles.guestCountBadge, { backgroundColor: theme.primary }]}>
            <ThemedText type="h4" style={{ color: "#FFF" }}>{guestCount}</ThemedText>
          </View>
        </View>
        <View style={styles.sliderContainer}>
          <ThemedText type="caption" secondary>1</ThemedText>
          <View style={styles.sliderTrack}>
            {[...Array(20)].map((_, i) => (
              <Pressable
                key={i}
                onPress={() => {
                  Haptics.selectionAsync();
                  setGuestCount(i + 1);
                }}
                style={[
                  styles.sliderDot,
                  { backgroundColor: i < guestCount ? theme.primary : theme.border },
                ]}
              />
            ))}
          </View>
          <ThemedText type="caption" secondary>20</ThemedText>
        </View>
      </View>

      <View style={[styles.settingCard, { backgroundColor: theme.backgroundDefault }]}>
        <ThemedText type="body" style={{ fontWeight: "600", marginBottom: Spacing.md }}>Бюджет на человека</ThemedText>
        <View style={styles.budgetOptions}>
          {BUDGET_OPTIONS.map((option) => (
            <Pressable
              key={option.id}
              onPress={() => {
                Haptics.selectionAsync();
                setBudget(option.id);
              }}
              style={[
                styles.budgetOption,
                { borderColor: theme.border },
                budget === option.id && { borderColor: theme.primary, backgroundColor: theme.primary + "10" },
              ]}
            >
              <ThemedText type="body" style={[{ fontWeight: "600" }, budget === option.id && { color: theme.primary }]}>
                {option.label}
              </ThemedText>
              <ThemedText type="caption" secondary>{option.range}</ThemedText>
            </Pressable>
          ))}
        </View>
      </View>

      <Pressable
        onPress={onGenerate}
        disabled={isGenerating}
        style={[
          styles.generateButton,
          { backgroundColor: theme.primary },
          isGenerating && { opacity: 0.7 },
        ]}
      >
        {isGenerating ? (
          <ActivityIndicator size="small" color="#FFF" />
        ) : (
          <>
            <Feather name="zap" size={20} color="#FFF" />
            <ThemedText type="body" style={{ color: "#FFF", fontWeight: "600", marginLeft: Spacing.sm }}>
              Сгенерировать меню для гостей
            </ThemedText>
          </>
        )}
      </Pressable>
    </View>
  );
}

function GuestMenuResult({ menu, onAddToCart }: { menu: GuestMenu; onAddToCart: () => void }) {
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  
  const sections = [
    { title: "Закуски", icon: "disc", items: menu.appetizers },
    { title: "Основные блюда", icon: "target", items: menu.mains },
    { title: "Десерты", icon: "heart", items: menu.desserts },
  ];
  
  return (
    <View style={styles.menuResult}>
      <View style={[styles.costSummary, { backgroundColor: theme.statusGreen + "15" }]}>
        <View style={styles.costRow}>
          <ThemedText type="body">Общая стоимость:</ThemedText>
          <ThemedText type="h3" style={{ color: theme.statusGreen }}>
            {menu.totalCost.toLocaleString()} сом
          </ThemedText>
        </View>
        <View style={styles.costRow}>
          <ThemedText type="caption" secondary>На человека:</ThemedText>
          <ThemedText type="body" style={{ color: theme.statusGreen }}>
            {menu.perPersonCost.toLocaleString()} сом
          </ThemedText>
        </View>
      </View>
      
      {sections.map((section) => (
        <View key={section.title} style={styles.menuSection}>
          <View style={styles.sectionHeader}>
            <Feather name={section.icon as any} size={18} color={theme.primary} />
            <ThemedText type="h4" style={{ marginLeft: Spacing.sm }}>{section.title}</ThemedText>
            <ThemedText type="caption" secondary style={{ marginLeft: "auto" }}>
              {section.items.length} блюд
            </ThemedText>
          </View>
          {section.items.map((recipe) => (
            <Pressable
              key={recipe.id}
              onPress={() => navigation.navigate("RecipeDetail", { recipe })}
              style={[styles.menuItem, { backgroundColor: theme.backgroundDefault }]}
            >
              <View style={styles.menuItemContent}>
                <ThemedText type="body" style={{ fontWeight: "500" }}>{recipe.title}</ThemedText>
                <ThemedText type="caption" secondary numberOfLines={1}>{recipe.description}</ThemedText>
                <View style={styles.menuItemStats}>
                  <Feather name="clock" size={12} color={theme.textSecondary} />
                  <ThemedText type="caption" secondary style={{ marginLeft: 4 }}>{recipe.cookTime} мин</ThemedText>
                  <Feather name="users" size={12} color={theme.textSecondary} style={{ marginLeft: 12 }} />
                  <ThemedText type="caption" secondary style={{ marginLeft: 4 }}>{recipe.servings} порц.</ThemedText>
                </View>
              </View>
              <Feather name="chevron-right" size={20} color={theme.textSecondary} />
            </Pressable>
          ))}
        </View>
      ))}
      
      {menu.beverages.length > 0 ? (
        <View style={styles.menuSection}>
          <View style={styles.sectionHeader}>
            <Feather name="coffee" size={18} color={theme.primary} />
            <ThemedText type="h4" style={{ marginLeft: Spacing.sm }}>Напитки</ThemedText>
          </View>
          <View style={[styles.beveragesList, { backgroundColor: theme.backgroundDefault }]}>
            {menu.beverages.map((bev, i) => (
              <View key={i} style={styles.beverageItem}>
                <ThemedText type="body">{bev.name}</ThemedText>
                <ThemedText type="caption" secondary>{bev.quantity}</ThemedText>
              </View>
            ))}
          </View>
        </View>
      ) : null}
      
      <View style={styles.shoppingSection}>
        <View style={styles.sectionHeader}>
          <Feather name="shopping-cart" size={18} color={theme.primary} />
          <ThemedText type="h4" style={{ marginLeft: Spacing.sm }}>Список покупок</ThemedText>
          <ThemedText type="caption" secondary style={{ marginLeft: "auto" }}>
            {menu.shoppingList.length} товаров
          </ThemedText>
        </View>
        <Pressable
          onPress={onAddToCart}
          style={[styles.addToCartButton, { backgroundColor: theme.primary }]}
        >
          <Feather name="plus" size={18} color="#FFF" />
          <ThemedText type="body" style={{ color: "#FFF", fontWeight: "600", marginLeft: Spacing.sm }}>
            Добавить все в корзину
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

export default function MealPlanScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const { products } = useProducts();
  const { history, addToHistory } = useRecipes();
  const { addItem } = useShoppingList();
  const { apiKey, isConfigured } = useApiKey();
  
  const [activeTab, setActiveTab] = useState<"week" | "guests">("week");
  const [selectedDay, setSelectedDay] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingMeal, setGeneratingMeal] = useState<string | null>(null);
  
  const [weekPlan, setWeekPlan] = useState<MealPlan[]>(() => 
    WEEKDAYS.map((_, index) => ({
      day: index,
      meals: MEALS.map(meal => ({ type: meal, recipe: null })),
    }))
  );
  
  const [guestCount, setGuestCount] = useState(6);
  const [budget, setBudget] = useState("standard");
  const [city, setCity] = useState("Бишкек");
  const [guestMenu, setGuestMenu] = useState<GuestMenu | null>(null);

  const currentDayPlan = weekPlan[selectedDay];
  
  const allIngredients = weekPlan.flatMap(day => 
    day.meals.flatMap(meal => meal.recipe?.ingredients || [])
  );
  const availableIngredients = allIngredients.filter(i => i.available).length;
  const totalIngredients = allIngredients.length || 1;
  const missingCount = totalIngredients - availableIngredients;

  const handleGeneratePlan = async () => {
    if (!isConfigured) {
      Alert.alert("API ключ не настроен", "Перейдите в Настройки и добавьте ваш Google Gemini API ключ");
      return;
    }
    
    setIsGenerating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      const newPlan = [...weekPlan];
      for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        for (let mealIndex = 0; mealIndex < 3; mealIndex++) {
          if (!newPlan[dayIndex].meals[mealIndex].recipe) {
            const recipe = await generateRecipeWithGemini(products, apiKey, {
              servings: 4,
              maxTime: mealIndex === 0 ? 20 : mealIndex === 1 ? 45 : 30,
            });
            newPlan[dayIndex].meals[mealIndex].recipe = recipe;
            addToHistory(recipe);
            setWeekPlan([...newPlan]);
          }
        }
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Готово!", "План питания на неделю создан");
    } catch (error: any) {
      Alert.alert("Ошибка", error.message || "Не удалось создать план");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateMeal = async (mealType: string) => {
    if (!isConfigured) {
      Alert.alert("API ключ не настроен", "Перейдите в Настройки");
      return;
    }
    
    setGeneratingMeal(mealType);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    try {
      const mealIndex = MEALS.indexOf(mealType);
      const recipe = await generateRecipeWithGemini(products, apiKey, {
        servings: 4,
        maxTime: mealIndex === 0 ? 20 : mealIndex === 1 ? 45 : 30,
      });
      
      const newPlan = [...weekPlan];
      newPlan[selectedDay].meals[mealIndex].recipe = recipe;
      setWeekPlan(newPlan);
      addToHistory(recipe);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      Alert.alert("Ошибка", error.message);
    } finally {
      setGeneratingMeal(null);
    }
  };

  const handleGenerateGuestMenu = async () => {
    if (!isConfigured) {
      Alert.alert("API ключ не настроен", "Перейдите в Настройки");
      return;
    }
    
    setIsGenerating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      const menu = await generateGuestMenuWithGemini(
        guestCount,
        budget as "economy" | "standard" | "premium",
        city,
        apiKey
      );
      setGuestMenu(menu);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      Alert.alert("Ошибка", error.message || "Не удалось создать меню");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddMissingToCart = () => {
    const missing = allIngredients.filter(i => !i.available);
    missing.forEach(ing => {
      addItem({
        id: generateId(),
        name: ing.name,
        quantity: ing.amount,
        unit: ing.unit,
        category: "other",
        checked: false,
        addedAt: new Date().toISOString(),
      });
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Добавлено!", `${missing.length} товаров добавлено в список покупок`);
  };

  const handleAddGuestListToCart = () => {
    if (!guestMenu) return;
    guestMenu.shoppingList.forEach(item => {
      addItem(item);
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Добавлено!", `${guestMenu.shoppingList.length} товаров добавлено в список покупок`);
  };

  const getDayName = (index: number) => {
    const names = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];
    return names[index];
  };

  const dailyCalories = currentDayPlan.meals.reduce((acc, meal) => {
    if (meal.recipe) {
      return acc + meal.recipe.ingredients.reduce((sum, i) => sum + (parseInt(i.amount) || 50), 0);
    }
    return acc;
  }, 0);

  return (
    <ScreenScrollView>
      <View style={styles.header}>
        <ThemedText type="h2">Планирование меню</ThemedText>
        <ThemedText type="body" secondary>Создайте идеальное меню с AI</ThemedText>
      </View>
      
      <TabSelector activeTab={activeTab} onTabChange={setActiveTab} />
      
      {activeTab === "week" ? (
        <>
          <CoverageCard 
            available={availableIngredients} 
            total={totalIngredients}
            onAddToCart={handleAddMissingToCart}
          />
          
          <View style={styles.actionButtons}>
            <Pressable
              onPress={handleGeneratePlan}
              disabled={isGenerating}
              style={[styles.actionButton, { backgroundColor: theme.primary }]}
            >
              <Feather name="refresh-cw" size={16} color="#FFF" />
              <ThemedText type="body" style={{ color: "#FFF", fontWeight: "600", marginLeft: Spacing.xs }}>
                {isGenerating ? "Генерация..." : "Новый план"}
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={handleAddMissingToCart}
              style={[styles.actionButton, { backgroundColor: theme.backgroundDefault, borderWidth: 1, borderColor: theme.border }]}
            >
              <Feather name="shopping-cart" size={16} color={theme.text} />
              <ThemedText type="body" style={{ fontWeight: "600", marginLeft: Spacing.xs }}>
                Добавить ({missingCount})
              </ThemedText>
            </Pressable>
          </View>
          
          <DaySelector selectedDay={selectedDay} onDaySelect={setSelectedDay} />
          
          <View style={styles.dayHeader}>
            <ThemedText type="h3">{getDayName(selectedDay)}</ThemedText>
            <ThemedText type="caption" secondary>{dailyCalories} cal/day</ThemedText>
          </View>
          
          {currentDayPlan.meals.map((meal) => (
            <MealCard
              key={meal.type}
              meal={meal.type}
              recipe={meal.recipe}
              onPress={() => meal.recipe && navigation.navigate("RecipeDetail", { recipe: meal.recipe })}
              onGenerate={() => handleGenerateMeal(meal.type)}
              isGenerating={generatingMeal === meal.type}
            />
          ))}
        </>
      ) : (
        <>
          {guestMenu ? (
            <GuestMenuResult menu={guestMenu} onAddToCart={handleAddGuestListToCart} />
          ) : (
            <GuestSettings
              guestCount={guestCount}
              setGuestCount={setGuestCount}
              budget={budget}
              setBudget={setBudget}
              city={city}
              setCity={setCity}
              onGenerate={handleGenerateGuestMenu}
              isGenerating={isGenerating}
            />
          )}
          
          {guestMenu ? (
            <Pressable
              onPress={() => setGuestMenu(null)}
              style={[styles.resetButton, { borderColor: theme.border }]}
            >
              <Feather name="refresh-cw" size={16} color={theme.text} />
              <ThemedText type="body" style={{ marginLeft: Spacing.sm }}>Создать новое меню</ThemedText>
            </Pressable>
          ) : null}
        </>
      )}
      
      <View style={{ height: 100 }} />
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: Spacing.lg,
  },
  tabContainer: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: "transparent",
  },
  activeTab: {
    borderWidth: 1,
  },
  tabText: {
    marginLeft: Spacing.xs,
  },
  coverageCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  coverageHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  coverageIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  coverageInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  percentBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  progressBarContainer: {
    marginBottom: Spacing.md,
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  coverageStats: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  coverageStat: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionButtons: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  daySelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
  },
  dayButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  dayButtonText: {
    fontWeight: "500",
  },
  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  mealCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  mealHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  recipeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  recipeThumbnail: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  recipeInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  recipeStats: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  ingredientTags: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.xs,
    gap: Spacing.xs,
  },
  ingredientTag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  addMealButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: BorderRadius.sm,
  },
  guestSettings: {
    gap: Spacing.md,
  },
  settingCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  settingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  citySelector: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  cityChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  guestCountBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  sliderContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  sliderTrack: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sliderDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  budgetOptions: {
    gap: Spacing.sm,
  },
  budgetOption: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  generateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  menuResult: {
    gap: Spacing.lg,
  },
  costSummary: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  costRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  menuSection: {
    gap: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemStats: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  beveragesList: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  beverageItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: Spacing.xs,
  },
  shoppingSection: {
    gap: Spacing.md,
  },
  addToCartButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  resetButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: Spacing.md,
  },
});
