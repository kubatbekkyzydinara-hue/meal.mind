import { Product, Recipe, ProductCategory } from "@/types";
import { generateId, getDefaultExpiryDays, addDaysToDate } from "@/utils/helpers";

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

const FOOD_IMAGE_CATEGORIES: Record<string, string[]> = {
  salad: ["салат", "фрукт", "фруктов"],
  soup: ["суп", "борщ", "щи", "бульон"],
  pasta: ["паста", "макарон", "лапша", "лагман", "спагетти"],
  chicken: ["курица", "куриц", "птица", "индейк"],
  vegetables: ["овощ", "запеканка", "рагу"],
  meal: ["плов", "каша", "рис", "гарнир", "ужин", "обед", "завтрак"],
};

const FOOD_IMAGES: Record<string, number[]> = {
  salad: [
    require("@/assets/food-images/fruit_salad_fresh_he_40a66170.jpg"),
    require("@/assets/food-images/fruit_salad_fresh_he_749fb6b1.jpg"),
    require("@/assets/food-images/fruit_salad_fresh_he_de5252d5.jpg"),
  ],
  soup: [
    require("@/assets/food-images/soup_bowl_hot_delici_700b99b3.jpg"),
    require("@/assets/food-images/soup_bowl_hot_delici_7af68608.jpg"),
    require("@/assets/food-images/soup_bowl_hot_delici_1b414665.jpg"),
  ],
  pasta: [
    require("@/assets/food-images/pasta_italian_dish_n_bc0cf1fd.jpg"),
    require("@/assets/food-images/pasta_italian_dish_n_826119b5.jpg"),
    require("@/assets/food-images/pasta_italian_dish_n_01332196.jpg"),
  ],
  chicken: [
    require("@/assets/food-images/grilled_chicken_meat_38641b15.jpg"),
    require("@/assets/food-images/grilled_chicken_meat_ba95773f.jpg"),
    require("@/assets/food-images/grilled_chicken_meat_62d81f01.jpg"),
  ],
  vegetables: [
    require("@/assets/food-images/fresh_vegetables_coo_9da06761.jpg"),
    require("@/assets/food-images/fresh_vegetables_coo_062c1664.jpg"),
    require("@/assets/food-images/fresh_vegetables_coo_f4d37bf9.jpg"),
  ],
  meal: [
    require("@/assets/food-images/homemade_meal_dinner_adca86b1.jpg"),
    require("@/assets/food-images/homemade_meal_dinner_ad192fa5.jpg"),
    require("@/assets/food-images/homemade_meal_dinner_e7dda8ef.jpg"),
  ],
};

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

export function getFoodImage(dishTitle: string): number {
  const titleLower = dishTitle.toLowerCase();
  
  let category = "meal";
  
  for (const [cat, keywords] of Object.entries(FOOD_IMAGE_CATEGORIES)) {
    if (keywords.some(kw => titleLower.includes(kw))) {
      category = cat;
      break;
    }
  }
  
  const images = FOOD_IMAGES[category];
  const index = hashCode(dishTitle) % images.length;
  return images[index];
}


interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message: string;
  };
}

export async function analyzeImageWithGemini(
  imageBase64: string,
  apiKey: string
): Promise<Product[]> {
  if (!apiKey) {
    throw new Error("API ключ не настроен");
  }

  const prompt = `Analyze this refrigerator/kitchen image and identify all visible food products.
For each product, provide the following in JSON format:
{
  "products": [
    {
      "name": "Product name in Russian",
      "quantity": "estimated quantity (number)",
      "unit": "unit in Russian (шт, кг, л, г, упак)",
      "category": "one of: dairy, meat, vegetables, fruits, grains, beverages, condiments, frozen, bakery, other",
      "confidence": 0.0-1.0
    }
  ]
}

Be specific about product names in Russian. Examples:
- "Молоко 2.5%" instead of just "Молоко"
- "Куриная грудка" instead of just "Мясо"
- "Помидоры красные" instead of just "Овощи"

Return ONLY valid JSON, no additional text.`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: "image/jpeg",
                  data: imageBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2048,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Ошибка API");
    }

    const data: GeminiResponse = await response.json();
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textResponse) {
      throw new Error("Пустой ответ от API");
    }

    const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Не удалось распознать продукты");
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const products: Product[] = (parsed.products || []).map((p: any) => ({
      id: generateId(),
      name: p.name || "Неизвестный продукт",
      quantity: String(p.quantity || "1"),
      unit: p.unit || "шт",
      category: (p.category as ProductCategory) || "other",
      expiryDate: addDaysToDate(
        new Date(),
        getDefaultExpiryDays((p.category as ProductCategory) || "other")
      ).toISOString(),
      addedAt: new Date().toISOString(),
      confidence: p.confidence || 0.8,
    }));

    return products;
  } catch (error) {
    console.error("Gemini API error:", error);
    throw error;
  }
}

