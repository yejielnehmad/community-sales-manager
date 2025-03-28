
/**
 * Utilidades para procesar JSON
 * v1.0.0
 */
import { logError } from "@/lib/debug-utils";

/**
 * Extrae un JSON válido de una respuesta que puede contener texto adicional
 */
export const extractJsonFromResponse = (text: string): string => {
  let jsonText = text.trim();
  
  if (jsonText.includes("```")) {
    const match = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
      jsonText = match[1].trim();
    } else {
      jsonText = jsonText.replace(/```(?:json)?|```/g, "").trim();
    }
  }
  
  jsonText = jsonText
    .replace(/[\u2018\u2019]/g, "'") // Reemplazar comillas simples curvas
    .replace(/[\u201C\u201D]/g, '"') // Reemplazar comillas dobles curvas
    .replace(/\n+/g, ' ') // Eliminar saltos de línea
    .trim();
  
  if (!jsonText.startsWith('[') || !jsonText.endsWith(']')) {
    const arrayMatch = jsonText.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (arrayMatch) {
      jsonText = arrayMatch[0];
    }
  }
  
  return jsonText;
};

/**
 * Intenta parsear un texto como JSON
 */
export const tryParseJson = <T>(text: string): { success: boolean, data?: T, error?: Error } => {
  try {
    const parsed = JSON.parse(text) as T;
    return { success: true, data: parsed };
  } catch (error) {
    logError("JSON", "Error al parsear JSON:", error);
    return { success: false, error: error as Error };
  }
};
