import React, { useState, useMemo } from "react";
import { 
  View, 
  StyleSheet, 
  Pressable, 
  Alert,
  Share,
  Image,
  ActivityIndicator,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";

import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useRecipes, useShoppingList } from "@/hooks/useAppState";
import { Spacing, BorderRadius } from "@/constants/theme";
import { HomeStackParamList } from "@/navigation/HomeStackNavigator";
import { Recipe, ShoppingItem, DIFFICULTY_LABELS } from "@/types";
import { formatTime, generateId } from "@/utils/helpers";
import { getFoodImage } from "@/utils/api";

type NavigationProp = NativeStackNavigationProp<HomeStackParamList, "RecipeDetail">;
type RouteProps = RouteProp<HomeStackParamList, "RecipeDetail">;

interface IngredientItemProps {
  ingredient: Recipe['ingredients'][0];
  checked: boolean;
  onToggle: () => void;
}

function IngredientItem({ ingredient, checked, onToggle }: IngredientItemProps) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onToggle}
      style={[
        styles.ingredientItem,
        { backgroundColor: theme.backgroundDefault },
      ]}
    >
      <View style={[
        styles.checkbox,
        { 
          backgroundColor: checked ? theme.primary : "transparent",
          borderColor: checked ? theme.primary : theme.border,
        },
      ]}>
        {checked ? <Feather name="check" size={14} color="#FFFFFF" /> : null}
      </View>
      <View style={styles.ingredientContent}>
        <ThemedText 
          type="body"
          style={checked ? { textDecorationLine: "line-through", opacity: 0.6 } : undefined}
        >
          {ingredient.name}
        </ThemedText>
        <ThemedText type="caption" secondary>
          {ingredient.amount} {ingredient.unit}
        </ThemedText>
      </View>
      {ingredient.available ? (
        <View style={[styles.availableBadge, { backgroundColor: theme.statusGreen + "20" }]}>
          <Feather name="check-circle" size={14} color={theme.statusGreen} />
        </View>
      ) : (
        <View style={[styles.availableBadge, { backgroundColor: theme.statusRed + "20" }]}>
          <Feather name="shopping-cart" size={14} color={theme.statusRed} />
        </View>
      )}
    </Pressable>
  );
}

interface StepItemProps {
  step: string;
  index: number;
  completed: boolean;
  onToggle: () => void;
}

function StepItem({ step, index, completed, onToggle }: StepItemProps) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onToggle}
      style={styles.stepItem}
    >
      <View style={[
        styles.stepNumber,
        { 
          backgroundColor: completed ? theme.primary : theme.backgroundDefault,
          borderColor: completed ? theme.primary : theme.border,
        },
      ]}>
        {completed ? (
          <Feather name="check" size={16} color="#FFFFFF" />
        ) : (
          <ThemedText type="body" style={{ color: theme.textSecondary }}>
            {index + 1}
          </ThemedText>
        )}
      </View>
      <ThemedText 
        type="body" 
        style={[
          styles.stepText,
          completed ? { opacity: 0.6 } : undefined,
        ]}
      >
        {step}
      </ThemedText>
    </Pressable>
  );
}

