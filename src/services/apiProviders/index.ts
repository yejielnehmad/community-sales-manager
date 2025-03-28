
/**
 * Proveedor de API Factory
 * v1.0.0
 */
import { BaseAPIProvider } from "./baseAPIProvider";
import { CohereProvider, cohereProvider } from "./cohereProvider";
import { GeminiProvider, geminiProvider } from "./geminiProvider";
import { logDebug } from "@/lib/debug-utils";

export type ApiProvider = "cohere" | "google-gemini";

// Proveedor actual por defecto
let currentProvider: ApiProvider = "google-gemini";

// Obtener una instancia del proveedor actual
export const getAPIProvider = (): BaseAPIProvider => {
  switch (currentProvider) {
    case "cohere":
      return cohereProvider;
    case "google-gemini":
      return geminiProvider;
    default:
      return geminiProvider; // Por defecto usamos Gemini
  }
};

// Cambiar el proveedor actual
export const setAPIProvider = (provider: ApiProvider): void => {
  currentProvider = provider;
  logDebug("API", `Proveedor de API establecido a: ${provider}`);
};

// Obtener el nombre del proveedor actual
export const getCurrentAPIProvider = (): ApiProvider => {
  return currentProvider;
};

// Establecer el modelo para el proveedor actual
export const setCurrentModel = (model: string): void => {
  getAPIProvider().setModel(model);
};

// Obtener el modelo actual del proveedor
export const getCurrentModel = (): string => {
  return getAPIProvider().getModel();
};

// Función principal para llamar a la API
export const callAPI = async (prompt: string): Promise<string> => {
  return getAPIProvider().call(prompt);
};

// Re-exportamos las clases para facilitar el uso
export { BaseAPIProvider, BaseAPIError } from "./baseAPIProvider";
export { CohereProvider } from "./cohereProvider";
export { GeminiProvider } from "./geminiProvider";

// Re-exportamos las instancias de los proveedores
export { cohereProvider, geminiProvider };
