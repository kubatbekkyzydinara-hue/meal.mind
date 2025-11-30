import React, { useState, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRoute, RouteProp } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useApiKey } from "@/context/ApiKeyContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { Recipe } from "@/types";
import { HomeStackParamList } from "@/navigation/HomeStackNavigator";

type RouteProps = RouteProp<HomeStackParamList, "ChefChat">;

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

const QUICK_QUESTIONS = [
  "Как определить готовность?",
  "Чем заменить ингредиент?",
  "Сколько хранится блюдо?",
  "Как подавать?",
];

export default function ChefChatScreen() {
  const route = useRoute<RouteProps>();
  const { theme } = useTheme();
  const { apiKey } = useApiKey();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  
  const { recipe } = route.params;
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `Привет! Я ваш AI шеф-помощник. Готовите "${recipe.title}"? Спрашивайте что угодно о рецепте, технике приготовления или замене ингредиентов. Я здесь чтобы помочь!`,
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (messages.length > 1) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    
    if (!apiKey) {
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: "AI помощник временно недоступен. Попробуйте позже.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputText("");
    setLoading(true);
    
    try {
      const ingredientsList = recipe.ingredients
        .map(i => `${i.name}: ${i.amount} ${i.unit}`)
        .join(", ");
      
      const systemPrompt = `Ты - опытный AI шеф-повар помощник в приложении MealMind. Пользователь готовит блюдо "${recipe.title}".

Описание блюда: ${recipe.description}
Ингредиенты: ${ingredientsList}
Инструкции: ${recipe.instructions.join(" ")}
Время готовки: ${recipe.cookTime} минут
Порции: ${recipe.servings}

Отвечай на русском языке. Будь дружелюбным, кратким и полезным. Давай практичные кулинарные советы. Если спрашивают о замене ингредиента - предложи конкретные альтернативы. Если спрашивают о технике - объясни просто и понятно.`;

      const conversationHistory = messages
        .filter(m => m.id !== "welcome")
        .map(m => ({
          role: m.role,
          parts: [{ text: m.content }]
        }));
      
      conversationHistory.push({
        role: "user",
        parts: [{ text: text.trim() }]
      });

      const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: conversationHistory,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 500,
          },
        }),
      });
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message);
      }
      
      const assistantText = data.candidates?.[0]?.content?.parts?.[0]?.text || 
        "Извините, не удалось получить ответ. Попробуйте переформулировать вопрос.";
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: assistantText,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
    } catch (error) {
      console.error("Chef chat error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Произошла ошибка. Проверьте интернет-соединение и попробуйте снова.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isUser = item.role === "user";
    
    return (
      <Animated.View
        entering={FadeInUp.delay(index * 50).duration(300)}
        style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.assistantBubble,
          {
            backgroundColor: isUser ? theme.primary : theme.backgroundDefault,
          },
        ]}
      >
        {!isUser ? (
          <View style={[styles.avatarSmall, { backgroundColor: theme.primary + "20" }]}>
            <Feather name="message-circle" size={14} color={theme.primary} />
          </View>
        ) : null}
        <View style={styles.messageContent}>
          <ThemedText
            type="body"
            style={isUser ? { color: "#FFFFFF" } : undefined}
          >
            {item.content}
          </ThemedText>
        </View>
      </Animated.View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={100}
    >
      <View style={[styles.recipeHeader, { backgroundColor: theme.backgroundDefault }]}>
        <Feather name="book-open" size={20} color={theme.primary} />
        <ThemedText type="h4" numberOfLines={1} style={{ flex: 1, marginLeft: Spacing.sm }}>
          {recipe.title}
        </ThemedText>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          loading ? (
            <View style={[styles.loadingBubble, { backgroundColor: theme.backgroundDefault }]}>
              <ActivityIndicator size="small" color={theme.primary} />
              <ThemedText type="caption" secondary style={{ marginLeft: Spacing.sm }}>
                Шеф думает...
              </ThemedText>
            </View>
          ) : null
        }
      />

      {messages.length === 1 && !loading ? (
        <View style={styles.quickQuestions}>
          <ThemedText type="caption" secondary style={{ marginBottom: Spacing.sm }}>
            Быстрые вопросы:
          </ThemedText>
          <View style={styles.quickButtonsRow}>
            {QUICK_QUESTIONS.map((q, i) => (
              <Pressable
                key={i}
                onPress={() => sendMessage(q)}
                disabled={loading}
                style={[styles.quickButton, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}
              >
                <ThemedText type="small">{q}</ThemedText>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      <View style={[styles.inputContainer, { paddingBottom: insets.bottom + Spacing.sm }]}>
        <View style={[styles.inputRow, { backgroundColor: theme.backgroundDefault }]}>
          <TextInput
            style={[styles.input, { color: theme.text }]}
            placeholder="Спросите шефа..."
            placeholderTextColor={theme.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />
          <Pressable
            onPress={() => sendMessage(inputText)}
            disabled={!inputText.trim() || loading}
            style={[
              styles.sendButton,
              { 
                backgroundColor: inputText.trim() && !loading ? theme.primary : theme.border,
              },
            ]}
          >
            <Feather name="send" size={18} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  recipeHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  messagesList: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  messageBubble: {
    flexDirection: "row",
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    maxWidth: "85%",
  },
  userBubble: {
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
  },
  avatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
  },
  messageContent: {
    flex: 1,
  },
  loadingBubble: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  quickQuestions: {
    padding: Spacing.lg,
  },
  quickButtonsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  quickButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  inputContainer: {
    padding: Spacing.md,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderRadius: BorderRadius.lg,
    paddingLeft: Spacing.md,
    paddingRight: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  input: {
    flex: 1,
    fontSize: 16,
    maxHeight: 100,
    paddingVertical: Spacing.sm,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
