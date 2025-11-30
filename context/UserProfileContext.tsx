import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { UserProfile, DietPreference, Allergen, Cuisine } from "@/types";
import { generateId } from "@/utils/helpers";

const USER_PROFILE_STORAGE = "@mealmind/user_profile";

interface UserProfileContextType {
  profile: UserProfile | null;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  setProfile: (profile: UserProfile) => Promise<void>;
  loading: boolean;
  isOnboardingComplete: boolean;
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

export function UserProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const stored = await AsyncStorage.getItem(USER_PROFILE_STORAGE);
      if (stored) {
        const parsed = JSON.parse(stored);
        setProfileState(parsed);
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const setProfile = async (newProfile: UserProfile) => {
    try {
      await AsyncStorage.setItem(USER_PROFILE_STORAGE, JSON.stringify(newProfile));
      setProfileState(newProfile);
    } catch (error) {
      console.error("Error saving profile:", error);
      throw error;
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    try {
      const current = profile || {
        id: generateId(),
        name: "",
        avatar: "chef1" as const,
        city: "Бишкек",
        dietPreferences: [],
        allergies: [],
        favoriteCuisines: [],
        deliveryService: "glovo" as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const updated: UserProfile = {
        ...current,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      await setProfile(updated);
    } catch (error) {
      console.error("Error updating profile:", error);
      throw error;
    }
  };

  return (
    <UserProfileContext.Provider
      value={{
        profile,
        setProfile,
        updateProfile,
        loading,
        isOnboardingComplete: !!profile?.name,
      }}
    >
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile() {
  const context = useContext(UserProfileContext);
  if (context === undefined) {
    throw new Error("useUserProfile must be used within a UserProfileProvider");
  }
  return context;
}
