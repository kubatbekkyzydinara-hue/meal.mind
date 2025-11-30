import React, { useCallback, useState, useMemo } from "react";
import { View, StyleSheet, Pressable, RefreshControl, Image } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useRecipes } from "@/hooks/useAppState";
import { Spacing, BorderRadius } from "@/constants/theme";
import { HistoryStackParamList } from "@/navigation/HistoryStackNavigator";
import { Recipe, DIFFICULTY_LABELS } from "@/types";
import { formatDate, formatTime } from "@/utils/helpers";
import { getFoodImage } from "@/utils/api";

type NavigationProp = NativeStackNavigationProp<HistoryStackParamList, "History">;

type TabType = "saved" | "history";

interface RecipeCardProps {
  recipe: Recipe;
  isSaved: boolean;
  onPress: () => void;
  onToggleSave: () => void;
}

function RecipeCard({ recipe, isSaved, onPress, onToggleSave }: RecipeCardProps) {
  const { theme } = useTheme();
  const foodImage = useMemo(() => getFoodImage(recipe.title), [recipe.title]);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.recipeCard,
        { 
          backgroundColor: theme.backgroundDefault,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <Image 
        source={foodImage} 
        style={styles.recipeImage}
        resizeMode="cover"
      />
      
      <View style={styles.recipeContent}>
        <ThemedText type="h4" numberOfLines={2}>{recipe.title}</ThemedText>
        
        <View style={styles.recipeMeta}>
          <View style={styles.recipeMetaItem}>
            <Feather name="clock" size={14} color={theme.textSecondary} />
            <ThemedText type="caption" secondary style={styles.metaText}>
              {formatTime(recipe.cookTime)}
            </ThemedText>
          </View>
          <View style={styles.recipeMetaItem}>
            <Feather name="users" size={14} color={theme.textSecondary} />
            <ThemedText type="caption" secondary style={styles.metaText}>
              {recipe.servings}
            </ThemedText>
          </View>
          <View style={styles.recipeMetaItem}>
            <Feather name="activity" size={14} color={theme.textSecondary} />
            <ThemedText type="caption" secondary style={styles.metaText}>
              {DIFFICULTY_LABELS[recipe.difficulty]}
            </ThemedText>
          </View>
        </View>

        {recipe.usesExpiringProducts && recipe.usesExpiringProducts.length > 0 ? (
          <View style={[styles.expiringBadge, { backgroundColor: theme.statusRed + "20" }]}>
            <Feather name="alert-circle" size={12} color={theme.statusRed} />
            <ThemedText 
              type="caption" 
              style={{ color: theme.statusRed, marginLeft: 4 }}
            >
              Использует скоропортящиеся
            </ThemedText>
          </View>
        ) : null}
      </View>

      <Pressable
        onPress={(e) => {
          e.stopPropagation();
          onToggleSave();
        }}
        style={styles.saveButton}
        hitSlop={8}
      >
        <Feather 
          name={isSaved ? "bookmark" : "bookmark"} 
          size={24} 
          color={isSaved ? theme.primary : theme.textSecondary}
          style={{ opacity: isSaved ? 1 : 0.5 }}
        />
      </Pressable>
    </Pressable>
  );
}

export default function HistoryScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const { savedRecipes, history, refresh, saveRecipe, removeRecipe, isRecipeSaved } = useRecipes();
  const [activeTab, setActiveTab] = useState<TabType>("saved");
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

  const recipes = activeTab === "saved" ? savedRecipes : history;

  const handleToggleSave = async (recipe: Recipe) => {
    if (isRecipeSaved(recipe.id)) {
      await removeRecipe(recipe.id);
    } else {
      await saveRecipe(recipe);
    }
  };

  return (
    <ScreenScrollView
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={theme.primary}
        />
      }
    >
      <View style={styles.tabs}>
        <Pressable
          onPress={() => setActiveTab("saved")}
          style={[
            styles.tab,
            activeTab === "saved" && { borderBottomColor: theme.primary, borderBottomWidth: 2 },
          ]}
        >
          <Feather 
            name="bookmark" 
            size={18} 
            color={activeTab === "saved" ? theme.primary : theme.textSecondary} 
          />
          <ThemedText
            type="body"
            style={[
              styles.tabText,
              { color: activeTab === "saved" ? theme.primary : theme.textSecondary },
            ]}
          >
            Сохраненные ({savedRecipes.length})
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab("history")}
          style={[
            styles.tab,
            activeTab === "history" && { borderBottomColor: theme.primary, borderBottomWidth: 2 },
          ]}
        >
          <Feather 
            name="clock" 
            size={18} 
            color={activeTab === "history" ? theme.primary : theme.textSecondary} 
          />
          <ThemedText
            type="body"
            style={[
              styles.tabText,
              { color: activeTab === "history" ? theme.primary : theme.textSecondary },
            ]}
          >
            История ({history.length})
          </ThemedText>
        </Pressable>
      </View>

      {recipes.length > 0 ? (
        <View style={styles.recipesList}>
          {recipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              isSaved={isRecipeSaved(recipe.id)}
              onPress={() => navigation.navigate("RecipeDetail", { recipe })}
              onToggleSave={() => handleToggleSave(recipe)}
            />
          ))}
        </View>
      ) : (
        <View style={[styles.emptyState, { backgroundColor: theme.backgroundDefault }]}>
          <Feather 
            name={activeTab === "saved" ? "bookmark" : "clock"} 
            size={64} 
            color={theme.textSecondary} 
          />
          <ThemedText type="h3" style={styles.emptyTitle}>
            {activeTab === "saved" ? "Нет сохраненных рецептов" : "История пуста"}
          </ThemedText>
          <ThemedText type="body" secondary style={styles.emptyText}>
            {activeTab === "saved" 
              ? "Сохраняйте понравившиеся рецепты для быстрого доступа" 
              : "Сгенерируйте свой первый рецепт на основе продуктов"}
          </ThemedText>
        </View>
      )}

      <View style={{ height: 100 }} />
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: "row",
    marginBottom: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  tabText: {
    fontWeight: "500",
  },
  recipesList: {
    gap: Spacing.md,
  },
  recipeCard: {
    flexDirection: "row",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  recipeImage: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.sm,
  },
  recipeContent: {
    flex: 1,
    marginLeft: Spacing.md,
    justifyContent: "center",
  },
  recipeMeta: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  recipeMetaItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaText: {
    marginLeft: 4,
  },
  expiringBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
    marginTop: Spacing.sm,
  },
  saveButton: {
    padding: Spacing.sm,
    alignSelf: "flex-start",
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
  },
});
