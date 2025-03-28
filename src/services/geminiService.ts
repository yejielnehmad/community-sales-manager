
/**
 * Servicios de integración con AI para análisis de mensajes
 * v1.0.1
 */
import { MessageAnalysis } from "@/types";
import { 
  setAPIProvider, 
  setCurrentModel, 
  getCurrentAPIProvider, 
  getCurrentModel,
  ApiProvider as InternalApiProvider,
  callAPI
} from "./apiProviders";
import { 
  analyzeCustomerMessage as analyzeMessage, 
  MessageAnalysisError,
  DEFAULT_ANALYSIS_PROMPT,
  getCurrentAnalysisPrompt,
  setCustomAnalysisPrompt,
  resetAnalysisPrompt
} from "./messageAnalysisService";
import { chatWithAssistant } from "./chatService";

// Re-exportamos interfaces y tipos
export type ApiProvider = InternalApiProvider;
export { MessageAnalysisError as GeminiError };

// Re-exportamos funciones de configuración de API
export { 
  setAPIProvider, 
  getCurrentAPIProvider,
  setCurrentModel,
  getCurrentModel
};

// Aliases para compatibilidad con nombres anteriores
export const setApiProvider = setAPIProvider;
export const getCurrentApiProvider = getCurrentAPIProvider;
export const setGeminiModel = setCurrentModel;
export const getCurrentGeminiModel = getCurrentModel;

// Re-exportamos la función para llamadas directas a la API
export const callGeminiAPI = callAPI;

// Re-exportamos la función de análisis de mensajes
export const analyzeCustomerMessage = analyzeMessage;

// Re-exportamos la función de chat con asistente
export { chatWithAssistant };

// Re-exportamos funciones para gestión de prompts
export {
  DEFAULT_ANALYSIS_PROMPT,
  getCurrentAnalysisPrompt,
  setCustomAnalysisPrompt,
  resetAnalysisPrompt
};
