import React, { useCallback, useState, useMemo } from "react";
import { View, StyleSheet, Pressable, RefreshControl, TextInput, Alert, Linking, Image, ActivityIndicator } from "react-native";
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
import { ThemedView } from "@/components/ThemedView";
import { ScanFAB } from "@/components/ScanFAB";
import { useTheme } from "@/hooks/useTheme";
import { useProducts, useRecipes } from "@/hooks/useAppState";
import { useUserProfile } from "@/context/UserProfileContext";
import { Colors, Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { HomeStackParamList } from "@/navigation/HomeStackNavigator";
import { 
  getExpiringProducts, 
  formatExpiryText,
  getExpiryStatus,
  sortProductsByExpiry,
} from "@/utils/helpers";
import { getFoodImage } from "@/utils/api";
import { Product, Recipe } from "@/types";

type NavigationProp = NativeStackNavigationProp<HomeStackParamList, "Home">;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ActionCardProps {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle: string;
  color: string;
  onPress: () => void;
}

function ActionCard({ icon, title, subtitle, color, onPress }: ActionCardProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.actionCard,
        { backgroundColor: theme.backgroundDefault },
        animatedStyle,
      ]}
    >
      <View style={[styles.actionIconContainer, { backgroundColor: color + "20" }]}>
        <Feather name={icon} size={24} color={color} />
      </View>
      <ThemedText type="h4" style={styles.actionTitle}>{title}</ThemedText>
      <ThemedText type="caption" secondary>{subtitle}</ThemedText>
    </AnimatedPressable>
  );
}

interface ProductItemProps {
  product: Product;
  onPress: () => void;
}

function ProductItem({ product, onPress }: ProductItemProps) {
  const { theme } = useTheme();
  const status = getExpiryStatus(product.expiryDate);
  const statusColor = 
    status === 'critical' ? theme.statusRed : 
    status === 'warning' ? theme.statusYellow : 
    theme.statusGreen;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.productItem,
        { 
          backgroundColor: theme.backgroundDefault,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
      <View style={styles.productInfo}>
        <ThemedText type="body" numberOfLines={1}>{product.name}</ThemedText>
        <ThemedText type="caption" secondary>
          {product.quantity} {product.unit}
        </ThemedText>
      </View>
      <View style={styles.expiryBadge}>
        <Feather name="clock" size={12} color={statusColor} />
        <ThemedText type="caption" style={{ color: statusColor, marginLeft: 4 }}>
          {formatExpiryText(product.expiryDate)}
        </ThemedText>
      </View>
    </Pressable>
  );
}

interface RecipeCardProps {
  recipe: Recipe;
  onPress: () => void;
}

