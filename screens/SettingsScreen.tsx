import React, { useState, useEffect } from "react";
import { 
  View, 
  StyleSheet, 
  Pressable, 
  TextInput,
  Alert,
  Linking,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ScreenKeyboardAwareScrollView } from "@/components/ScreenKeyboardAwareScrollView";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useApiKey } from "@/context/ApiKeyContext";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";

export default function SettingsScreen() {
  const { theme } = useTheme();
  const { apiKey, setApiKey, isConfigured, isBuiltIn } = useApiKey();
  const [inputKey, setInputKey] = useState("");
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (!isBuiltIn && apiKey) {
      setInputKey(apiKey);
    }
  }, [apiKey, isBuiltIn]);

  const handleSaveKey = async () => {
    const trimmedKey = inputKey.trim();
    if (!trimmedKey || trimmedKey.length < 10) {
      Alert.alert("Ошибка", "Введите корректный API ключ (минимум 10 символов)");
      return;
    }

    try {
      await setApiKey(trimmedKey);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Успешно", "API ключ сохранен");
    } catch (error) {
      Alert.alert("Ошибка", "Не удалось сохранить ключ");
    }
  };

  const handleGetKey = () => {
    Linking.openURL("https://aistudio.google.com/app/apikey");
  };

  return (
    <ScreenKeyboardAwareScrollView>
      <View style={[styles.section, { backgroundColor: theme.backgroundDefault }]}>
        <View style={styles.sectionHeader}>
          <View style={[styles.iconContainer, { backgroundColor: theme.primary + "20" }]}>
            <Feather name="key" size={24} color={theme.primary} />
          </View>
          <View style={styles.sectionTitleContainer}>
            <ThemedText type="h3">Google Gemini API</ThemedText>
            <View style={styles.statusRow}>
              <View style={[
                styles.statusDot,
                { backgroundColor: isConfigured ? theme.statusGreen : theme.statusRed },
              ]} />
              <ThemedText type="caption" secondary>
                {isBuiltIn ? "Встроенный ключ" : isConfigured ? "Настроено" : "Не настроено"}
              </ThemedText>
            </View>
          </View>
        </View>

        {isBuiltIn ? (
          <View style={[styles.builtInBanner, { backgroundColor: theme.statusGreen + "20" }]}>
            <Feather name="check-circle" size={20} color={theme.statusGreen} />
            <View style={styles.builtInContent}>
              <ThemedText type="body" style={{ fontWeight: "600" }}>
                AI готов к работе!
              </ThemedText>
              <ThemedText type="small" secondary style={{ marginTop: 2 }}>
                Приложение настроено с предустановленным API ключом. Вы можете сразу 
                использовать все AI-функции: сканирование продуктов и генерацию рецептов.
              </ThemedText>
            </View>
          </View>
        ) : (
          <>
            <ThemedText type="body" secondary style={styles.description}>
              Для работы AI-функций (сканирование продуктов и генерация рецептов) 
              необходим бесплатный API ключ Google Gemini.
            </ThemedText>

            <View style={styles.inputContainer}>
              <TextInput
                style={[
                  styles.input,
                  { 
                    backgroundColor: theme.backgroundSecondary,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                value={inputKey}
                onChangeText={setInputKey}
                placeholder="Введите ваш API ключ"
                placeholderTextColor={theme.placeholder}
                secureTextEntry={!showKey}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Pressable
                onPress={() => setShowKey(!showKey)}
                style={styles.eyeButton}
              >
                <Feather 
                  name={showKey ? "eye-off" : "eye"} 
                  size={20} 
                  color={theme.textSecondary} 
                />
              </Pressable>
            </View>

            <View style={styles.buttonRow}>
              <Pressable
                onPress={handleGetKey}
                style={[styles.secondaryButton, { borderColor: theme.primary }]}
              >
                <Feather name="external-link" size={18} color={theme.primary} />
                <ThemedText type="body" style={{ color: theme.primary, marginLeft: 8 }}>
                  Получить ключ
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={handleSaveKey}
                style={[styles.primaryButton, { backgroundColor: theme.primary }]}
              >
                <Feather name="check" size={18} color="#FFFFFF" />
                <ThemedText style={{ color: "#FFFFFF", fontWeight: "600", marginLeft: 8 }}>
                  Сохранить
                </ThemedText>
              </Pressable>
            </View>
          </>
        )}
      </View>

      <View style={[styles.infoCard, { backgroundColor: theme.backgroundDefault }]}>
        <Feather name="info" size={20} color={theme.primary} />
        <View style={styles.infoContent}>
          <ThemedText type="h4">Бесплатный тариф Gemini</ThemedText>
          <ThemedText type="small" secondary style={{ marginTop: 4 }}>
            Google предоставляет 1500 бесплатных запросов в день для Gemini 2.0 Flash. 
            Этого достаточно для активного использования приложения.
          </ThemedText>
        </View>
      </View>

      {!isBuiltIn && (
        <View style={[styles.section, { backgroundColor: theme.backgroundDefault }]}>
          <ThemedText type="h3" style={styles.sectionTitle}>Как получить API ключ</ThemedText>
          
          <View style={styles.step}>
            <View style={[styles.stepNumber, { backgroundColor: theme.primary }]}>
              <ThemedText style={{ color: "#FFFFFF", fontWeight: "600" }}>1</ThemedText>
            </View>
            <ThemedText type="body" style={styles.stepText}>
              Перейдите на Google AI Studio
            </ThemedText>
          </View>

          <View style={styles.step}>
            <View style={[styles.stepNumber, { backgroundColor: theme.primary }]}>
              <ThemedText style={{ color: "#FFFFFF", fontWeight: "600" }}>2</ThemedText>
            </View>
            <ThemedText type="body" style={styles.stepText}>
              Войдите с вашим Google аккаунтом
            </ThemedText>
          </View>

          <View style={styles.step}>
            <View style={[styles.stepNumber, { backgroundColor: theme.primary }]}>
              <ThemedText style={{ color: "#FFFFFF", fontWeight: "600" }}>3</ThemedText>
            </View>
            <ThemedText type="body" style={styles.stepText}>
              Нажмите "Get API key" и создайте новый ключ
            </ThemedText>
          </View>

          <View style={styles.step}>
            <View style={[styles.stepNumber, { backgroundColor: theme.primary }]}>
              <ThemedText style={{ color: "#FFFFFF", fontWeight: "600" }}>4</ThemedText>
            </View>
            <ThemedText type="body" style={styles.stepText}>
              Скопируйте ключ и вставьте его выше
            </ThemedText>
          </View>
        </View>
      )}

      <View style={styles.footer}>
        <ThemedText type="caption" secondary style={styles.footerText}>
          {isBuiltIn 
            ? "Используется предустановленный API ключ для демонстрации"
            : "API ключ хранится локально на вашем устройстве и не передается третьим лицам"
          }
        </ThemedText>
      </View>
    </ScreenKeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  section: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  sectionTitleContainer: {
    flex: 1,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  builtInBanner: {
    flexDirection: "row",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "flex-start",
  },
  builtInContent: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  description: {
    marginBottom: Spacing.lg,
  },
  inputContainer: {
    position: "relative",
    marginBottom: Spacing.lg,
  },
  input: {
    height: Spacing.inputHeight,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.lg,
    paddingRight: 50,
    fontSize: Typography.body.fontSize,
  },
  eyeButton: {
    position: "absolute",
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    padding: 4,
  },
  buttonRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 44,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  primaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 44,
    borderRadius: BorderRadius.sm,
  },
  infoCard: {
    flexDirection: "row",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xl,
  },
  infoContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  sectionTitle: {
    marginBottom: Spacing.lg,
  },
  step: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  stepText: {
    flex: 1,
  },
  footer: {
    padding: Spacing.lg,
  },
  footerText: {
    textAlign: "center",
  },
});
