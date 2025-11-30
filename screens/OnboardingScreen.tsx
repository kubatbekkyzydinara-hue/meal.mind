import React, { useState, useRef } from "react";
import { 
  View, 
  StyleSheet, 
  Pressable, 
  Dimensions,
  TextInput,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  interpolate,
  Extrapolation,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useOnboarding } from "@/hooks/useAppState";
import { useUserProfile } from "@/context/UserProfileContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { ProfileStackParamList } from "@/navigation/ProfileStackNavigator";
import { DietPreference, Allergen, Cuisine, UserProfile } from "@/types";
import { generateId } from "@/utils/helpers";

type NavigationProp = NativeStackNavigationProp<ProfileStackParamList, "Onboarding">;

const { width } = Dimensions.get("window");

interface OnboardingSlide {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  description: string;
  color: string;
}

const INFO_SLIDES: OnboardingSlide[] = [
  {
    icon: "camera",
    title: "Сканируйте холодильник",
    description: "Просто сфотографируйте содержимое вашего холодильника, и AI автоматически распознает все продукты",
    color: "#FF6B35",
  },
  {
    icon: "clock",
    title: "Следите за сроками",
    description: "Получайте уведомления о продуктах, которые скоро испортятся, чтобы не тратить деньги впустую",
    color: "#28A745",
  },
  {
    icon: "book-open",
    title: "Генерируйте рецепты",
    description: "AI создаст идеальный рецепт из ваших продуктов, приоритетно используя скоропортящиеся",
    color: "#9C27B0",
  },
  {
    icon: "trending-up",
    title: "Экономьте деньги",
    description: "Отслеживайте сколько вы сэкономили, сколько продуктов спасли от выбрасывания",
    color: "#FFC107",
  },
];

const AVATARS: { id: UserProfile['avatar']; emoji: string }[] = [
  { id: 'chef1', emoji: 'M' },
  { id: 'chef2', emoji: 'F' },
  { id: 'chef3', emoji: 'C' },
  { id: 'dish', emoji: 'D' },
];

const DIET_OPTIONS: { id: DietPreference; label: string }[] = [
  { id: 'vegan', label: 'Веганство' },
  { id: 'vegetarian', label: 'Вегетарианство' },
  { id: 'gluten-free', label: 'Без глютена' },
  { id: 'lactose-free', label: 'Без лактозы' },
];

const ALLERGY_OPTIONS: { id: Allergen; label: string }[] = [
  { id: 'nuts', label: 'Орехи' },
  { id: 'milk', label: 'Молоко' },
  { id: 'fish', label: 'Рыба' },
  { id: 'eggs', label: 'Яйца' },
  { id: 'gluten', label: 'Глютен' },
  { id: 'soy', label: 'Соя' },
  { id: 'seafood', label: 'Морепродукты' },
];

const CUISINE_OPTIONS: { id: Cuisine; label: string }[] = [
  { id: 'asian', label: 'Азиатская' },
  { id: 'italian', label: 'Итальянская' },
  { id: 'georgian', label: 'Грузинская' },
  { id: 'european', label: 'Европейская' },
  { id: 'eastern', label: 'Восточная' },
  { id: 'mexican', label: 'Мексиканская' },
  { id: 'homemade', label: 'Домашняя' },
];

const CITIES = [
  'Бишкек',
  'Ош',
  'Джалал-Абад',
  'Каракол',
  'Токмок',
  'Нарын',
  'Талас',
  'Баткен',
];

type Phase = 'info' | 'registration';
type RegistrationStep = 1 | 2 | 3;