function RecipeCard({ recipe, onPress }: RecipeCardProps) {
  const { theme } = useTheme();
  const [imageLoading, setImageLoading] = useState(true);
  
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
      <View style={styles.recipeImageContainer}>
        {imageLoading ? (
          <View style={[styles.recipeImagePlaceholder, { backgroundColor: theme.backgroundSecondary }]}>
            <ActivityIndicator size="small" color={theme.primary} />
          </View>
        ) : null}
        <Image
          source={foodImage}
          style={[styles.recipeImage, imageLoading ? { opacity: 0 } : { opacity: 1 }]}
          onLoadStart={() => setImageLoading(true)}
          onLoadEnd={() => setImageLoading(false)}
          resizeMode="cover"
        />
      </View>
      <View style={styles.recipeInfo}>
        <ThemedText type="h4" numberOfLines={1}>{recipe.title}</ThemedText>
        <View style={styles.recipeStats}>
          <View style={styles.recipeStat}>
            <Feather name="clock" size={14} color={theme.textSecondary} />
            <ThemedText type="caption" secondary style={{ marginLeft: 4 }}>
              {recipe.cookTime} мин
            </ThemedText>
          </View>
          <View style={styles.recipeStat}>
            <Feather name="users" size={14} color={theme.textSecondary} />
            <ThemedText type="caption" secondary style={{ marginLeft: 4 }}>
              {recipe.servings} порц.
            </ThemedText>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function SearchBar() {
  const { theme } = useTheme();
  const [searchText, setSearchText] = useState("");

  const handleVoiceSearch = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Голосовой поиск",
      "Голосовой поиск будет доступен в следующем обновлении",
      [{ text: "OK" }]
    );
  };

  const handleSearch = () => {
    if (searchText.trim()) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Alert.alert(
        "Поиск рецептов",
        `Поиск "${searchText}" - функция в разработке`,
        [{ text: "OK" }]
      );
    }
  };

  return (
    <View style={[styles.searchContainer, { backgroundColor: theme.backgroundDefault }]}>
      <Feather name="search" size={20} color={theme.textSecondary} />
      <TextInput
        value={searchText}
        onChangeText={setSearchText}
        placeholder="Найти рецепт..."
        placeholderTextColor={theme.textSecondary}
        style={[styles.searchInput, { color: theme.text }]}
        returnKeyType="search"
        onSubmitEditing={handleSearch}
      />
      <Pressable 
        onPress={handleVoiceSearch}
        style={({ pressed }) => [
          styles.voiceButton,
          { 
            backgroundColor: theme.primary + "15",
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        <Feather name="mic" size={18} color={theme.primary} />
      </Pressable>
    </View>
  );
}

function PromoBanner() {
  const { theme } = useTheme();

  const handleShopNow = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Linking.openURL("https://glovoapp.com/kg/ru/bishkek/");
  };

  return (
    <View style={[styles.promoBanner, { backgroundColor: theme.primary }]}>
      <View style={styles.promoContent}>
        <View style={styles.promoTextContainer}>
          <ThemedText type="h4" style={styles.promoTitle}>
            Скидка 30%
          </ThemedText>
          <ThemedText type="small" style={styles.promoSubtitle}>
            Свежие продукты доставляются к вашей двери
          </ThemedText>
        </View>
        <Pressable
          onPress={handleShopNow}
          style={({ pressed }) => [
            styles.promoButton,
            { opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <ThemedText type="body" style={styles.promoButtonText}>
            Купить
          </ThemedText>
        </Pressable>
      </View>
      <View style={styles.promoDecoration}>
        <Feather name="truck" size={40} color="rgba(255,255,255,0.3)" />
      </View>
    </View>
  );
}

interface ImpactStatProps {
  icon: keyof typeof Feather.glyphMap;
  value: string;
  label: string;
  color: string;
}

function ImpactStat({ icon, value, label, color }: ImpactStatProps) {
  const { theme } = useTheme();
  
  return (
    <View style={styles.impactStat}>
      <View style={[styles.impactIcon, { backgroundColor: color + "20" }]}>
        <Feather name={icon} size={18} color={color} />
      </View>
      <ThemedText type="h4" style={{ color }}>{value}</ThemedText>
      <ThemedText type="small" secondary numberOfLines={2} style={{ textAlign: "center" }}>
        {label}
      </ThemedText>
    </View>
  );
}

function ImpactDashboard() {
  const { theme } = useTheme();
  const { products } = useProducts();
  const { history, savedRecipes } = useRecipes();
  
  const expiringProducts = getExpiringProducts(products, 7);
  const totalProducts = products.length;
  const uniqueRecipes = new Set([...history.map(r => r.id), ...savedRecipes.map(r => r.id)]).size;
  
  const avgProductCost = 180;
  const moneySaved = expiringProducts.length > 0 
    ? expiringProducts.length * avgProductCost + uniqueRecipes * 150
    : totalProducts * 50 + uniqueRecipes * 150;
  
  const wastePerProduct = 0.25;
  const wastePrevented = totalProducts > 0 
    ? (totalProducts * wastePerProduct).toFixed(1) 
    : "0";
  
  const timePerRecipe = 20;
  const timeSaved = uniqueRecipes * timePerRecipe;
  
  if (totalProducts === 0 && uniqueRecipes === 0) {
    return null;
  }
  
  return (
    <View style={[styles.impactDashboard, { backgroundColor: theme.backgroundDefault }]}>
      <View style={styles.impactHeader}>
        <Feather name="trending-up" size={20} color={theme.statusGreen} />
        <ThemedText type="h3" style={{ marginLeft: Spacing.sm }}>
          Ваш вклад
        </ThemedText>
      </View>
      <View style={styles.impactGrid}>
        <ImpactStat
          icon="dollar-sign"
          value={`${moneySaved}`}
          label="сом сэкономлено"
          color={theme.statusGreen}
        />
        <ImpactStat
          icon="trash-2"
          value={`${wastePrevented} кг`}
          label="отходов предотвращено"
          color="#E91E63"
        />
        <ImpactStat
          icon="clock"
          value={`${timeSaved}`}
          label="минут сэкономлено"
          color="#2196F3"
        />
        <ImpactStat
          icon="book-open"
          value={`${uniqueRecipes}`}
          label="рецептов создано"
          color="#9C27B0"
        />
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const { profile } = useUserProfile();
  const { products, refresh: refreshProducts, loading: productsLoading } = useProducts();
  const { savedRecipes, history } = useRecipes();
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refreshProducts();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshProducts();
    setRefreshing(false);
  };

  const expiringProducts = sortProductsByExpiry(getExpiringProducts(products, 7)).slice(0, 5);
  const recentRecipes = [...savedRecipes, ...history].slice(0, 3);

  const handleScan = () => {
    navigation.navigate("Scan");
  };

  const handleMealPlan = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate("MealPlan");
  };

  const handleFindRecipes = () => {
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
        <View style={styles.greetingContainer}>
          <ThemedText type="h1">
            Привет, {profile?.name || "Гость"}!
          </ThemedText>
          <ThemedText type="body" secondary>
            Что приготовим сегодня?
          </ThemedText>
        </View>

        <SearchBar />

        <View style={styles.actionsGrid}>
          <ActionCard
            icon="camera"
            title="Сканировать"
            subtitle="AI распознавание"
            color={theme.primary}
            onPress={() => navigation.navigate("Scan")}
          />
          <ActionCard
            icon="book-open"
            title="Найти рецепты"
            subtitle="База 1000+ блюд"
            color="#4CAF50"
            onPress={handleFindRecipes}
          />
          <ActionCard
            icon="calendar"
            title="План питания"
            subtitle="На 7 дней"
            color="#9C27B0"
            onPress={handleMealPlan}
          />
          <ActionCard
            icon="package"
            title="Мои запасы"
            subtitle={`${products.length} продуктов`}
            color="#FF9800"
            onPress={() => navigation.navigate("Stock")}
          />
        </View>

        <PromoBanner />

        <ImpactDashboard />

        {expiringProducts.length > 0 ? (
          <>
            <View style={styles.sectionHeader}>
              <ThemedText type="h2">Скоро истекает</ThemedText>
              <Pressable
                onPress={() => navigation.navigate("Stock")}
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
              >
                <ThemedText type="link">Все</ThemedText>
              </Pressable>
            </View>
            <View style={styles.productsList}>
              {expiringProducts.map((product) => (
                <ProductItem
                  key={product.id}
                  product={product}
                  onPress={() => navigation.navigate("Stock")}
                />
              ))}
            </View>
          </>
        ) : (
          <View style={[styles.emptyState, { backgroundColor: theme.backgroundDefault }]}>
            <Feather name="check-circle" size={48} color={theme.statusGreen} />
            <ThemedText type="h3" style={styles.emptyTitle}>
              Все свежее!
            </ThemedText>
            <ThemedText type="body" secondary style={styles.emptyText}>
              У вас нет продуктов, которые скоро испортятся
            </ThemedText>
          </View>
        )}

        {recentRecipes.length > 0 ? (
          <>
            <View style={styles.sectionHeader}>
              <ThemedText type="h2">Недавние рецепты</ThemedText>
            </View>
            {recentRecipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                onPress={() => navigation.navigate("RecipeDetail", { recipe })}
              />
            ))}
          </>
        ) : null}

        <View style={{ height: 80 }} />
      </ScreenScrollView>
      <ScanFAB onPress={handleScan} />
    </>
  );
}

const styles = StyleSheet.create({
  greetingContainer: {
    marginBottom: Spacing.xl,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Spacing.xs,
  },
  voiceButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing["2xl"],
    marginBottom: Spacing.lg,
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  actionCard: {
    width: "48%",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    flexGrow: 1,
    flexBasis: "45%",
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  actionTitle: {
    marginBottom: Spacing.xs,
  },
  promoBanner: {
    marginTop: Spacing.xl,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    overflow: "hidden",
    position: "relative",
  },
  promoContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 1,
  },
  promoTextContainer: {
    flex: 1,
    marginRight: Spacing.md,
  },
  promoTitle: {
    color: "#FFFFFF",
    marginBottom: Spacing.xs,
  },
  promoSubtitle: {
    color: "rgba(255,255,255,0.85)",
    lineHeight: 18,
  },
  promoButton: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  promoButtonText: {
    color: "#4CAF50",
    fontWeight: "600",
  },
  promoDecoration: {
    position: "absolute",
    right: -10,
    bottom: -10,
    opacity: 0.5,
  },
  impactDashboard: {
    marginTop: Spacing.xl,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  impactHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  impactGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  impactStat: {
    width: "48%",
    flexGrow: 1,
    flexBasis: "45%",
    alignItems: "center",
    padding: Spacing.md,
  },
  impactIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xs,
  },
  productsList: {
    gap: Spacing.sm,
  },
  productItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.md,
  },
  productInfo: {
    flex: 1,
  },
  expiryBadge: {
    flexDirection: "row",
    alignItems: "center",
  },
  emptyState: {
    padding: Spacing["2xl"],
    borderRadius: BorderRadius.md,
    alignItems: "center",
    marginTop: Spacing.xl,
  },
  emptyTitle: {
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  emptyText: {
    textAlign: "center",
  },
  recipeCard: {
    flexDirection: "row",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  recipeImageContainer: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.sm,
    marginRight: Spacing.md,
    overflow: "hidden",
  },
  recipeImage: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.sm,
  },
  recipeImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  recipeInfo: {
    flex: 1,
    justifyContent: "center",
  },
  recipeStats: {
    flexDirection: "row",
    gap: Spacing.lg,
    marginTop: Spacing.sm,
  },
  recipeStat: {
    flexDirection: "row",
    alignItems: "center",
  },
});
