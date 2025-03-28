
/**
 * Proveedor de API para Cohere
 * v1.0.0
 */
import { COHERE_API_KEY, COHERE_ENDPOINT } from "@/lib/api-config";
import { BaseAPIProvider, BaseAPIError } from "./baseAPIProvider";

export class CohereProvider extends BaseAPIProvider {
  private model: string = "command-r-plus";

  constructor() {
    super("COHERE-API");
  }

  public setModel(model: string): void {
    this.model = model;
    this.debug(`Modelo establecido a: ${model}`);
  }

  public getModel(): string {
    return this.model;
  }

  public async call(prompt: string): Promise<string> {
    if (!COHERE_API_KEY) {
      this.logError("API Key de Cohere no configurada");
      throw new BaseAPIError("API Key de Cohere no configurada");
    }

    try {
      // Usar endpoint desde la configuración
      const endpoint = COHERE_ENDPOINT || "https://api.cohere.ai/v1/chat";
      
      this.debug(`Enviando petición a Cohere API: ${prompt.substring(0, 100)}...`);
      this.debug(`Usando endpoint: ${endpoint}`);
      
      // Solo mostramos la parte inicial de la API key si tiene suficiente longitud
      if (COHERE_API_KEY && COHERE_API_KEY.length > 10) {
        this.debug(`API Key (primeros 10 caracteres): ${COHERE_API_KEY.substring(0, 10)}...`);
      } else {
        this.debug("API Key presente pero es demasiado corta para mostrar");
      }
      
      const response = await fetch(
        endpoint,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${COHERE_API_KEY}`,
          },
          body: JSON.stringify({
            model: this.model,
            message: prompt,
            temperature: 0.2,
            max_tokens: 4096,
            chat_history: []
          }),
        }
      );

      const responseText = await response.text();
      this.debug(`Respuesta raw de Cohere: ${responseText.substring(0, 200)}...`);
      
      if (!response.ok) {
        this.logError(`Error en respuesta HTTP: ${response.status} ${response.statusText}`, responseText);
        throw new BaseAPIError(`Error HTTP: ${response.status} ${response.statusText}`, {
          status: response.status,
          statusText: response.statusText,
          apiResponse: responseText,
          rawJsonResponse: responseText
        });
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        this.logError(`Error al parsear respuesta de Cohere:`, parseError);
        throw new BaseAPIError(`Error al parsear respuesta: ${(parseError as Error).message}`, {
          apiResponse: parseError,
          rawJsonResponse: responseText
        });
      }

      this.debug(`Respuesta de Cohere (resumida): ${JSON.stringify(data).substring(0, 200)}...`);

      if (data.error) {
        this.logError(`Error devuelto por la API de Cohere:`, data.error);
        throw new BaseAPIError(`Error de la API de Cohere: ${data.error.message || "Error desconocido"}`, {
          apiResponse: data.error,
          rawJsonResponse: responseText
        });
      }

      if (!data.text) {
        this.logError(`Respuesta completa con formato incorrecto:`, data);
        throw new BaseAPIError("Formato de respuesta inesperado de la API de Cohere", {
          apiResponse: data,
          rawJsonResponse: responseText
        });
      }

      const resultText = data.text;
      this.debug(`Texto de respuesta: ${resultText.substring(0, 200)}...`);
      
      return resultText;
    } catch (error) {
      if (error instanceof BaseAPIError) {
        throw error;
      }
      this.logError(`Error inesperado al llamar a Cohere API:`, error);
      throw new BaseAPIError(`Error al conectar con Cohere API: ${(error as Error).message}`);
    }
  }
}

// Exportamos una instancia única del proveedor
export const cohereProvider = new CohereProvider();
