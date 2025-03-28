
/**
 * Proveedor de API para Google Gemini
 * v1.0.0
 */
import { GOOGLE_API_KEY, GOOGLE_GEMINI_ENDPOINT, GOOGLE_GEMINI_MODELS } from "@/lib/api-config";
import { BaseAPIProvider, BaseAPIError } from "./baseAPIProvider";

export class GeminiProvider extends BaseAPIProvider {
  private model: string = GOOGLE_GEMINI_MODELS.GEMINI_FLASH_2;

  constructor() {
    super("GEMINI-API");
  }

  public setModel(model: string): void {
    if (Object.values(GOOGLE_GEMINI_MODELS).includes(model as any)) {
      this.model = model;
      this.debug(`Modelo establecido a: ${model}`);
    } else {
      this.logError(`Modelo de Google Gemini no válido: ${model}`);
    }
  }

  public getModel(): string {
    return this.model;
  }

  public async call(prompt: string): Promise<string> {
    if (!GOOGLE_API_KEY) {
      this.logError("API Key de Google Gemini no configurada");
      throw new BaseAPIError("API Key de Google Gemini no configurada");
    }

    try {
      // Construir el endpoint completo con el modelo seleccionado
      const endpoint = `${GOOGLE_GEMINI_ENDPOINT}/${this.model}:generateContent?key=${GOOGLE_API_KEY}`;
      
      this.debug(`Enviando petición a Google Gemini API: ${prompt.substring(0, 100)}...`);
      this.debug(`Usando modelo: ${this.model}`);
      
      // Solo mostramos la parte inicial de la API key si tiene suficiente longitud
      if (GOOGLE_API_KEY && GOOGLE_API_KEY.length > 10) {
        this.debug(`API Key (primeros 10 caracteres): ${GOOGLE_API_KEY.substring(0, 10)}...`);
      } else {
        this.debug("API Key presente pero es demasiado corta para mostrar");
      }
      
      const response = await fetch(
        endpoint,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt
                  }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 4096
            }
          }),
        }
      );

      const responseText = await response.text();
      this.debug(`Respuesta raw de Google Gemini: ${responseText.substring(0, 200)}...`);
      
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
        this.logError(`Error al parsear respuesta de Google Gemini:`, parseError);
        throw new BaseAPIError(`Error al parsear respuesta: ${(parseError as Error).message}`, {
          apiResponse: parseError,
          rawJsonResponse: responseText
        });
      }

      this.debug(`Respuesta de Google Gemini (resumida): ${JSON.stringify(data).substring(0, 200)}...`);

      if (data.error) {
        this.logError(`Error devuelto por la API de Google Gemini:`, data.error);
        throw new BaseAPIError(`Error de la API de Google Gemini: ${data.error.message || "Error desconocido"}`, {
          apiResponse: data.error,
          rawJsonResponse: responseText
        });
      }

      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0].text) {
        this.logError(`Respuesta completa con formato incorrecto:`, data);
        throw new BaseAPIError("Formato de respuesta inesperado de la API de Google Gemini", {
          apiResponse: data,
          rawJsonResponse: responseText
        });
      }

      const resultText = data.candidates[0].content.parts[0].text;
      this.debug(`Texto de respuesta: ${resultText.substring(0, 200)}...`);
      
      return resultText;
    } catch (error) {
      if (error instanceof BaseAPIError) {
        throw error;
      }
      this.logError(`Error inesperado al llamar a Google Gemini API:`, error);
      throw new BaseAPIError(`Error al conectar con Google Gemini API: ${(error as Error).message}`);
    }
  }
}

// Exportamos una instancia única del proveedor
export const geminiProvider = new GeminiProvider();
