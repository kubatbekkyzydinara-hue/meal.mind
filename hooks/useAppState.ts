import { useState, useEffect, useCallback } from "react";
import {
  Product,
  Recipe,
  ShoppingItem,
  UserStats,
  OnboardingState,
} from "@/types";
import * as Storage from "@/utils/storage";

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    const data = await Storage.getProducts();
    setProducts(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const addProduct = async (product: Product) => {
    await Storage.addProduct(product);
    await loadProducts();
  };

  const addProducts = async (newProducts: Product[]) => {
    const current = await Storage.getProducts();
    await Storage.saveProducts([...current, ...newProducts]);
    await loadProducts();
  };

  const updateProduct = async (productId: string, updates: Partial<Product>) => {
    await Storage.updateProduct(productId, updates);
    await loadProducts();
  };

  const deleteProduct = async (productId: string) => {
    await Storage.deleteProduct(productId);
    await loadProducts();
  };

  return {
    products,
    loading,
    refresh: loadProducts,
    addProduct,
    addProducts,
    updateProduct,
    deleteProduct,
  };
}

export function useRecipes() {
  const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([]);
  const [history, setHistory] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRecipes = useCallback(async () => {
    setLoading(true);
    const [saved, hist] = await Promise.all([
      Storage.getSavedRecipes(),
      Storage.getRecipeHistory(),
    ]);
    setSavedRecipes(saved);
    setHistory(hist);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadRecipes();
  }, [loadRecipes]);

  const saveRecipe = async (recipe: Recipe) => {
    await Storage.saveRecipe(recipe);
    await loadRecipes();
  };

  const removeRecipe = async (recipeId: string) => {
    await Storage.removeSavedRecipe(recipeId);
    await loadRecipes();
  };

  const addToHistory = async (recipe: Recipe) => {
    await Storage.addToRecipeHistory(recipe);
    await loadRecipes();
  };

  const isRecipeSaved = (recipeId: string) => {
    return savedRecipes.some((r) => r.id === recipeId);
  };

  return {
    savedRecipes,
    history,
    loading,
    refresh: loadRecipes,
    saveRecipe,
    removeRecipe,
    addToHistory,
    isRecipeSaved,
  };
}

export function useShoppingList() {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadItems = useCallback(async () => {
    setLoading(true);
    const data = await Storage.getShoppingList();
    setItems(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const addItem = async (item: ShoppingItem) => {
    await Storage.addShoppingItem(item);
    await loadItems();
  };

  const addItems = async (newItems: ShoppingItem[]) => {
    const current = await Storage.getShoppingList();
    await Storage.saveShoppingList([...current, ...newItems]);
    await loadItems();
  };

  const toggleItem = async (itemId: string) => {
    await Storage.toggleShoppingItem(itemId);
    await loadItems();
  };

  const deleteItem = async (itemId: string) => {
    await Storage.deleteShoppingItem(itemId);
    await loadItems();
  };

  const clearChecked = async () => {
    await Storage.clearCheckedItems();
    await loadItems();
  };

  const checkedCount = items.filter((i) => i.checked).length;
  const totalCount = items.length;

  return {
    items,
    loading,
    refresh: loadItems,
    addItem,
    addItems,
    toggleItem,
    deleteItem,
    clearChecked,
    checkedCount,
    totalCount,
  };
}

export function useUserStats() {
  const [stats, setStats] = useState<UserStats>({
    moneySaved: 0,
    timeSaved: 0,
    wastePrevented: 0,
    recipesGenerated: 0,
    productsScanned: 0,
    lastUpdated: new Date().toISOString(),
  });
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    setLoading(true);
    const data = await Storage.getUserStats();
    setStats(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const incrementStat = async (
    key: keyof Pick<
      UserStats,
      "moneySaved" | "timeSaved" | "wastePrevented" | "recipesGenerated" | "productsScanned"
    >,
    amount: number = 1
  ) => {
    await Storage.incrementStat(key, amount);
    await loadStats();
  };

  return {
    stats,
    loading,
    refresh: loadStats,
    incrementStat,
  };
}

export function useOnboarding() {
  const [state, setState] = useState<OnboardingState>({
    completed: false,
    currentStep: 0,
  });
  const [loading, setLoading] = useState(true);

  const loadState = useCallback(async () => {
    setLoading(true);
    const data = await Storage.getOnboardingState();
    setState(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadState();
  }, [loadState]);

  const complete = async () => {
    await Storage.completeOnboarding();
    setState({ completed: true, currentStep: 3 });
  };

  const reset = async () => {
    await Storage.resetOnboarding();
    setState({ completed: false, currentStep: 0 });
  };

  return {
    ...state,
    loading,
    complete,
    reset,
  };
}
