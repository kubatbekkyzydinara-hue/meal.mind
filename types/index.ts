export interface Product {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  expiryDate: string;
  category: ProductCategory;
  addedAt: string;
  imageUri?: string;
  confidence?: number;
}

export type ProductCategory = 
  | 'dairy'
  | 'meat'
  | 'vegetables'
  | 'fruits'
  | 'grains'
  | 'beverages'
  | 'condiments'
  | 'frozen'
  | 'bakery'
  | 'other';

export type ExpiryStatus = 'fresh' | 'warning' | 'critical';

export interface Recipe {
  id: string;
  title: string;
  description: string;
  imageUri?: string;
  cookTime: number;
  servings: number;
  difficulty: 'easy' | 'medium' | 'hard';
  ingredients: RecipeIngredient[];
  instructions: string[];
  usesExpiringProducts: string[];
  rating?: number;
  savedAt?: string;
  generatedAt: string;
}

export interface RecipeIngredient {
  name: string;
  amount: string;
  unit: string;
  available: boolean;
}

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  category: ProductCategory;
  checked: boolean;
  addedAt: string;
  fromRecipe?: string;
}

export interface UserStats {
  moneySaved: number;
  timeSaved: number;
  wastePrevented: number;
  recipesGenerated: number;
  productsScanned: number;
  lastUpdated: string;
}

export interface ScanResult {
  products: Product[];
  confidence: number;
  scanDate: string;
  imageUri: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  avatar: 'chef1' | 'chef2' | 'chef3' | 'dish';
  city: string;
  location?: { latitude: number; longitude: number };
  dietPreferences: DietPreference[];
  allergies: Allergen[];
  favoriteCuisines: Cuisine[];
  deliveryService: 'glovo' | 'nambafood';
  createdAt: string;
  updatedAt: string;
}

export type DietPreference = 'vegan' | 'vegetarian' | 'gluten-free' | 'lactose-free' | 'none';
export type Allergen = 'nuts' | 'milk' | 'fish' | 'eggs' | 'gluten' | 'soy' | 'seafood';
export type Cuisine = 'asian' | 'italian' | 'european' | 'georgian' | 'eastern' | 'mexican' | 'homemade';

export interface OnboardingState {
  completed: boolean;
  currentStep: number;
}

export interface MealPlan {
  id: string;
  date: string; // YYYY-MM-DD
  recipeId: string;
  recipe?: Recipe;
  servings: number;
  notes?: string;
}

export interface GuestMenuRequest {
  guestCount: number;
  budget: 'economy' | 'standard' | 'premium';
  city: string;
  courses: {
    appetizers: Recipe[];
    mains: Recipe[];
    desserts: Recipe[];
    beverages: Recipe[];
  };
  totalCost: number;
  shoppingList: ShoppingItem[];
}

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  dairy: 'Молочные',
  meat: 'Мясо',
  vegetables: 'Овощи',
  fruits: 'Фрукты',
  grains: 'Крупы',
  beverages: 'Напитки',
  condiments: 'Приправы',
  frozen: 'Заморозка',
  bakery: 'Выпечка',
  other: 'Другое',
};

export const CATEGORY_ICONS: Record<ProductCategory, string> = {
  dairy: 'droplet',
  meat: 'target',
  vegetables: 'layers',
  fruits: 'sun',
  grains: 'grid',
  beverages: 'coffee',
  condiments: 'thermometer',
  frozen: 'box',
  bakery: 'package',
  other: 'circle',
};

export const DIFFICULTY_LABELS: Record<Recipe['difficulty'], string> = {
  easy: 'Легко',
  medium: 'Средне',
  hard: 'Сложно',
};
