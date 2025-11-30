import React, { useCallback } from "react";
import { View, StyleSheet, Pressable, Alert } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useUserStats, useProducts, useRecipes } from "@/hooks/useAppState";
import { useUserProfile } from "@/context/UserProfileContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { ProfileStackParamList } from "@/navigation/ProfileStackNavigator";
import { formatMoney } from "@/utils/helpers";
import { clearAllData } from "@/utils/storage";

type NavigationProp = NativeStackNavigationProp<ProfileStackParamList, "Profile">;

interface StatCardProps {
  icon: keyof typeof Feather.glyphMap;
  value: string;
  label: string;
  color: string;
}

function StatCard({ icon, value, label, color }: StatCardProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.statCard, { backgroundColor: theme.backgroundDefault }]}>
      <View style={[styles.statIcon, { backgroundColor: color + "20" }]}>
        <Feather name={icon} size={20} color={color} />
      </View>
      <ThemedText type="h2" style={{ color }}>{value}</ThemedText>
      <ThemedText type="caption" secondary>{label}</ThemedText>
    </View>
  );
}

interface MenuItemProps {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
  danger?: boolean;
}

function MenuItem({ icon, title, subtitle, onPress, danger }: MenuItemProps) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [
        styles.menuItem,
        { 
          backgroundColor: theme.backgroundDefault,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <View style={[
        styles.menuIcon, 
        { backgroundColor: danger ? theme.statusRed + "20" : theme.primary + "20" }
      ]}>
        <Feather 
          name={icon} 
          size={20} 
          color={danger ? theme.statusRed : theme.primary} 
        />
      </View>
      <View style={styles.menuContent}>
        <ThemedText 
          type="body" 
          style={danger ? { color: theme.statusRed } : undefined}
        >
          {title}
        </ThemedText>
        {subtitle ? (
          <ThemedText type="caption" secondary>{subtitle}</ThemedText>
        ) : null}
      </View>
      <Feather name="chevron-right" size={20} color={theme.textSecondary} />
    </Pressable>
  );
}

export default function ProfileScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const { profile } = useUserProfile();
  const { stats, refresh: refreshStats } = useUserStats();
  const { products } = useProducts();
  const { savedRecipes } = useRecipes();

  useFocusEffect(
    useCallback(() => {
      refreshStats();
    }, [])
  );

  const handleClearData = () => {
    Alert.alert(
      "Очистить все данные",
      "Это действие удалит все ваши продукты, рецепты и статистику. Это нельзя отменить.",
      [
        { text: "Отмена", style: "cancel" },
        { 
          text: "Очистить", 
          style: "destructive",
          onPress: async () => {
            await clearAllData();
            Alert.alert("Готово", "Все данные очищены");
          },
        },
      ]
    );
  };

  return (
    <ScreenScrollView>
      <View style={[styles.header, { backgroundColor: theme.backgroundDefault }]}>
        <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
          <Feather name="user" size={40} color="#FFFFFF" />
        </View>
        <ThemedText type="h2" style={styles.userName}>
          {profile?.name || "Пользователь MealMind"}
        </ThemedText>
        <ThemedText type="body" secondary>
          Экономьте время и деньги с умным помощником
        </ThemedText>
      </View>

      <ThemedText type="h3" style={styles.sectionTitle}>Ваша статистика</ThemedText>
      <View style={styles.statsGrid}>
        <StatCard
          icon="dollar-sign"
          value={formatMoney(stats.moneySaved)}
          label="Сэкономлено"
          color={theme.primary}
        />
        <StatCard
          icon="clock"
          value={`${stats.timeSaved} мин`}
          label="Времени сэкономлено"
          color={theme.statusGreen}
        />
        <StatCard
          icon="trash-2"
          value={String(stats.wastePrevented)}
          label="Продуктов спасено"
          color={theme.statusYellow}
        />
        <StatCard
          icon="book-open"
          value={String(stats.recipesGenerated)}
          label="Рецептов создано"
          color="#9C27B0"
        />
      </View>

      <ThemedText type="h3" style={styles.sectionTitle}>Сводка</ThemedText>
      <View style={[styles.summaryCard, { backgroundColor: theme.backgroundDefault }]}>
        <View style={styles.summaryRow}>
          <ThemedText type="body">Продуктов в холодильнике</ThemedText>
          <ThemedText type="h4">{products.length}</ThemedText>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: theme.border }]} />
        <View style={styles.summaryRow}>
          <ThemedText type="body">Сохраненных рецептов</ThemedText>
          <ThemedText type="h4">{savedRecipes.length}</ThemedText>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: theme.border }]} />
        <View style={styles.summaryRow}>
          <ThemedText type="body">Продуктов отсканировано</ThemedText>
          <ThemedText type="h4">{stats.productsScanned}</ThemedText>
        </View>
      </View>

      <ThemedText type="h3" style={styles.sectionTitle}>Настройки</ThemedText>
      <View style={styles.menuList}>
        <MenuItem
          icon="settings"
          title="Настройки"
          subtitle="API ключи и настройки приложения"
          onPress={() => navigation.navigate("Settings")}
        />
        <MenuItem
          icon="help-circle"
          title="Обучение"
          subtitle="Пройти обучение заново"
          onPress={() => navigation.navigate("Onboarding")}
        />
        <MenuItem
          icon="trash-2"
          title="Очистить данные"
          subtitle="Удалить все данные приложения"
          onPress={handleClearData}
          danger
        />
      </View>

      <View style={styles.footer}>
        <ThemedText type="caption" secondary style={styles.footerText}>
          MealMind v1.0.0
        </ThemedText>
        <ThemedText type="caption" secondary style={styles.footerText}>
          AI Generative Hackathon 2025
        </ThemedText>
      </View>

      <View style={{ height: 100 }} />
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  userName: {
    marginBottom: Spacing.xs,
  },
  sectionTitle: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  statCard: {
    width: "48%",
    flexGrow: 1,
    flexBasis: "45%",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  summaryCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  summaryDivider: {
    height: 1,
  },
  menuList: {
    gap: Spacing.sm,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  menuContent: {
    flex: 1,
  },
  footer: {
    alignItems: "center",
    marginTop: Spacing["3xl"],
    paddingVertical: Spacing.xl,
  },
  footerText: {
    textAlign: "center",
  },
});
