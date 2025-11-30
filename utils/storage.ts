import AsyncStorage from "@react-native-async-storage/async-storage";
import { 
  Product, 
  Recipe, 
  ShoppingItem, 
  UserStats, 
  OnboardingState 
} from "@/types";

const STORAGE_KEYS = {
  PRODUCTS: "@mealmind/products",
  RECIPES: "@mealmind/recipes",
  SAVED_RECIPES: "@mealmind/saved_recipes",
  SHOPPING_LIST: "@mealmind/shopping_list",
  USER_STATS: "@mealmind/user_stats",
  ONBOARDING: "@mealmind/onboarding",
  RECIPE_HISTORY: "@mealmind/recipe_history",
};

const defaultStats: UserStats = {
  moneySaved: 2450,
  timeSaved: 180,
  wastePrevented: 12.5,
  recipesGenerated: 8,
  productsScanned: 47,
  lastUpdated: new Date().toISOString(),
};

export async function getProducts(): Promise<Product[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.PRODUCTS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error getting products:", error);
    return [];
  }
}

export async function saveProducts(products: Product[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  } catch (error) {
    console.error("Error saving products:", error);
  }
}

export async function addProduct(product: Product): Promise<void> {
  const products = await getProducts();
  products.push(product);
  await saveProducts(products);
}

export async function updateProduct(productId: string, updates: Partial<Product>): Promise<void> {
  const products = await getProducts();
  const index = products.findIndex((p) => p.id === productId);
  if (index !== -1) {
    products[index] = { ...products[index], ...updates };
    await saveProducts(products);
  }
}

export async function deleteProduct(productId: string): Promise<void> {
  const products = await getProducts();
  const filtered = products.filter((p) => p.id !== productId);
  await saveProducts(filtered);
}

export async function getSavedRecipes(): Promise<Recipe[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.SAVED_RECIPES);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error getting saved recipes:", error);
    return [];
  }
}

export async function saveRecipe(recipe: Recipe): Promise<void> {
  const recipes = await getSavedRecipes();
  const exists = recipes.some((r) => r.id === recipe.id);
  if (!exists) {
    recipes.unshift({ ...recipe, savedAt: new Date().toISOString() });
    await AsyncStorage.setItem(STORAGE_KEYS.SAVED_RECIPES, JSON.stringify(recipes));
  }
}

export async function removeSavedRecipe(recipeId: string): Promise<void> {
  const recipes = await getSavedRecipes();
  const filtered = recipes.filter((r) => r.id !== recipeId);
  await AsyncStorage.setItem(STORAGE_KEYS.SAVED_RECIPES, JSON.stringify(filtered));
}

export async function getRecipeHistory(): Promise<Recipe[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.RECIPE_HISTORY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error getting recipe history:", error);
    return [];
  }
}

export async function addToRecipeHistory(recipe: Recipe): Promise<void> {
  const history = await getRecipeHistory();
  const filtered = history.filter((r) => r.id !== recipe.id);
  filtered.unshift(recipe);
  const trimmed = filtered.slice(0, 50);
  await AsyncStorage.setItem(STORAGE_KEYS.RECIPE_HISTORY, JSON.stringify(trimmed));
}

export async function getShoppingList(): Promise<ShoppingItem[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.SHOPPING_LIST);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error getting shopping list:", error);
    return [];
  }
}

export async function saveShoppingList(items: ShoppingItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.SHOPPING_LIST, JSON.stringify(items));
  } catch (error) {
    console.error("Error saving shopping list:", error);
  }
}

export async function addShoppingItem(item: ShoppingItem): Promise<void> {
  const items = await getShoppingList();
  items.push(item);
  await saveShoppingList(items);
}

export async function toggleShoppingItem(itemId: string): Promise<void> {
  const items = await getShoppingList();
  const index = items.findIndex((i) => i.id === itemId);
  if (index !== -1) {
    items[index].checked = !items[index].checked;
    await saveShoppingList(items);
  }
}

export async function deleteShoppingItem(itemId: string): Promise<void> {
  const items = await getShoppingList();
  const filtered = items.filter((i) => i.id !== itemId);
  await saveShoppingList(filtered);
}

export async function clearCheckedItems(): Promise<void> {
  const items = await getShoppingList();
  const filtered = items.filter((i) => !i.checked);
  await saveShoppingList(filtered);
}

export async function getUserStats(): Promise<UserStats> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_STATS);
    return data ? JSON.parse(data) : defaultStats;
  } catch (error) {
    console.error("Error getting user stats:", error);
    return defaultStats;
  }
}

export async function updateUserStats(updates: Partial<UserStats>): Promise<void> {
  const stats = await getUserStats();
  const newStats = { 
    ...stats, 
    ...updates, 
    lastUpdated: new Date().toISOString() 
  };
  await AsyncStorage.setItem(STORAGE_KEYS.USER_STATS, JSON.stringify(newStats));
}

export async function incrementStat(
  key: keyof Pick<UserStats, 'moneySaved' | 'timeSaved' | 'wastePrevented' | 'recipesGenerated' | 'productsScanned'>,
  amount: number = 1
): Promise<void> {
  const stats = await getUserStats();
  await updateUserStats({ [key]: stats[key] + amount });
}

export async function getOnboardingState(): Promise<OnboardingState> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING);
    return data ? JSON.parse(data) : { completed: false, currentStep: 0 };
  } catch (error) {
    console.error("Error getting onboarding state:", error);
    return { completed: false, currentStep: 0 };
  }
}

export async function completeOnboarding(): Promise<void> {
  await AsyncStorage.setItem(
    STORAGE_KEYS.ONBOARDING,
    JSON.stringify({ completed: true, currentStep: 3 })
  );
}

export async function resetOnboarding(): Promise<void> {
  await AsyncStorage.setItem(
    STORAGE_KEYS.ONBOARDING,
    JSON.stringify({ completed: false, currentStep: 0 })
  );
}

export async function clearAllData(): Promise<void> {
  try {
    await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
  } catch (error) {
    console.error("Error clearing all data:", error);
  }
}
