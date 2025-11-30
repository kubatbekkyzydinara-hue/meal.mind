import React, { useState, useRef, useEffect } from "react";
import { 
  View, 
  StyleSheet, 
  Pressable, 
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  FadeIn,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useProducts, useRecipes } from "@/hooks/useAppState";
import { useApiKey } from "@/context/ApiKeyContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { chatWithGemini, ChatMessage } from "@/utils/api";
import { generateId } from "@/utils/helpers";

const QUICK_PROMPTS = [
  "Что приготовить на ужин?",
  "Как хранить овощи дольше?",
  "Простой рецепт из курицы",
  "Что делать если молоко скисло?",
];

interface MessageBubbleProps {
  message: ChatMessage;
}

function MessageBubble({ message }: MessageBubbleProps) {
  const { theme } = useTheme();
  const isUser = message.role === "user";

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      style={[
        styles.messageBubble,
        isUser ? styles.userBubble : styles.assistantBubble,
        {
          backgroundColor: isUser ? theme.primary : theme.backgroundDefault,
        },
      ]}
    >
      {!isUser ? (
        <View style={[styles.avatarContainer, { backgroundColor: theme.primary + "20" }]}>
          <Feather name="cpu" size={16} color={theme.primary} />
        </View>
      ) : null}
      <View style={styles.messageContent}>
        <ThemedText 
          type="body"
          style={[
            styles.messageText,
            { color: isUser ? "#FFFFFF" : theme.text },
          ]}
        >
          {message.content}
        </ThemedText>
        <ThemedText 
          type="caption" 
          style={[
            styles.messageTime,
            { color: isUser ? "rgba(255,255,255,0.7)" : theme.textSecondary },
          ]}
        >
          {new Date(message.timestamp).toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" })}
        </ThemedText>
      </View>
    </Animated.View>
  );
}

export default function ChatScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { apiKey, isConfigured } = useApiKey();
  const { products } = useProducts();
  const { history } = useRecipes();
  
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Привет! Я MealMind, ваш AI-помощник по кулинарии. Спросите меня о рецептах, хранении продуктов или что приготовить из того, что есть в холодильнике!",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);
  const inputScale = useSharedValue(1);

  const animatedInputStyle = useAnimatedStyle(() => ({
    transform: [{ scale: inputScale.value }],
  }));

  const scrollToEnd = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  useEffect(() => {
    scrollToEnd();
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    if (!isConfigured) {
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "assistant",
          content: "API ключ не настроен. Перейдите в Профиль > Настройки и добавьте ваш Google Gemini API ключ для работы чата.",
          timestamp: new Date().toISOString(),
        },
      ]);
      return;
    }

    const userMessage: ChatMessage = {
      id: generateId(),
      role: "user",
      content: text.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const response = await chatWithGemini(text, apiKey, {
        products,
        recentRecipes: history.slice(0, 5).map((r) => r.title),
      });

      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: "assistant",
        content: response,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      console.warn("Chat error:", error);
      
      let userFriendlyMessage = "Извините, что-то пошло не так. Попробуйте ещё раз через несколько секунд.";
      
      if (error.message?.includes("API ключ")) {
        userFriendlyMessage = "Не удалось подключиться к AI. Проверьте настройки API ключа в профиле.";
      } else if (error.message?.includes("network") || error.message?.includes("fetch")) {
        userFriendlyMessage = "Нет подключения к интернету. Проверьте соединение и попробуйте снова.";
      }
      
      const errorMessage: ChatMessage = {
        id: generateId(),
        role: "assistant",
        content: userFriendlyMessage,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    sendMessage(prompt);
  };

  const handleSend = () => {
    inputScale.value = withSpring(0.95, {}, () => {
      inputScale.value = withSpring(1);
    });
    sendMessage(inputText);
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={100}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MessageBubble message={item} />}
          contentContainerStyle={[
            styles.messagesList,
            { paddingBottom: 20 },
          ]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            messages.length === 1 ? (
              <View style={styles.quickPromptsContainer}>
                <ThemedText type="caption" secondary style={styles.quickPromptsTitle}>
                  Быстрые вопросы:
                </ThemedText>
                <View style={styles.quickPrompts}>
                  {QUICK_PROMPTS.map((prompt, index) => (
                    <Pressable
                      key={index}
                      onPress={() => handleQuickPrompt(prompt)}
                      style={({ pressed }) => [
                        styles.quickPrompt,
                        { 
                          backgroundColor: theme.backgroundDefault,
                          opacity: pressed ? 0.7 : 1,
                        },
                      ]}
                    >
                      <ThemedText type="small">{prompt}</ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null
          }
        />

        {isLoading ? (
          <View style={[styles.loadingContainer, { backgroundColor: theme.backgroundDefault }]}>
            <ActivityIndicator size="small" color={theme.primary} />
            <ThemedText type="caption" secondary style={{ marginLeft: Spacing.sm }}>
              MealMind думает...
            </ThemedText>
          </View>
        ) : null}

        <Animated.View 
          style={[
            styles.inputContainer,
            { 
              backgroundColor: theme.backgroundRoot,
              paddingBottom: insets.bottom + Spacing.md,
            },
            animatedInputStyle,
          ]}
        >
          <View style={[styles.inputWrapper, { backgroundColor: theme.backgroundDefault }]}>
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder="Спросите что-нибудь..."
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.text }]}
              multiline
              maxLength={500}
              onSubmitEditing={handleSend}
              blurOnSubmit={false}
            />
            <Pressable
              onPress={handleSend}
              disabled={!inputText.trim() || isLoading}
              style={({ pressed }) => [
                styles.sendButton,
                { 
                  backgroundColor: inputText.trim() ? theme.primary : theme.backgroundSecondary,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Feather 
                name="send" 
                size={20} 
                color={inputText.trim() ? "#FFFFFF" : theme.textSecondary} 
              />
            </Pressable>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  messagesList: {
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  messageBubble: {
    flexDirection: "row",
    marginBottom: Spacing.md,
    maxWidth: "85%",
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  userBubble: {
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
  },
  avatarContainer: {
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
  messageText: {
    lineHeight: 22,
  },
  messageTime: {
    marginTop: Spacing.xs,
    fontSize: 10,
  },
  quickPromptsContainer: {
    marginBottom: Spacing.xl,
  },
  quickPromptsTitle: {
    marginBottom: Spacing.md,
  },
  quickPrompts: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  quickPrompt: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  inputContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderRadius: BorderRadius.lg,
    paddingLeft: Spacing.md,
    paddingRight: Spacing.xs,
    paddingVertical: Spacing.xs,
    minHeight: 48,
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
    marginLeft: Spacing.xs,
  },
});
