
/**
 * Servicios de integración con AI para análisis de mensajes
 * v1.0.8
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

// Función para limpiar completamente todo el estado y caché relacionados con análisis
export const purgeAllAnalysisData = () => {
  console.log("Purgando completamente todos los datos de análisis");
  
  // Limpiar el caché de análisis
  clearAnalysisCache();
  
  // Limpiar localStorage
  const localStorageKeysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (
      key.startsWith('magicOrder_') || 
      key.includes('analysis') || 
      key.includes('rawJson') || 
      key.includes('phase') ||
      key.includes('orders') ||
      key.includes('magic_orders') ||
      key.includes('lastMessage')
    )) {
      localStorageKeysToRemove.push(key);
    }
  }
  
  // Limpiar sessionStorage
  const sessionStorageKeysToRemove = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && (
      key.startsWith('magicOrder_') || 
      key.includes('analysis') || 
      key.includes('orders') ||
      key.includes('magic_orders') ||
      key.includes('lastMessage') ||
      key.includes('phase')
    )) {
      sessionStorageKeysToRemove.push(key);
    }
  }
  
  // Eliminar todas las claves identificadas
  localStorageKeysToRemove.forEach(key => {
    console.log(`Eliminando de localStorage: ${key}`);
    localStorage.removeItem(key);
  });
  
  sessionStorageKeysToRemove.forEach(key => {
    console.log(`Eliminando de sessionStorage: ${key}`);
    sessionStorage.removeItem(key);
  });
  
  console.log(`Purga completa. Eliminadas ${localStorageKeysToRemove.length} claves de localStorage y ${sessionStorageKeysToRemove.length} de sessionStorage`);
  
  // Comunicar a toda la aplicación que se ha reiniciado el estado
  window.dispatchEvent(new CustomEvent('analysisStateReset', {
    detail: { timestamp: new Date().toISOString() }
  }));
  
  return {
    localStorageKeysRemoved: localStorageKeysToRemove.length,
    sessionStorageKeysRemoved: sessionStorageKeysToRemove.length
  };
};

// Re-exportamos la función de análisis de mensajes
export const analyzeCustomerMessage = async (
  message: string,
  onProgress?: (progress: number, stage?: string) => void,
  signal?: AbortSignal
): Promise<{result: MessageAnalysis[], phase1Response?: string, phase2Response?: string, phase3Response?: string, elapsedTime?: number}> => {
  const startTime = performance.now();
  
  try {
    onProgress?.(5, "Limpiando datos anteriores...");
    
    // Limpiar completamente todos los datos anteriores
    purgeAllAnalysisData();
    
    if (signal?.aborted) {
      throw new Error("Análisis cancelado por el usuario");
    }
    
    onProgress?.(10, "Iniciando análisis...");
    
    // Realizar análisis directo sin considerar pedidos anteriores
    const analysisResult = await analyzeMessage(message, 
      (progress, stage) => {
        // Ajustamos el progreso para que vaya del 10% al 95%
        const adjustedProgress = 10 + (progress * 0.85);
        onProgress?.(adjustedProgress, stage);
      }, 
      signal
    );
    
    // Verificar nuevamente si se abortó
    if (signal?.aborted) {
      throw new Error("Análisis cancelado por el usuario");
    }
    
    // Guardar resultado actual en sessionStorage (solo para debugging)
    try {
      sessionStorage.setItem('magicOrder_currentAnalysisTimestamp', new Date().toISOString());
      sessionStorage.setItem('magicOrder_currentAnalysisResultCount', String(analysisResult.result.length));
    } catch (e) {
      console.warn("Error al guardar metadatos de análisis en sessionStorage", e);
    }
    
    onProgress?.(98, "Completando análisis...");
    
    const endTime = performance.now();
    const elapsedTime = endTime - startTime;
    
    onProgress?.(100, "¡Análisis completado!");
    
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