export async function generateRecipeWithGemini(
  products: Product[],
  apiKey: string,
  preferences?: {
    servings?: number;
    maxTime?: number;
    difficulty?: string;
  }
): Promise<Recipe> {
  if (!apiKey) {
    throw new Error("API ключ не настроен");
  }

  const productList = products
    .map((p) => `- ${p.name} (${p.quantity} ${p.unit})`)
    .join("\n");

  const expiringProducts = products
    .filter((p) => {
      const days = Math.ceil(
        (new Date(p.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      return days <= 3;
    })
    .map((p) => p.name);

  const prompt = `Ты - профессиональный шеф-повар. Создай рецепт на русском языке, используя эти продукты:

${productList}

${expiringProducts.length > 0 ? `ВАЖНО: Приоритетно используй продукты, которые скоро испортятся: ${expiringProducts.join(", ")}` : ""}

${preferences?.servings ? `Порций: ${preferences.servings}` : "Порций: 4"}
${preferences?.maxTime ? `Максимальное время: ${preferences.maxTime} минут` : ""}
${preferences?.difficulty ? `Сложность: ${preferences.difficulty}` : ""}

Верни ТОЛЬКО JSON в формате:
{
  "title": "Название блюда",
  "description": "Краткое описание блюда (1-2 предложения)",
  "cookTime": число_минут,
  "servings": количество_порций,
  "difficulty": "easy" | "medium" | "hard",
  "ingredients": [
    { "name": "название", "amount": "количество", "unit": "единица", "available": true/false }
  ],
  "instructions": ["Шаг 1...", "Шаг 2...", ...],
  "usesExpiringProducts": ["название1", "название2"]
}

Инструкции должны быть подробными и понятными.`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Ошибка API");
    }

    const data: GeminiResponse = await response.json();
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textResponse) {
      throw new Error("Пустой ответ от API");
    }

    const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Не удалось сгенерировать рецепт");
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    const title = parsed.title || "Новый рецепт";
    
    const recipe: Recipe = {
      id: generateId(),
      title,
      description: parsed.description || "",
      cookTime: parsed.cookTime || 30,
      servings: parsed.servings || 4,
      difficulty: parsed.difficulty || "medium",
      ingredients: parsed.ingredients || [],
      instructions: parsed.instructions || [],
      usesExpiringProducts: parsed.usesExpiringProducts || expiringProducts,
      generatedAt: new Date().toISOString(),
    };

    return recipe;
  } catch (error) {
    console.error("Gemini API error:", error);
    throw error;
  }
}

export function getDeliveryLinks(items: string[]): { glovo: string; nambaFood: string } {
  const query = encodeURIComponent(items.join(", "));
  
  return {
    glovo: `https://glovoapp.com/kg/ru/bishkek/search/?q=${query}`,
    nambaFood: `https://nambafood.kg/search?q=${query}`,
  };
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export async function chatWithGemini(
  message: string,
  apiKey: string,
  context?: {
    products?: Product[];
    recentRecipes?: string[];
  }
): Promise<string> {
  if (!apiKey) {
    throw new Error("API ключ не настроен");
  }

  const productsContext = context?.products?.length 
    ? `\n\nТекущие продукты в холодильнике:\n${context.products.map(p => `- ${p.name} (${p.quantity} ${p.unit})`).join("\n")}`
    : "";

  const recipesContext = context?.recentRecipes?.length
    ? `\n\nНедавние рецепты: ${context.recentRecipes.join(", ")}`
    : "";

  const systemPrompt = `Ты - MealMind, дружелюбный AI-помощник по кулинарии для семей в Кыргызстане.

Твои задачи:
- Помогать с вопросами о готовке и рецептах
- Давать советы по хранению продуктов
- Предлагать идеи блюд из имеющихся продуктов
- Советовать как использовать продукты до истечения срока годности
- Отвечать на русском языке кратко и по делу

Контекст пользователя:${productsContext}${recipesContext}

Отвечай кратко, дружелюбно и полезно. Используй сом (с) для цен в Кыргызстане.`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: systemPrompt + "\n\nВопрос пользователя: " + message }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      }),
    });

    if (!response.ok) {
      console.warn("Chat API error:", response.status);
      throw new Error("Сервис временно недоступен");
    }

    const data: GeminiResponse = await response.json();
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textResponse) {
      throw new Error("Не удалось получить ответ");
    }

    return textResponse;
  } catch (error) {
    console.warn("Chat API error:", error);
    throw error;
  }
}

