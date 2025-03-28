
/**
 * Implementación del proveedor para Google Gemini
 * v1.0.4
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
      
      // Verificar que tenemos una API key
      if (!GOOGLE_API_KEY || GOOGLE_API_KEY.trim() === '') {
        throw new BaseAPIError("No se ha configurado la clave de API de Google Gemini. Por favor, establece la variable GOOGLE_API_KEY.", {
          tipo: "error_configuracion"
        });
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
      
      // Hacer la solicitud a la API
      let response;
      try {
        response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(requestBody)
        });
      } catch (networkError: any) {
        // Error de red (sin conexión, timeout, etc.)
        throw new BaseAPIError(
          `Error de conexión con la API de Google Gemini: ${networkError.message || 'Error de red desconocido'}. Comprueba tu conexión a Internet e inténtalo de nuevo.`, 
          { networkError, tipo: "error_conexion" }
        );
      }
      
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
          let detalleError = "Solicitud incorrecta.";
          
          // Verificar si es un problema de token
          if (errorData.error && errorData.error.message && 
             (errorData.error.message.includes("too long") || 
              errorData.error.message.includes("token") || 
              errorData.error.message.includes("size"))) {
            detalleError = "El mensaje es demasiado largo para ser procesado. Intenta con un mensaje más corto.";
          } else {
            detalleError = "Posible problema con el formato o contenido del mensaje.";
          }
          
          errorMessage = `Error 400: ${detalleError}`;
        } else if (status === 401) {
          errorMessage = `Error 401: Clave de API no válida o expirada. Por favor, verifica la configuración.`;
        } else if (status === 403) {
          errorMessage = `Error 403: No tienes permiso para usar esta API o has excedido la cuota. Verifica los permisos de tu proyecto en Google AI Studio.`;
        } else if (status === 429) {
          errorMessage = `Error 429: Límite de solicitudes excedido. Por favor, intenta más tarde o verifica los límites de tu plan.`;
        } else if (status === 500) {
          errorMessage = `Error 500: Error interno del servidor de Google Gemini. Este es un problema temporal, por favor intenta más tarde.`;
        } else if (status === 503) {
          errorMessage = `Error 503: Servicio de Google Gemini no disponible temporalmente. Por favor intenta más tarde.`;
        }
        
        throw new BaseAPIError(errorMessage, { 
          status, 
          statusText, 
          apiResponse: errorData,
          tipo: `error_${status}`
        });
      }
      
      const data = await response.json();
      
      if (!data.candidates || data.candidates.length === 0) {
        throw new BaseAPIError("No se pudo generar contenido. La API no devolvió candidatos.", { 
          apiResponse: data, 
          tipo: "error_sin_candidatos" 
        });
      }
      
      // Verificar si hay bloqueo de contenido
      if (data.candidates[0].finishReason === "SAFETY") {
        throw new BaseAPIError(
          "El contenido ha sido bloqueado por políticas de seguridad de Google Gemini. Por favor, verifica que tu solicitud no contenga contenido inapropiado.", 
          { apiResponse: data, tipo: "error_seguridad" }
        );
      }
      
      // Verificar si hay errores por límite de tokens
      if (data.candidates[0].finishReason === "MAX_TOKENS") {
        logDebug("GEMINI-API", "La respuesta alcanzó el límite máximo de tokens", { 
          maxTokens: GEMINI_MAX_OUTPUT_TOKENS 
        });
      }
      
      // Extraer el texto de la respuesta
      const content = data.candidates[0].content;
      if (!content || !content.parts || content.parts.length === 0) {
        throw new BaseAPIError(
          "Formato de respuesta inesperado de la API de Google Gemini. No se encontró contenido en la respuesta.", 
          { apiResponse: data, tipo: "error_formato" }
        );
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
