import React, { useState, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
  FlatList,
  Modal,
  Dimensions,
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
  withSequence,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useProducts, useRecipes } from "@/hooks/useAppState";
import { useApiKey } from "@/context/ApiKeyContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { chatWithGemini, ChatMessage } from "@/utils/api";
import { generateId } from "@/utils/helpers";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const CHAT_HEIGHT = SCREEN_HEIGHT * 0.7;

const QUICK_PROMPTS = [
  "Что приготовить?",
  "Советы по хранению",
  "Быстрый рецепт",
];

interface MessageBubbleProps {
  message: ChatMessage;
}

function MessageBubble({ message }: MessageBubbleProps) {
  const { theme } = useTheme();
  const isUser = message.role === "user";

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      style={[
        styles.messageBubble,
        isUser ? styles.userBubble : styles.assistantBubble,
        {
          backgroundColor: isUser ? theme.primary : theme.backgroundSecondary,
        },
      ]}
    >
      {!isUser ? (
        <View style={[styles.avatarSmall, { backgroundColor: theme.primary + "20" }]}>
          <Feather name="cpu" size={12} color={theme.primary} />
        </View>
      ) : null}
      <View style={styles.messageContent}>
        <ThemedText
          type="small"
          style={{ color: isUser ? "#FFFFFF" : theme.text, lineHeight: 20 }}
        >
          {message.content}
        </ThemedText>
      </View>
    </Animated.View>
  );
}

export function FloatingChat() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { apiKey, isConfigured } = useApiKey();
  const { products } = useProducts();
  const { history } = useRecipes();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Привет! Я MealMind - ваш AI помощник по кулинарии. Чем могу помочь?",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const buttonScale = useSharedValue(1);
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isOpen) {
        pulseScale.value = withSequence(
          withSpring(1.1, { damping: 3 }),
          withSpring(1, { damping: 5 })
        );
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [isOpen]);

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value * pulseScale.value }],
  }));

  const scrollToEnd = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  useEffect(() => {
    if (isOpen) {
      scrollToEnd();
    }
  }, [messages, isOpen]);

  const handleOpen = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    buttonScale.value = withSpring(0.9, {}, () => {
      buttonScale.value = withSpring(1);
    });
    setIsOpen(true);
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsOpen(false);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    if (!isConfigured) {
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "assistant",
          content: "API ключ не настроен. Добавьте Google Gemini API ключ в настройках профиля.",
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
        recentRecipes: history.slice(0, 3).map((r) => r.title),
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

      let userFriendlyMessage = "Что-то пошло не так. Попробуйте ещё раз.";

      if (error.message?.includes("API") || error.message?.includes("ключ")) {
        userFriendlyMessage = "Проверьте настройки API ключа в профиле.";
      } else if (error.message?.includes("network") || error.message?.includes("fetch")) {
        userFriendlyMessage = "Нет подключения к интернету.";
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    sendMessage(prompt);
  };

  return (
    <>
      <Animated.View
        style={[
          styles.floatingButton,
          { bottom: insets.bottom + 80 },
          animatedButtonStyle,
        ]}
      >
        <Pressable
          onPress={handleOpen}
          style={[styles.fabButton, { backgroundColor: theme.primary }]}
        >
          <Feather name="message-circle" size={24} color="#FFFFFF" />
        </Pressable>
      </Animated.View>

      <Modal
        visible={isOpen}
        transparent
        animationType="none"
        onRequestClose={handleClose}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.backdrop} onPress={handleClose} />

          <Animated.View
            entering={SlideInDown.springify().damping(15)}
            exiting={SlideOutDown.springify().damping(15)}
            style={[
              styles.chatContainer,
              {
                height: CHAT_HEIGHT,
                paddingBottom: insets.bottom,
                backgroundColor: theme.backgroundRoot,
              },
            ]}
          >
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
              <View style={styles.headerLeft}>
                <View style={[styles.avatarHeader, { backgroundColor: theme.primary }]}>
                  <Feather name="cpu" size={16} color="#FFFFFF" />
                </View>
                <View>
                  <ThemedText type="h4">AI Шеф-повар</ThemedText>
                  <ThemedText type="caption" secondary>
                    {isLoading ? "Печатает..." : "Онлайн"}
                  </ThemedText>
                </View>
              </View>
              <Pressable onPress={handleClose} hitSlop={12}>
                <Feather name="x" size={24} color={theme.textSecondary} />
              </Pressable>
            </View>

            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <MessageBubble message={item} />}
              contentContainerStyle={styles.messagesList}
              showsVerticalScrollIndicator={false}
              ListFooterComponent={
                messages.length === 1 ? (
                  <View style={styles.quickPromptsRow}>
                    {QUICK_PROMPTS.map((prompt, index) => (
                      <Pressable
                        key={index}
                        onPress={() => handleQuickPrompt(prompt)}
                        style={({ pressed }) => [
                          styles.quickPromptPill,
                          {
                            backgroundColor: theme.backgroundSecondary,
                            opacity: pressed ? 0.7 : 1,
                          },
                        ]}
                      >
                        <ThemedText type="caption">{prompt}</ThemedText>
                      </Pressable>
                    ))}
                  </View>
                ) : null
              }
            />

            {isLoading ? (
              <View style={[styles.typingIndicator, { backgroundColor: theme.backgroundSecondary }]}>
                <ActivityIndicator size="small" color={theme.primary} />
                <ThemedText type="caption" secondary style={{ marginLeft: 8 }}>
                  MealMind думает...
                </ThemedText>
              </View>
            ) : null}

            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
              <View style={[styles.inputRow, { backgroundColor: theme.backgroundDefault }]}>
                <TextInput
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder="Напишите вопрос..."
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.textInput, { color: theme.text }]}
                  multiline
                  maxLength={300}
                  onSubmitEditing={() => sendMessage(inputText)}
                  blurOnSubmit={false}
                />
                <Pressable
                  onPress={() => sendMessage(inputText)}
                  disabled={!inputText.trim() || isLoading}
                  style={[
                    styles.sendBtn,
                    {
                      backgroundColor: inputText.trim() ? theme.primary : theme.backgroundSecondary,
                    },
                  ]}
                >
                  <Feather
                    name="send"
                    size={18}
                    color={inputText.trim() ? "#FFFFFF" : theme.textSecondary}
                  />
                </Pressable>
              </View>
            </KeyboardAvoidingView>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  floatingButton: {
    position: "absolute",
    right: Spacing.lg,
    zIndex: 1000,
  },
  fabButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  chatContainer: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  avatarHeader: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  messagesList: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  messageBubble: {
    flexDirection: "row",
    marginBottom: Spacing.sm,
    maxWidth: "80%",
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    paddingHorizontal: Spacing.md,
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
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.xs,
  },
  messageContent: {
    flex: 1,
  },
  quickPromptsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
    marginTop: Spacing.md,
  },
  quickPromptPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  typingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignSelf: "flex-start",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.lg,
    paddingLeft: Spacing.md,
    paddingRight: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    maxHeight: 80,
    paddingVertical: Spacing.sm,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: Spacing.xs,
  },
});