export default function OnboardingScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { complete } = useOnboarding();
  const { setProfile } = useUserProfile();
  
  const scrollX = useSharedValue(0);
  const scrollRef = useRef<Animated.ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const [phase, setPhase] = useState<Phase>('info');
  const [registrationStep, setRegistrationStep] = useState<RegistrationStep>(1);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState<UserProfile['avatar']>('chef1');
  const [dietPreferences, setDietPreferences] = useState<DietPreference[]>([]);
  const [allergies, setAllergies] = useState<Allergen[]>([]);
  const [favoriteCuisines, setFavoriteCuisines] = useState<Cuisine[]>([]);
  const [city, setCity] = useState('Бишкек');
  const [deliveryService, setDeliveryService] = useState<'glovo' | 'nambafood'>('glovo');
  const [isLocating, setIsLocating] = useState(false);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const toggleItem = <T,>(item: T, list: T[], setList: (l: T[]) => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (list.includes(item)) {
      setList(list.filter(i => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  const handleInfoNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentIndex < INFO_SLIDES.length - 1) {
      scrollRef.current?.scrollTo({ x: (currentIndex + 1) * width, animated: true });
      setCurrentIndex(currentIndex + 1);
    } else {
      setPhase('registration');
    }
  };

  const handleSkipInfo = () => {
    setPhase('registration');
  };

  const handleRegistrationNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (registrationStep === 1) {
      if (!name.trim()) {
        Alert.alert('Введите имя', 'Пожалуйста, укажите ваше имя');
        return;
      }
      setRegistrationStep(2);
    } else if (registrationStep === 2) {
      setRegistrationStep(3);
    } else {
      handleComplete();
    }
  };

  const handleRegistrationBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (registrationStep > 1) {
      setRegistrationStep((registrationStep - 1) as RegistrationStep);
    } else {
      setPhase('info');
      setCurrentIndex(INFO_SLIDES.length - 1);
    }
  };

  const handleGetLocation = async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Доступ к геолокации', 'Разрешите доступ к геолокации для автоматического определения города');
        return;
      }
      
      const location = await Location.getCurrentPositionAsync({});
      const [address] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      
      if (address?.city) {
        const foundCity = CITIES.find(c => 
          address.city?.toLowerCase().includes(c.toLowerCase()) ||
          c.toLowerCase().includes(address.city?.toLowerCase() || '')
        );
        if (foundCity) {
          setCity(foundCity);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    } catch (error) {
      console.error('Location error:', error);
    } finally {
      setIsLocating(false);
    }
  };

  const handleComplete = async () => {
    const profile: UserProfile = {
      id: generateId(),
      name: name.trim(),
      email: email.trim() || undefined,
      avatar,
      city,
      dietPreferences,
      allergies,
      favoriteCuisines,
      deliveryService,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    await setProfile(profile);
    await complete();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    navigation.goBack();
  };

  if (phase === 'registration') {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
          <Pressable onPress={handleRegistrationBack} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color={theme.text} />
          </Pressable>
          <ThemedText type="h4">Шаг {registrationStep} из 3</ThemedText>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.progressBar}>
          {[1, 2, 3].map((step) => (
            <View 
              key={step}
              style={[
                styles.progressSegment,
                { 
                  backgroundColor: step <= registrationStep 
                    ? theme.primary 
                    : theme.border,
                },
              ]} 
            />
          ))}
        </View>

        <ScrollView 
          style={styles.formContainer}
          contentContainerStyle={styles.formContent}
          showsVerticalScrollIndicator={false}
        >
          {registrationStep === 1 ? (
            <Animated.View entering={FadeIn} exiting={FadeOut}>
              <View style={[styles.stepIcon, { backgroundColor: theme.primary + "20" }]}>
                <Feather name="user" size={40} color={theme.primary} />
              </View>
              <ThemedText type="h2" style={styles.stepTitle}>
                Личные данные
              </ThemedText>
              <ThemedText type="body" secondary style={styles.stepDescription}>
                Расскажите немного о себе
              </ThemedText>

              <View style={styles.inputGroup}>
                <ThemedText type="h4" style={styles.inputLabel}>Ваше имя *</ThemedText>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Введите имя"
                  placeholderTextColor={theme.textSecondary}
                  style={[
                    styles.textInput,
                    { 
                      backgroundColor: theme.backgroundDefault,
                      color: theme.text,
                      borderColor: theme.border,
                    },
                  ]}
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText type="h4" style={styles.inputLabel}>Email (опционально)</ThemedText>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="email@example.com"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={[
                    styles.textInput,
                    { 
                      backgroundColor: theme.backgroundDefault,
                      color: theme.text,
                      borderColor: theme.border,
                    },
                  ]}
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText type="h4" style={styles.inputLabel}>Выберите аватар</ThemedText>
                <View style={styles.avatarRow}>
                  {AVATARS.map((av) => (
                    <Pressable
                      key={av.id}
                      onPress={() => {
                        setAvatar(av.id);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      style={[
                        styles.avatarOption,
                        { 
                          backgroundColor: avatar === av.id 
                            ? theme.primary 
                            : theme.backgroundDefault,
                          borderColor: avatar === av.id 
                            ? theme.primary 
                            : theme.border,
                        },
                      ]}
                    >
                      <Feather 
                        name={av.id === 'chef1' ? 'user' : av.id === 'chef2' ? 'smile' : av.id === 'chef3' ? 'star' : 'heart'}
                        size={28}
                        color={avatar === av.id ? '#FFFFFF' : theme.text}
                      />
                    </Pressable>
                  ))}
                </View>
              </View>
            </Animated.View>
          ) : registrationStep === 2 ? (
            <Animated.View entering={FadeIn} exiting={FadeOut}>
              <View style={[styles.stepIcon, { backgroundColor: "#28A745" + "20" }]}>
                <Feather name="heart" size={40} color="#28A745" />
              </View>
              <ThemedText type="h2" style={styles.stepTitle}>
                Предпочтения
              </ThemedText>
              <ThemedText type="body" secondary style={styles.stepDescription}>
                Укажите диету и аллергии
              </ThemedText>

              <View style={styles.inputGroup}>
                <ThemedText type="h4" style={styles.inputLabel}>Диета</ThemedText>
                <View style={styles.chipContainer}>
                  {DIET_OPTIONS.map((diet) => (
                    <Pressable
                      key={diet.id}
                      onPress={() => toggleItem(diet.id, dietPreferences, setDietPreferences)}
                      style={[
                        styles.chip,
                        { 
                          backgroundColor: dietPreferences.includes(diet.id)
                            ? theme.primary
                            : theme.backgroundDefault,
                          borderColor: dietPreferences.includes(diet.id)
                            ? theme.primary
                            : theme.border,
                        },
                      ]}
                    >
                      <ThemedText
                        style={[
                          styles.chipText,
                          { color: dietPreferences.includes(diet.id) ? '#FFFFFF' : theme.text },
                        ]}
                      >
                        {diet.label}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <ThemedText type="h4" style={styles.inputLabel}>Аллергии</ThemedText>
                <View style={styles.chipContainer}>
                  {ALLERGY_OPTIONS.map((allergy) => (
                    <Pressable
                      key={allergy.id}
                      onPress={() => toggleItem(allergy.id, allergies, setAllergies)}
                      style={[
                        styles.chip,
                        { 
                          backgroundColor: allergies.includes(allergy.id)
                            ? theme.statusRed
                            : theme.backgroundDefault,
                          borderColor: allergies.includes(allergy.id)
                            ? theme.statusRed
                            : theme.border,
                        },
                      ]}
                    >
                      <ThemedText
                        style={[
                          styles.chipText,
                          { color: allergies.includes(allergy.id) ? '#FFFFFF' : theme.text },
                        ]}
                      >
                        {allergy.label}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <ThemedText type="h4" style={styles.inputLabel}>Любимые кухни</ThemedText>
                <View style={styles.chipContainer}>
                  {CUISINE_OPTIONS.map((cuisine) => (
                    <Pressable
                      key={cuisine.id}
                      onPress={() => toggleItem(cuisine.id, favoriteCuisines, setFavoriteCuisines)}
                      style={[
                        styles.chip,
                        { 
                          backgroundColor: favoriteCuisines.includes(cuisine.id)
                            ? theme.statusGreen
                            : theme.backgroundDefault,
                          borderColor: favoriteCuisines.includes(cuisine.id)
                            ? theme.statusGreen
                            : theme.border,
                        },
                      ]}
                    >
                      <ThemedText
                        style={[
                          styles.chipText,
                          { color: favoriteCuisines.includes(cuisine.id) ? '#FFFFFF' : theme.text },
                        ]}
                      >
                        {cuisine.label}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>
            </Animated.View>
          ) : (
            <Animated.View entering={FadeIn} exiting={FadeOut}>
              <View style={[styles.stepIcon, { backgroundColor: "#9C27B0" + "20" }]}>
                <Feather name="map-pin" size={40} color="#9C27B0" />
              </View>
              <ThemedText type="h2" style={styles.stepTitle}>
                Локация
              </ThemedText>
              <ThemedText type="body" secondary style={styles.stepDescription}>
                Выберите город для доставки
              </ThemedText>

              <View style={styles.inputGroup}>
                <View style={styles.cityHeader}>
                  <ThemedText type="h4" style={styles.inputLabel}>Город</ThemedText>
                  <Pressable 
                    onPress={handleGetLocation}
                    disabled={isLocating}
                    style={styles.locationButton}
                  >
                    <Feather 
                      name={isLocating ? "loader" : "navigation"} 
                      size={16} 
                      color={theme.primary} 
                    />
                    <ThemedText type="link" style={{ marginLeft: 4 }}>
                      {isLocating ? 'Определение...' : 'Определить'}
                    </ThemedText>
                  </Pressable>
                </View>
                <View style={styles.chipContainer}>
                  {CITIES.map((c) => (
                    <Pressable
                      key={c}
                      onPress={() => {
                        setCity(c);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      style={[
                        styles.chip,
                        { 
                          backgroundColor: city === c
                            ? theme.primary
                            : theme.backgroundDefault,
                          borderColor: city === c
                            ? theme.primary
                            : theme.border,
                        },
                      ]}
                    >
                      <ThemedText
                        style={[
                          styles.chipText,
                          { color: city === c ? '#FFFFFF' : theme.text },
                        ]}
                      >
                        {c}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <ThemedText type="h4" style={styles.inputLabel}>Сервис доставки</ThemedText>
                <View style={styles.deliveryRow}>
                  <Pressable
                    onPress={() => {
                      setDeliveryService('glovo');
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    style={[
                      styles.deliveryOption,
                      { 
                        backgroundColor: deliveryService === 'glovo'
                          ? '#FFC244'
                          : theme.backgroundDefault,
                        borderColor: deliveryService === 'glovo'
                          ? '#FFC244'
                          : theme.border,
                      },
                    ]}
                  >
                    <Feather name="box" size={24} color={deliveryService === 'glovo' ? '#000' : theme.text} />
                    <ThemedText 
                      type="h4" 
                      style={{ 
                        marginTop: Spacing.sm,
                        color: deliveryService === 'glovo' ? '#000' : theme.text,
                      }}
                    >
                      Glovo
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setDeliveryService('nambafood');
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    style={[
                      styles.deliveryOption,
                      { 
                        backgroundColor: deliveryService === 'nambafood'
                          ? '#E31837'
                          : theme.backgroundDefault,
                        borderColor: deliveryService === 'nambafood'
                          ? '#E31837'
                          : theme.border,
                      },
                    ]}
                  >
                    <Feather name="truck" size={24} color={deliveryService === 'nambafood' ? '#FFF' : theme.text} />
                    <ThemedText 
                      type="h4" 
                      style={{ 
                        marginTop: Spacing.sm,
                        color: deliveryService === 'nambafood' ? '#FFF' : theme.text,
                      }}
                    >
                      NambaFood
                    </ThemedText>
                  </Pressable>
                </View>
              </View>
            </Animated.View>
          )}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.xl }]}>
          <Pressable
            onPress={handleRegistrationNext}
            style={({ pressed }) => [
              styles.nextButton,
              { 
                backgroundColor: theme.primary,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <ThemedText style={styles.nextButtonText}>
              {registrationStep === 3 ? 'Начать использовать' : 'Далее'}
            </ThemedText>
            <Feather 
              name={registrationStep === 3 ? "check" : "arrow-right"} 
              size={20} 
              color="#FFFFFF" 
            />
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <View style={{ width: 80 }} />
        <ThemedText type="h4">MealMind</ThemedText>
        <Pressable onPress={handleSkipInfo} style={styles.skipButton}>
          <ThemedText type="link">Пропустить</ThemedText>
        </Pressable>
      </View>

      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
      >
        {INFO_SLIDES.map((slide, index) => (
          <View key={index} style={styles.slide}>
            <View style={[styles.iconContainer, { backgroundColor: slide.color + "20" }]}>
              <Feather name={slide.icon} size={64} color={slide.color} />
            </View>
            <ThemedText type="h1" style={styles.title}>
              {slide.title}
            </ThemedText>
            <ThemedText type="body" secondary style={styles.description}>
              {slide.description}
            </ThemedText>
          </View>
        ))}
      </Animated.ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.xl }]}>
        <View style={styles.pagination}>
          {INFO_SLIDES.map((_, index) => {
            const dotStyle = useAnimatedStyle(() => {
              const inputRange = [
                (index - 1) * width,
                index * width,
                (index + 1) * width,
              ];
              const dotWidth = interpolate(
                scrollX.value,
                inputRange,
                [8, 24, 8],
                Extrapolation.CLAMP
              );
              const opacity = interpolate(
                scrollX.value,
                inputRange,
                [0.3, 1, 0.3],
                Extrapolation.CLAMP
              );
              return {
                width: dotWidth,
                opacity,
              };
            });

            return (
              <Animated.View
                key={index}
                style={[
                  styles.dot,
                  { backgroundColor: theme.primary },
                  dotStyle,
                ]}
              />
            );
          })}
        </View>

        <Pressable
          onPress={handleInfoNext}
          style={({ pressed }) => [
            styles.nextButton,
            { 
              backgroundColor: theme.primary,
              opacity: pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            },
          ]}
        >
          <ThemedText style={styles.nextButtonText}>
            {currentIndex === INFO_SLIDES.length - 1 ? "Создать профиль" : "Далее"}
          </ThemedText>
          <Feather 
            name={currentIndex === INFO_SLIDES.length - 1 ? "user-plus" : "arrow-right"} 
            size={20} 
            color="#FFFFFF" 
          />
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  skipButton: {
    padding: Spacing.sm,
    width: 80,
    alignItems: 'flex-end',
  },
  backButton: {
    padding: Spacing.sm,
    width: 40,
  },
  progressBar: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  slide: {
    width,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing["2xl"],
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing["3xl"],
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  description: {
    textAlign: "center",
    paddingHorizontal: Spacing.lg,
  },
  footer: {
    paddingHorizontal: Spacing.xl,
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  nextButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 52,
    borderRadius: BorderRadius.md,
  },
  nextButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
    marginRight: Spacing.sm,
  },
  formContainer: {
    flex: 1,
  },
  formContent: {
    padding: Spacing.xl,
    paddingBottom: Spacing["3xl"],
  },
  stepIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: Spacing.lg,
  },
  stepTitle: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  stepDescription: {
    textAlign: "center",
    marginBottom: Spacing["2xl"],
  },
  inputGroup: {
    marginBottom: Spacing.xl,
  },
  inputLabel: {
    marginBottom: Spacing.md,
  },
  textInput: {
    height: 52,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    fontSize: 16,
    borderWidth: 1,
  },
  avatarRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  avatarOption: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 14,
    fontWeight: "500",
  },
  cityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  locationButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  deliveryRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  deliveryOption: {
    flex: 1,
    height: 100,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
});
