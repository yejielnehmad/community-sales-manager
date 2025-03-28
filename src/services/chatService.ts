
/**
 * Servicio para el chat con asistente
 * v1.0.0
 */
import { logError } from "@/lib/debug-utils";
import { callAPI } from "./apiProviders";
import { MessageAnalysisError } from "./messageAnalysisService";

/**
 * Chat con asistente
 */
export const chatWithAssistant = async (
  message: string, 
  appContext: {
    clients?: any[];
    orders?: any[];
    products?: any[];
  }
): Promise<string> => {
  const contextStr = JSON.stringify(appContext, null, 2);
  
  const prompt = `
  Eres un asistente virtual integrado en una aplicación de gestión de ventas llamada VentasCom.
  Tu objetivo es ayudar al usuario respondiendo preguntas sobre los datos de la aplicación.
  
  Contexto actual de la aplicación (datos recientes):
  ${contextStr}
  
  Pregunta del usuario: "${message}"
  
  Responde de manera clara, concisa y útil. Si la pregunta está relacionada con datos que no tienes 
  disponibles en el contexto, indícalo amablemente y sugiere qué información podría consultar.
  Si la pregunta no tiene relación con la aplicación, puedes responder de manera general pero
  siempre orientada a ayudar en el contexto de una aplicación de gestión de ventas.
  `;

  try {
    const response = await callAPI(prompt);
    return response;
  } catch (error) {
    logError("Chat", "Error en chatWithAssistant:", error);
    if (error instanceof MessageAnalysisError) {
      throw error;
    }
    throw new MessageAnalysisError(`Error al procesar tu consulta: ${(error as Error).message}`);
  }
};
