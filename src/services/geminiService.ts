
/**
 * Servicios de integración con AI para análisis de mensajes
 * v1.0.7
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
  resetAnalysisPrompt,
  clearAnalysisCache
} from "./messageAnalysisService";
import { chatWithAssistant } from "./chatService";

// Re-exportamos interfaces y tipos
export type ApiProvider = InternalApiProvider;

// Clase extendida con propiedades adicionales
export class GeminiError extends MessageAnalysisError {
  public status?: number;
  public apiResponse?: any;
  
  constructor(message: string, options?: { 
    rawJsonResponse?: string, 
    phase1Response?: string,
    status?: number,
    apiResponse?: any
  }) {
    super(message, {
      rawJsonResponse: options?.rawJsonResponse,
      phase1Response: options?.phase1Response
    });
    this.name = "GeminiError";
    this.status = options?.status;
    this.apiResponse = options?.apiResponse;
  }
}

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
    
    // Limpiar completamente todos los datos anteriores
    clearAnalysisCache();
    
    // Eliminar cualquier dato persistente en localStorage relacionado con análisis
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.startsWith('magicOrder_phase') || 
        key.includes('analysis') || 
        key.includes('rawJson') || 
        key === 'magicOrder_orders'
      )) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // También limpiar sessionStorage
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && (
        key.startsWith('magicOrder_') || 
        key.includes('analysis') || 
        key.includes('order')
      )) {
        sessionStorage.removeItem(key);
      }
    }
    
    if (signal?.aborted) {
      throw new Error("Análisis cancelado por el usuario");
    }
    
    // Realizar análisis directo sin considerar pedidos anteriores
    const analysisResult = await analyzeMessage(message, onProgress, signal);
    
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
    
    // Si el error no es de nuestro tipo, lo convertimos
    if (!(error instanceof MessageAnalysisError)) {
      throw new GeminiError(`Error en análisis: ${(error as Error).message}`);
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
  resetAnalysisPrompt,
  clearAnalysisCache
};