interface GuestMenuResult {
  appetizers: Recipe[];
  mains: Recipe[];
  desserts: Recipe[];
  beverages: { name: string; quantity: string }[];
  shoppingList: { id: string; name: string; quantity: string; unit: string; category: string; checked: boolean; addedAt: string }[];
  totalCost: number;
  perPersonCost: number;
}

export async function generateGuestMenuWithGemini(
  guestCount: number,
  budget: "economy" | "standard" | "premium",
  city: string,
  apiKey: string
): Promise<GuestMenuResult> {
  if (!apiKey) {
    throw new Error("API ключ не настроен");
  }

  const budgetRanges = {
    economy: { min: 650, max: 1100 },
    standard: { min: 1100, max: 1800 },
    premium: { min: 1800, max: 3000 },
  };

  const range = budgetRanges[budget];
  const targetCostPerPerson = (range.min + range.max) / 2;
  const totalBudget = targetCostPerPerson * guestCount;

  const prompt = `Ты - профессиональный шеф-повар в Кыргызстане. Создай праздничное меню для ${guestCount} гостей.

Город: ${city}
Бюджет на человека: ${range.min}-${range.max} сом
Общий бюджет: примерно ${totalBudget} сом

Создай полноценное меню с:
- 2-3 закуски (холодные и горячие)
- 2 основных блюда (мясо/рыба + гарнир)
- 1-2 десерта
- Напитки (чай, компот, морс)

Учитывай местные продукты и кыргызскую кухню. Порции рассчитаны на ${guestCount} человек.

Верни ТОЛЬКО JSON:
{
  "appetizers": [
    {
      "title": "Название закуски",
      "description": "Описание",
      "cookTime": число_минут,
      "servings": ${guestCount},
      "difficulty": "easy|medium|hard",
      "ingredients": [{"name": "продукт", "amount": "количество", "unit": "ед", "available": false}],
      "instructions": ["Шаг 1", "Шаг 2"],
      "estimatedCost": число_в_сомах
    }
  ],
  "mains": [...],
  "desserts": [...],
  "beverages": [{"name": "Чай зеленый", "quantity": "${guestCount} л"}],
  "shoppingList": [{"name": "Продукт", "quantity": "1", "unit": "кг", "category": "meat|vegetables|dairy|other"}],
  "totalCost": число,
  "perPersonCost": число
}`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8192,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Ошибка API");
    }

    const data: GeminiResponse = await response.json();
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textResponse) {
      throw new Error("Пустой ответ от API");
    }

    const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Не удалось сгенерировать меню");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    const processRecipes = (items: any[]): Recipe[] =>
      (items || []).map((item: any) => ({
        id: generateId(),
        title: item.title || "Блюдо",
        description: item.description || "",
        cookTime: item.cookTime || 30,
        servings: item.servings || guestCount,
        difficulty: item.difficulty || "medium",
        ingredients: item.ingredients || [],
        instructions: item.instructions || [],
        usesExpiringProducts: [],
        generatedAt: new Date().toISOString(),
      }));

    const shoppingList = (parsed.shoppingList || []).map((item: any) => ({
      id: generateId(),
      name: item.name,
      quantity: item.quantity || "1",
      unit: item.unit || "шт",
      category: item.category || "other",
      checked: false,
      addedAt: new Date().toISOString(),
    }));

    return {
      appetizers: processRecipes(parsed.appetizers),
      mains: processRecipes(parsed.mains),
      desserts: processRecipes(parsed.desserts),
      beverages: parsed.beverages || [],
      shoppingList,
      totalCost: parsed.totalCost || totalBudget,
      perPersonCost: parsed.perPersonCost || targetCostPerPerson,
    };
  } catch (error) {
    console.error("Guest menu API error:", error);
    throw error;
  }
}
