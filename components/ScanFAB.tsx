import React from "react";
import { StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/hooks/useTheme";
import { Spacing, Shadows } from "@/constants/theme";

interface ScanFABProps {
  onPress: () => void;
}

export function ScanFAB({ onPress }: ScanFABProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.fab,
        {
          backgroundColor: theme.primary,
          bottom: 56 + insets.bottom + 8,
          transform: [{ scale: pressed ? 0.95 : 1 }],
          opacity: pressed ? 0.9 : 1,
        },
        Shadows.fab,
      ]}
    >
      <Feather name="camera" size={28} color="#FFFFFF" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    alignSelf: "center",
    width: Spacing.fabSize,
    height: Spacing.fabSize,
    borderRadius: Spacing.fabSize / 2,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
});
