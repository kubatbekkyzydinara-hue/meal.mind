import React, { useState, useRef } from "react";
import { 
  View, 
  StyleSheet, 
  Pressable, 
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useApiKey } from "@/context/ApiKeyContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { HomeStackParamList } from "@/navigation/HomeStackNavigator";
import { analyzeImageWithGemini } from "@/utils/api";

type NavigationProp = NativeStackNavigationProp<HomeStackParamList, "Scan">;

export default function ScanScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const { apiKey, isConfigured } = useApiKey();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>("back");
  const [isProcessing, setIsProcessing] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const insets = useSafeAreaInsets();

  const handleGoBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.goBack();
  };

  const processImage = async (uri: string) => {
    if (!isConfigured) {
      Alert.alert(
        "API ключ не настроен",
        "Перейдите в Настройки и добавьте ваш Google Gemini API ключ",
        [
          { text: "Отмена", style: "cancel" },
          { 
            text: "Настройки", 
            onPress: () => {
              navigation.goBack();
            },
          },
        ]
      );
      return;
    }

    setIsProcessing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      let base64: string;
      
      // Universal approach: use fetch and convert to base64
      const response = await fetch(uri);
      const blob = await response.blob();
      base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const products = await analyzeImageWithGemini(base64, apiKey);

      if (products.length === 0) {
        Alert.alert(
          "Продукты не найдены",
          "Попробуйте сделать фото с лучшим освещением или ближе к продуктам"
        );
        setIsProcessing(false);
        return;
      }

      navigation.replace("ScanResult", { products, imageUri: uri });
    } catch (error: any) {
      console.error("Scan error:", error);
      Alert.alert(
        "Ошибка сканирования",
        error.message || "Не удалось распознать продукты. Попробуйте еще раз."
      );
      setIsProcessing(false);
    }
  };

  const handleCapture = async () => {
    if (!cameraRef.current || isProcessing) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
      });

      if (photo?.uri) {
        await processImage(photo.uri);
      }
    } catch (error) {
      console.error("Capture error:", error);
      Alert.alert("Ошибка", "Не удалось сделать фото");
    }
  };

  const handlePickImage = async () => {
    if (isProcessing) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await processImage(result.assets[0].uri);
    }
  };

  const toggleCameraFacing = () => {
    setFacing((current) => (current === "back" ? "front" : "back"));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  if (!permission) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator size="large" color={theme.primary} />
      </ThemedView>
    );
  }

  if (!permission.granted) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.permissionHeader, { paddingTop: insets.top + Spacing.sm }]}>
          <Pressable
            onPress={handleGoBack}
            style={({ pressed }) => [
              styles.permissionBackButton,
              { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather name="arrow-left" size={24} color={theme.text} />
            <ThemedText style={styles.permissionBackText}>Назад</ThemedText>
          </Pressable>
        </View>
        <View style={styles.permissionContent}>
          <Feather name="camera-off" size={64} color={theme.textSecondary} />
          <ThemedText type="h3" style={styles.permissionTitle}>
            Требуется доступ к камере
          </ThemedText>
          <ThemedText type="body" secondary style={styles.permissionText}>
            Для сканирования продуктов приложению нужен доступ к камере
          </ThemedText>
          <Pressable
            onPress={requestPermission}
            style={[styles.permissionButton, { backgroundColor: theme.primary }]}
          >
            <ThemedText style={{ color: "#FFFFFF", fontWeight: "600" }}>
              Разрешить доступ
            </ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  if (Platform.OS === "web") {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.permissionHeader, { paddingTop: insets.top + Spacing.sm }]}>
          <Pressable
            onPress={handleGoBack}
            style={({ pressed }) => [
              styles.permissionBackButton,
              { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather name="arrow-left" size={24} color={theme.text} />
            <ThemedText style={styles.permissionBackText}>Назад</ThemedText>
          </Pressable>
        </View>
        <View style={styles.permissionContent}>
          <Feather name="smartphone" size={64} color={theme.textSecondary} />
          <ThemedText type="h3" style={styles.permissionTitle}>
            Камера недоступна
          </ThemedText>
          <ThemedText type="body" secondary style={styles.permissionText}>
            Для сканирования продуктов откройте приложение в Expo Go на вашем телефоне
          </ThemedText>
          <Pressable
            onPress={handlePickImage}
            style={[styles.permissionButton, { backgroundColor: theme.primary }]}
          >
            <Feather name="image" size={20} color="#FFFFFF" />
            <ThemedText style={{ color: "#FFFFFF", fontWeight: "600", marginLeft: 8 }}>
              Выбрать из галереи
            </ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
      >
        <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
          <Pressable
            onPress={handleGoBack}
            style={({ pressed }) => [
              styles.backButton,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather name="arrow-left" size={24} color="#FFFFFF" />
            <ThemedText style={styles.backText}>Назад</ThemedText>
          </Pressable>
        </View>

        <View style={styles.overlay}>
          <View style={styles.scanArea}>
            <View style={[styles.corner, styles.topLeft, { borderColor: theme.primary }]} />
            <View style={[styles.corner, styles.topRight, { borderColor: theme.primary }]} />
            <View style={[styles.corner, styles.bottomLeft, { borderColor: theme.primary }]} />
            <View style={[styles.corner, styles.bottomRight, { borderColor: theme.primary }]} />
          </View>
          
          <ThemedText type="body" style={styles.hint}>
            Наведите камеру на холодильник или продукты
          </ThemedText>
        </View>

        {isProcessing ? (
          <View style={styles.processingOverlay}>
            <View style={[styles.processingCard, { backgroundColor: theme.backgroundRoot }]}>
              <ActivityIndicator size="large" color={theme.primary} />
              <ThemedText type="h4" style={styles.processingText}>
                AI анализирует изображение...
              </ThemedText>
              <ThemedText type="small" secondary>
                Это может занять несколько секунд
              </ThemedText>
            </View>
          </View>
        ) : null}

        <View style={styles.controls}>
          <Pressable
            onPress={handlePickImage}
            style={({ pressed }) => [
              styles.controlButton,
              { 
                backgroundColor: "rgba(255,255,255,0.2)",
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Feather name="image" size={24} color="#FFFFFF" />
          </Pressable>

          <Pressable
            onPress={handleCapture}
            disabled={isProcessing}
            style={({ pressed }) => [
              styles.captureButton,
              { 
                backgroundColor: theme.primary,
                opacity: pressed || isProcessing ? 0.8 : 1,
                transform: [{ scale: pressed ? 0.95 : 1 }],
              },
            ]}
          >
            <View style={styles.captureInner} />
          </Pressable>

          <Pressable
            onPress={toggleCameraFacing}
            style={({ pressed }) => [
              styles.controlButton,
              { 
                backgroundColor: "rgba(255,255,255,0.2)",
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Feather name="refresh-cw" size={24} color="#FFFFFF" />
          </Pressable>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: Spacing.md,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: BorderRadius.md,
    alignSelf: "flex-start",
  },
  backText: {
    color: "#FFFFFF",
    marginLeft: Spacing.xs,
    fontWeight: "600",
  },
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scanArea: {
    width: 280,
    height: 280,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 40,
    height: 40,
    borderWidth: 4,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 12,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 12,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 12,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 12,
  },
  hint: {
    color: "#FFFFFF",
    marginTop: Spacing.xl,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 50,
    gap: Spacing["3xl"],
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: "#FFFFFF",
  },
  captureInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  processingCard: {
    padding: Spacing["2xl"],
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    minWidth: 250,
  },
  processingText: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  permissionHeader: {
    paddingHorizontal: Spacing.md,
  },
  permissionBackButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    alignSelf: "flex-start",
  },
  permissionBackText: {
    marginLeft: Spacing.xs,
    fontWeight: "600",
  },
  permissionContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
  },
  permissionTitle: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  permissionText: {
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  permissionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
});
