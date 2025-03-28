
/**
 * Servicios de integración con AI para análisis de mensajes
 * v1.0.4
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
export const analyzeCustomerMessage = async (
  message: string,
  onProgress?: (progress: number, stage?: string) => void,
  signal?: AbortSignal
): Promise<{result: MessageAnalysis[], phase1Response?: string, phase2Response?: string, phase3Response?: string, elapsedTime?: number}> => {
  const startTime = performance.now();
  
  try {
    onProgress?.(10, "Iniciando análisis...");
    
    if (signal?.aborted) {
      throw new Error("Análisis cancelado por el usuario");
    }
    
    // Realizar análisis directo sin considerar pedidos anteriores
    const analysisResult = await analyzeMessage(message, onProgress);
    
    const endTime = performance.now();
    const elapsedTime = endTime - startTime;
    
    return {
      ...analysisResult,
      elapsedTime
    };
    
  } catch (error) {
    if (signal?.aborted) {
      const abortError = new Error("Análisis cancelado por el usuario");
      abortError.name = "AbortError";
      throw abortError;
    }
    throw error;
  }
};

// Re-exportamos la función de chat con asistente
export { chatWithAssistant };

// Re-exportamos funciones para gestión de prompts
export {
  DEFAULT_ANALYSIS_PROMPT,
  getCurrentAnalysisPrompt,
  setCustomAnalysisPrompt,
  resetAnalysisPrompt
};
