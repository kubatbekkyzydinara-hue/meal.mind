import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Alert,
  ScrollView,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  FadeIn,
} from "react-native-reanimated";

import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useUserProfile } from "@/context/UserProfileContext";
import { useShoppingList } from "@/hooks/useAppState";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { ShoppingStackParamList } from "@/navigation/ShoppingStackNavigator";
import { ShoppingItem, ProductCategory, CATEGORY_LABELS } from "@/types";

type NavigationProp = NativeStackNavigationProp<ShoppingStackParamList>;

type DeliveryService = "glovo" | "nambafood";
type PaymentMethod = "cash" | "card" | "elsom";

const DELIVERY_SERVICES: { id: DeliveryService; name: string; time: string; icon: string }[] = [
  { id: "glovo", name: "Glovo", time: "30-45 мин", icon: "truck" },
  { id: "nambafood", name: "NambaFood", time: "40-60 мин", icon: "package" },
];

const PAYMENT_METHODS: { id: PaymentMethod; name: string; icon: keyof typeof Feather.glyphMap }[] = [
  { id: "cash", name: "Наличными курьеру", icon: "dollar-sign" },
  { id: "card", name: "Картой онлайн", icon: "credit-card" },
  { id: "elsom", name: "Элсом", icon: "smartphone" },
];

const MOCK_PRICES: Record<ProductCategory, number> = {
  dairy: 120,
  meat: 350,
  vegetables: 80,
  fruits: 100,
  grains: 60,
  beverages: 90,
  condiments: 150,
  frozen: 200,
  bakery: 70,
  other: 100,
};

function RadioButton({ selected, color }: { selected: boolean; color: string }) {
  return (
    <View style={[styles.radio, { borderColor: selected ? color : "#ccc" }]}>
      {selected ? <View style={[styles.radioInner, { backgroundColor: color }]} /> : null}
    </View>
  );
}

interface OrderItemProps {
  item: ShoppingItem;
  price: number;
}

function OrderItem({ item, price }: OrderItemProps) {
  const { theme } = useTheme();
  
  return (
    <View style={[styles.orderItem, { borderBottomColor: theme.border }]}>
      <View style={styles.orderItemInfo}>
        <ThemedText type="body">{item.name}</ThemedText>
        <ThemedText type="caption" secondary>
          {item.quantity} {item.unit}
        </ThemedText>
      </View>
      <ThemedText type="body" style={{ fontWeight: "600" }}>
        {price} сом
      </ThemedText>
    </View>
  );
}

