
/**
 * Implementación del proveedor para Google Gemini
 * v1.0.3
 */
import { BaseAPIProvider, BaseAPIError } from "./baseAPIProvider";
import { GOOGLE_GEMINI_ENDPOINT, GOOGLE_API_KEY, GEMINI_MAX_INPUT_TOKENS, GEMINI_MAX_OUTPUT_TOKENS } from "@/lib/api-config";
import { logDebug, logError } from "@/lib/debug-utils";

export class GeminiProvider extends BaseAPIProvider {
  private model: string = "gemini-2.0-flash";
  private tempCache: Map<string, string> = new Map();

  constructor() {
    super("Google Gemini");
  }

  /**
   * Establece el modelo a usar
   */
  setModel(model: string): void {
    this.model = model;
    logDebug("GEMINI-API", `Modelo establecido a: ${model}`);
  }

  /**
   * Obtiene el modelo actual
   */
  getModel(): string {
    return this.model;
  }

  /**
   * Llama a la API de Google Gemini
   */
  async call(prompt: string): Promise<string> {
    try {
      // Verificar si ya tenemos una respuesta en caché para este prompt
      const cacheKey = `${this.model}:${prompt.substring(0, 100)}`;
      if (this.tempCache.has(cacheKey)) {
        logDebug("GEMINI-API", "Usando respuesta en caché");
        return this.tempCache.get(cacheKey) || "";
      }
      
      const url = `${GOOGLE_GEMINI_ENDPOINT}/${this.model}:generateContent?key=${GOOGLE_API_KEY}`;
      
      // Formato correcto para la API de Gemini 2.0
      const requestBody = {
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: GEMINI_MAX_OUTPUT_TOKENS,
          topP: 0.9,
          topK: 40
        }
      };
      
      logDebug("GEMINI-API", `Enviando solicitud a Gemini (${this.model})`, { 
        promptLength: prompt.length, 
        modelName: this.model,
      });
      
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        const status = response.status;
        const statusText = response.statusText;
        
        let errorMessage = `Error ${status}: ${statusText || 'Error desconocido'}`;
        if (errorData.error) {
          errorMessage += `. ${errorData.error.message || ''}`;
        }
        
        logError("GEMINI-API", `Error en respuesta: ${status} ${statusText}`, errorData);
        
        // Mensajes de error más específicos basados en el código de error
        if (status === 400) {
          errorMessage = `Error 400: Solicitud incorrecta. Posible problema con el formato o longitud del mensaje.`;
        } else if (status === 401) {
          errorMessage = `Error 401: Clave de API no válida o expirada.`;
        } else if (status === 429) {
          errorMessage = `Error 429: Límite de solicitudes excedido. Por favor, intenta más tarde.`;
        } else if (status === 500) {
          errorMessage = `Error 500: Error interno del servidor de Google Gemini. Por favor, intenta más tarde.`;
        }
        
        throw new BaseAPIError(errorMessage, { status, statusText, apiResponse: errorData });
      }
      
      const data = await response.json();
      
      if (!data.candidates || data.candidates.length === 0) {
        throw new BaseAPIError("No se pudo generar contenido", { apiResponse: data });
      }
      
      // Verificar si hay bloqueo de contenido
      if (data.candidates[0].finishReason === "SAFETY") {
        throw new BaseAPIError("El contenido ha sido bloqueado por políticas de seguridad", { apiResponse: data });
      }
      
      // Extraer el texto de la respuesta
      const content = data.candidates[0].content;
      if (!content || !content.parts || content.parts.length === 0) {
        throw new BaseAPIError("Formato de respuesta inesperado", { apiResponse: data });
      }
      
      const result = content.parts[0].text || "";
      
      // Guardar en caché temporal (solo para esta sesión)
      this.tempCache.set(cacheKey, result);
      if (this.tempCache.size > 50) {
        // Mantener la caché en un tamaño razonable
        const oldestKey = this.tempCache.keys().next().value;
        this.tempCache.delete(oldestKey);
      }
      
      logDebug("GEMINI-API", "Respuesta recibida correctamente", { 
        responseLength: result.length
      });
      
      return result;
    } catch (error) {
      logError("GEMINI-API", "Error al llamar a la API de Gemini", error);
      if (error instanceof BaseAPIError) {
        throw error;
      }
      throw new BaseAPIError(`Error al llamar a la API de Gemini: ${(error as Error).message}`);
    }
  }
}

// Exportar una instancia singleton del proveedor de Gemini
export const geminiProvider = new GeminiProvider();
