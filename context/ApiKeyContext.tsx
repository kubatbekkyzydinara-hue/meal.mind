import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

const API_KEY_STORAGE = "@mealmind/gemini_api_key";

const getBuiltInApiKey = (): string => {
  if (typeof process !== "undefined" && process.env?.EXPO_PUBLIC_GOOGLE_API_KEY) {
    return process.env.EXPO_PUBLIC_GOOGLE_API_KEY;
  }
  
  const extraKey = Constants.expoConfig?.extra?.googleApiKey;
  if (extraKey && typeof extraKey === "string" && extraKey.length > 10) {
    return extraKey;
  }
  
  return "";
};

const BUILT_IN_API_KEY = getBuiltInApiKey();

interface ApiKeyContextType {
  apiKey: string;
  setApiKey: (key: string) => Promise<void>;
  isConfigured: boolean;
  loading: boolean;
  isBuiltIn: boolean;
}

const ApiKeyContext = createContext<ApiKeyContextType | undefined>(undefined);

export function ApiKeyProvider({ children }: { children: ReactNode }) {
  const [apiKey, setApiKeyState] = useState(BUILT_IN_API_KEY);
  const [loading, setLoading] = useState(true);
  const [isBuiltIn, setIsBuiltIn] = useState(BUILT_IN_API_KEY.length > 0);

  useEffect(() => {
    loadApiKey();
  }, []);

  const loadApiKey = async () => {
    try {
      const stored = await AsyncStorage.getItem(API_KEY_STORAGE);
      if (stored && stored.length > 10) {
        setApiKeyState(stored);
        setIsBuiltIn(false);
      } else if (BUILT_IN_API_KEY) {
        setApiKeyState(BUILT_IN_API_KEY);
        setIsBuiltIn(true);
      }
    } catch (error) {
      console.error("Error loading API key:", error);
      if (BUILT_IN_API_KEY) {
        setApiKeyState(BUILT_IN_API_KEY);
        setIsBuiltIn(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const setApiKey = async (key: string) => {
    if (!key || key.trim().length < 10) {
      throw new Error("Invalid API key");
    }
    
    try {
      await AsyncStorage.setItem(API_KEY_STORAGE, key.trim());
      setApiKeyState(key.trim());
      setIsBuiltIn(false);
    } catch (error) {
      console.error("Error saving API key:", error);
      throw error;
    }
  };

  return (
    <ApiKeyContext.Provider
      value={{
        apiKey,
        setApiKey,
        isConfigured: apiKey.length > 10,
        loading,
        isBuiltIn,
      }}
    >
      {children}
    </ApiKeyContext.Provider>
  );
}

export function useApiKey() {
  const context = useContext(ApiKeyContext);
  if (context === undefined) {
    throw new Error("useApiKey must be used within an ApiKeyProvider");
  }
  return context;
}