export default function DeliveryScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const { profile } = useUserProfile();
  const { items } = useShoppingList();
  
  const uncheckedItems = items.filter(item => !item.checked);
  
  const [deliveryService, setDeliveryService] = useState<DeliveryService>(
    profile?.deliveryService || "glovo"
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [address, setAddress] = useState(profile?.city || "Бишкек");
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  
  const subtotal = uncheckedItems.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 1;
    return sum + (MOCK_PRICES[item.category] * Math.ceil(qty));
  }, 0);
  
  const hasItems = uncheckedItems.length > 0;
  const discount = hasItems ? Math.round(subtotal * 0.3) : 0;
  const deliveryFee = hasItems ? (deliveryService === "glovo" ? 99 : 79) : 0;
  const total = hasItems ? (subtotal - discount + deliveryFee) : 0;
  
  const handlePlaceOrder = () => {
    if (!hasItems) {
      Alert.alert("Корзина пуста", "Добавьте товары в список покупок");
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const orderNum = `MM-${Date.now().toString().slice(-6)}`;
    setOrderNumber(orderNum);
    setOrderPlaced(true);
  };
  
  const handleTrackOrder = () => {
    Alert.alert(
      "Отслеживание заказа",
      `Заказ ${orderNumber} находится в обработке.\nОжидаемое время: ${deliveryService === "glovo" ? "30-45" : "40-60"} минут`,
      [{ text: "OK" }]
    );
  };

  if (orderPlaced) {
    return (
      <View style={[styles.successContainer, { backgroundColor: theme.backgroundRoot }]}>
        <Animated.View entering={FadeIn.duration(500)} style={styles.successContent}>
          <View style={[styles.successIcon, { backgroundColor: theme.statusGreen + "20" }]}>
            <Feather name="check-circle" size={64} color={theme.statusGreen} />
          </View>
          
          <ThemedText type="h1" style={styles.successTitle}>
            Заказ оформлен!
          </ThemedText>
          
          <ThemedText type="body" secondary style={styles.successSubtitle}>
            Номер заказа: {orderNumber}
          </ThemedText>
          
          <View style={[styles.deliveryInfo, { backgroundColor: theme.backgroundDefault }]}>
            <Feather name="clock" size={20} color={theme.primary} />
            <ThemedText type="body" style={{ marginLeft: Spacing.sm }}>
              Ожидаемое время: {deliveryService === "glovo" ? "30-45" : "40-60"} мин
            </ThemedText>
          </View>
          
          <View style={[styles.deliveryInfo, { backgroundColor: theme.backgroundDefault }]}>
            <Feather name="map-pin" size={20} color={theme.primary} />
            <ThemedText type="body" style={{ marginLeft: Spacing.sm }}>
              {address}
            </ThemedText>
          </View>
          
          <Pressable
            onPress={handleTrackOrder}
            style={[styles.trackButton, { backgroundColor: theme.primary }]}
          >
            <Feather name="navigation" size={20} color="#fff" />
            <ThemedText type="body" style={styles.trackButtonText}>
              Отследить заказ
            </ThemedText>
          </Pressable>
          
          <Pressable
            onPress={() => navigation.goBack()}
            style={[styles.backButton, { borderColor: theme.border }]}
          >
            <ThemedText type="body" style={{ color: theme.primary }}>
              Вернуться к списку
            </ThemedText>
          </Pressable>
        </Animated.View>
      </View>
    );
  }

  return (
    <ScreenScrollView>
      <View style={[styles.section, { backgroundColor: theme.backgroundDefault }]}>
        <ThemedText type="h3" style={styles.sectionTitle}>
          Ваш заказ ({uncheckedItems.length} товаров)
        </ThemedText>
        
        {uncheckedItems.map((item) => (
          <OrderItem 
            key={item.id} 
            item={item} 
            price={MOCK_PRICES[item.category]} 
          />
        ))}
      </View>
      
      <View style={[styles.section, { backgroundColor: theme.backgroundDefault }]}>
        <ThemedText type="h3" style={styles.sectionTitle}>
          Итого
        </ThemedText>
        
        <View style={styles.summaryRow}>
          <ThemedText type="body" secondary>Сумма товаров</ThemedText>
          <ThemedText type="body">{subtotal} сом</ThemedText>
        </View>
        
        <View style={styles.summaryRow}>
          <ThemedText type="body" secondary>Скидка 30%</ThemedText>
          <ThemedText type="body" style={{ color: theme.statusGreen }}>
            -{discount} сом
          </ThemedText>
        </View>
        
        <View style={styles.summaryRow}>
          <ThemedText type="body" secondary>Доставка</ThemedText>
          <ThemedText type="body">{deliveryFee} сом</ThemedText>
        </View>
        
        <View style={[styles.summaryRow, styles.totalRow, { borderTopColor: theme.border }]}>
          <ThemedText type="h3">К оплате</ThemedText>
          <ThemedText type="h2" style={{ color: theme.primary }}>
            {total} сом
          </ThemedText>
        </View>
      </View>
      
      <View style={[styles.section, { backgroundColor: theme.backgroundDefault }]}>
        <ThemedText type="h3" style={styles.sectionTitle}>
          Адрес доставки
        </ThemedText>
        
        <View style={styles.addressRow}>
          <Feather name="map-pin" size={20} color={theme.primary} />
          <ThemedText type="body" style={{ flex: 1, marginLeft: Spacing.sm }}>
            {address}
          </ThemedText>
          <Pressable
            onPress={() => Alert.alert("Изменить адрес", "Функция в разработке")}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <ThemedText type="link">Изменить</ThemedText>
          </Pressable>
        </View>
      </View>
      
      <View style={[styles.section, { backgroundColor: theme.backgroundDefault }]}>
        <ThemedText type="h3" style={styles.sectionTitle}>
          Сервис доставки
        </ThemedText>
        
        {DELIVERY_SERVICES.map((service) => (
          <Pressable
            key={service.id}
            onPress={() => {
              Haptics.selectionAsync();
              setDeliveryService(service.id);
            }}
            style={[
              styles.optionRow,
              deliveryService === service.id && { 
                backgroundColor: theme.primary + "10",
                borderColor: theme.primary,
              },
            ]}
          >
            <RadioButton selected={deliveryService === service.id} color={theme.primary} />
            <View style={styles.optionInfo}>
              <ThemedText type="body" style={{ fontWeight: "600" }}>
                {service.name}
              </ThemedText>
              <ThemedText type="caption" secondary>
                {service.time}
              </ThemedText>
            </View>
          </Pressable>
        ))}
      </View>
      
      <View style={[styles.section, { backgroundColor: theme.backgroundDefault }]}>
        <ThemedText type="h3" style={styles.sectionTitle}>
          Способ оплаты
        </ThemedText>
        
        {PAYMENT_METHODS.map((method) => (
          <Pressable
            key={method.id}
            onPress={() => {
              Haptics.selectionAsync();
              setPaymentMethod(method.id);
            }}
            style={[
              styles.optionRow,
              paymentMethod === method.id && { 
                backgroundColor: theme.primary + "10",
                borderColor: theme.primary,
              },
            ]}
          >
            <RadioButton selected={paymentMethod === method.id} color={theme.primary} />
            <Feather 
              name={method.icon} 
              size={20} 
              color={paymentMethod === method.id ? theme.primary : theme.textSecondary} 
              style={{ marginLeft: Spacing.sm }}
            />
            <ThemedText type="body" style={{ marginLeft: Spacing.sm }}>
              {method.name}
            </ThemedText>
          </Pressable>
        ))}
      </View>
      
      <Pressable
        onPress={handlePlaceOrder}
        style={[styles.orderButton, { backgroundColor: theme.primary }]}
      >
        <ThemedText type="body" style={styles.orderButtonText}>
          Оформить заказ за {total} сом
        </ThemedText>
      </Pressable>
      
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
  orderItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  orderItemInfo: {
    flex: 1,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.xs,
  },
  totalRow: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: "transparent",
    marginBottom: Spacing.sm,
  },
  optionInfo: {
    marginLeft: Spacing.md,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  orderButton: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
  },
  orderButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 18,
  },
  successContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  successContent: {
    alignItems: "center",
    width: "100%",
  },
  successIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xl,
  },
  successTitle: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  successSubtitle: {
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  deliveryInfo: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    width: "100%",
    marginBottom: Spacing.sm,
  },
  trackButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    width: "100%",
    marginTop: Spacing.xl,
    gap: Spacing.sm,
  },
  trackButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  backButton: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: Spacing.md,
  },
});