export default function RecipeDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { theme } = useTheme();
  const { saveRecipe, removeRecipe, isRecipeSaved } = useRecipes();
  const { addItems } = useShoppingList();

  const { recipe } = route.params;
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [imageLoading, setImageLoading] = useState(true);
  
  const foodImage = useMemo(() => getFoodImage(recipe.title), [recipe.title]);

  const isSaved = isRecipeSaved(recipe.id);

  const toggleIngredient = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCheckedIngredients((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const toggleStep = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleToggleSave = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isSaved) {
      await removeRecipe(recipe.id);
    } else {
      await saveRecipe(recipe);
    }
  };

  const handleShare = async () => {
    try {
      const ingredientsList = recipe.ingredients
        .map((i) => `- ${i.name}: ${i.amount} ${i.unit}`)
        .join("\n");
      
      const stepsList = recipe.instructions
        .map((s, i) => `${i + 1}. ${s}`)
        .join("\n");

      const message = `${recipe.title}\n\n${recipe.description}\n\nИнгредиенты:\n${ingredientsList}\n\nПриготовление:\n${stepsList}\n\nСоздано в MealMind`;

      await Share.share({ message });
    } catch (error) {
      console.error("Share error:", error);
    }
  };

  const handleAddMissing = async () => {
    const missingIngredients = recipe.ingredients.filter((i) => !i.available);
    
    if (missingIngredients.length === 0) {
      Alert.alert("Все есть!", "У вас есть все необходимые ингредиенты");
      return;
    }

    const shoppingItems: ShoppingItem[] = missingIngredients.map((i) => ({
      id: generateId(),
      name: i.name,
      quantity: i.amount,
      unit: i.unit,
      category: "other",
      checked: false,
      addedAt: new Date().toISOString(),
      fromRecipe: recipe.title,
    }));

    await addItems(shoppingItems);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    Alert.alert(
      "Добавлено в корзину",
      `${missingIngredients.length} ингредиентов добавлено в список покупок`
    );
  };

  const getDifficultyColor = () => {
    switch (recipe.difficulty) {
      case 'easy': return theme.statusGreen;
      case 'medium': return theme.statusYellow;
      case 'hard': return theme.statusRed;
    }
  };

  return (
    <>
      <ScreenScrollView>
        <View style={styles.heroSection}>
          <Image
            source={foodImage}
            style={styles.heroImage}
            onLoadStart={() => setImageLoading(true)}
            onLoadEnd={() => setImageLoading(false)}
          />
          {imageLoading ? (
            <View style={[styles.imageLoadingOverlay, { backgroundColor: theme.backgroundDefault }]}>
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          ) : null}
          <LinearGradient
            colors={["transparent", theme.backgroundRoot]}
            style={styles.heroGradient}
          />
        </View>

        <View style={styles.header}>
          <ThemedText type="h1">{recipe.title}</ThemedText>
          <ThemedText type="body" secondary style={styles.description}>
            {recipe.description}
          </ThemedText>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: theme.backgroundDefault }]}>
            <Feather name="clock" size={20} color={theme.primary} />
            <ThemedText type="h4">{formatTime(recipe.cookTime)}</ThemedText>
            <ThemedText type="caption" secondary>Время</ThemedText>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.backgroundDefault }]}>
            <Feather name="users" size={20} color={theme.primary} />
            <ThemedText type="h4">{recipe.servings}</ThemedText>
            <ThemedText type="caption" secondary>Порций</ThemedText>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.backgroundDefault }]}>
            <Feather name="activity" size={20} color={getDifficultyColor()} />
            <ThemedText type="h4" style={{ color: getDifficultyColor() }}>
              {DIFFICULTY_LABELS[recipe.difficulty]}
            </ThemedText>
            <ThemedText type="caption" secondary>Сложность</ThemedText>
          </View>
        </View>

        {recipe.usesExpiringProducts && recipe.usesExpiringProducts.length > 0 ? (
          <View style={[styles.expiringAlert, { backgroundColor: theme.statusRed + "15" }]}>
            <Feather name="alert-circle" size={20} color={theme.statusRed} />
            <View style={styles.expiringContent}>
              <ThemedText type="h4" style={{ color: theme.statusRed }}>
                Использует скоропортящиеся
              </ThemedText>
              <ThemedText type="small" secondary>
                {recipe.usesExpiringProducts.join(", ")}
              </ThemedText>
            </View>
          </View>
        ) : null}

        <View style={styles.actionsRow}>
          <Pressable
            onPress={handleToggleSave}
            style={[
              styles.actionButton,
              { 
                backgroundColor: isSaved ? theme.primary : theme.backgroundDefault,
                borderColor: isSaved ? theme.primary : theme.border,
              },
            ]}
          >
            <Feather 
              name="bookmark" 
              size={20} 
              color={isSaved ? "#FFFFFF" : theme.text} 
            />
            <ThemedText 
              type="small" 
              style={{ 
                marginLeft: 6,
                color: isSaved ? "#FFFFFF" : theme.text,
              }}
            >
              {isSaved ? "Сохранено" : "Сохранить"}
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={handleShare}
            style={[
              styles.actionButton,
              { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
            ]}
          >
            <Feather name="share-2" size={20} color={theme.text} />
            <ThemedText type="small" style={{ marginLeft: 6 }}>
              Поделиться
            </ThemedText>
          </Pressable>
        </View>

        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            navigation.navigate("ChefChat", { recipe });
          }}
          style={[styles.chefButton, { backgroundColor: "#9C27B0" }]}
        >
          <View style={styles.chefButtonContent}>
            <Feather name="message-circle" size={22} color="#FFFFFF" />
            <View style={styles.chefButtonText}>
              <ThemedText type="h4" style={{ color: "#FFFFFF" }}>
                AI Шеф-помощник
              </ThemedText>
              <ThemedText type="small" style={{ color: "rgba(255,255,255,0.8)" }}>
                Задайте вопрос о рецепте
              </ThemedText>
            </View>
          </View>
          <Feather name="chevron-right" size={22} color="#FFFFFF" />
        </Pressable>

        <ThemedText type="h2" style={styles.sectionTitle}>
          Ингредиенты ({recipe.ingredients.length})
        </ThemedText>
        <View style={styles.ingredientsList}>
          {recipe.ingredients.map((ingredient, index) => (
            <IngredientItem
              key={index}
              ingredient={ingredient}
              checked={checkedIngredients.has(index)}
              onToggle={() => toggleIngredient(index)}
            />
          ))}
        </View>

        <Pressable
          onPress={handleAddMissing}
          style={[styles.addMissingButton, { borderColor: theme.primary }]}
        >
          <Feather name="shopping-cart" size={18} color={theme.primary} />
          <ThemedText type="body" style={{ color: theme.primary, marginLeft: 8 }}>
            Добавить недостающие в корзину
          </ThemedText>
        </Pressable>

        <ThemedText type="h2" style={styles.sectionTitle}>
          Приготовление ({recipe.instructions.length} шагов)
        </ThemedText>
        <View style={styles.stepsList}>
          {recipe.instructions.map((step, index) => (
            <StepItem
              key={index}
              step={step}
              index={index}
              completed={completedSteps.has(index)}
              onToggle={() => toggleStep(index)}
            />
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScreenScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  heroSection: {
    marginHorizontal: -Spacing.xl,
    marginTop: -Spacing.xl,
    marginBottom: Spacing.lg,
    position: "relative",
  },
  heroImage: {
    width: "100%",
    height: 280,
    resizeMode: "cover",
  },
  heroImageFallback: {
    width: "100%",
    height: 200,
    alignItems: "center",
    justifyContent: "center",
  },
  imageLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  heroGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  description: {
    marginTop: Spacing.sm,
  },
  statsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  statCard: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  expiringAlert: {
    flexDirection: "row",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xl,
  },
  expiringContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  actionsRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  chefButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xl,
  },
  chefButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  chefButtonText: {
    marginLeft: Spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  sectionTitle: {
    marginBottom: Spacing.lg,
  },
  ingredientsList: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  ingredientItem: {
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
  ingredientContent: {
    flex: 1,
  },
  availableBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  addMissingButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderStyle: "dashed",
    marginBottom: Spacing.xl,
  },
  stepsList: {
    gap: Spacing.lg,
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  stepText: {
    flex: 1,
    paddingTop: 4,
  },
});
