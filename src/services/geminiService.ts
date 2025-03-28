
/**
 * Servicios de integración con AI para análisis de mensajes
 * v1.0.0
 */
import { MessageAnalysis } from "@/types";
import { 
  setAPIProvider, 
  setCurrentModel, 
  getCurrentAPIProvider, 
  getCurrentModel
} from "./apiProviders";
import { 
  analyzeCustomerMessage as analyzeMessage, 
  MessageAnalysisError as AIServiceError
} from "./messageAnalysisService";
import { chatWithAssistant } from "./chatService";

export { 
  setAPIProvider, 
  getCurrentAPIProvider,
  setCurrentModel,
  getCurrentModel,
  AIServiceError
};

// Re-exportamos la función de análisis de mensajes
export const analyzeCustomerMessage = analyzeMessage;

// Re-exportamos la función de chat con asistente
export { chatWithAssistant };
