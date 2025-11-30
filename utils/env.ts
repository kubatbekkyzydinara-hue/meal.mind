// Environment variable helper
export function getEnvVar(key: string): string | null {
  try {
    const value = (global as any).__ENV__?.[key];
    if (value) return value;
    
    // For Expo, try accessing via process.env
    const processValue = (process.env as any)[key];
    if (processValue) return processValue;
    
    return null;
  } catch (error) {
    return null;
  }
}

export const ENV = {
  GOOGLE_API_KEY: getEnvVar("GOOGLE_API_KEY") || "",
  EDAMAM_APP_ID: getEnvVar("EDAMAM_APP_ID") || "",
  EDAMAM_API_KEY: getEnvVar("EDAMAM_API_KEY") || "",
  EDAMAM_RECIPE_APP_ID: getEnvVar("EDAMAM_RECIPE_APP_ID") || "",
  EDAMAM_RECIPE_API_KEY: getEnvVar("EDAMAM_RECIPE_API_KEY") || "",
  GROQ_API_KEY: getEnvVar("GROQ_API_KEY") || "",
};
