
// Configuración de API keys
export const COHERE_API_KEY: string = "qHoiIqX3O9IkPVpG9dCZNomZBLz92mqsiKw2UjNc"; // Clave API de Cohere

// Mantenemos la clave anterior por compatibilidad - pero ya no se usa
export const OPENROUTER_API_KEY: string = "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";
export const GOOGLE_API_KEY: string = "AIzaSyCLJUKv3dD-5IY5Y-bAFyTJ5v-kQTLe8K8"; // Clave API de Google Gemini

// Configuración de endpoints
export const COHERE_ENDPOINT: string = "https://api.cohere.ai/v1/chat";
export const OPENROUTER_ENDPOINT: string = "https://openrouter.ai/api/v1/chat/completions";
export const GOOGLE_GEMINI_ENDPOINT: string = "https://generativelanguage.googleapis.com/v1beta/models";

// Modelos de Google Gemini disponibles
export const GOOGLE_GEMINI_MODELS = {
  GEMINI_PRO: "gemini-pro",
  GEMINI_PRO_VISION: "gemini-pro-vision",
  GEMINI_FLASH: "gemini-1.5-flash",
  GEMINI_FLASH_2: "gemini-1.5-flash-02",
  GEMINI_PRO_LATEST: "gemini-1.5-pro-latest"
};

// Fecha de la última actualización de la API
export const API_CONFIG_UPDATED: string = "2025-03-30";
