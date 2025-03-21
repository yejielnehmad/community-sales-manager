
import { GOOGLE_API_KEY } from "@/lib/api-config";
import { MessageAnalysis } from "@/types";

export class GeminiError extends Error {
  status?: number;
  statusText?: string;
  apiResponse?: any;
  
  constructor(message: string, details?: { status?: number, statusText?: string, apiResponse?: any }) {
    super(message);
    this.name = "GeminiError";
    this.status = details?.status;
    this.statusText = details?.statusText;
    this.apiResponse = details?.apiResponse;
  }
}

/**
 * Función para realizar peticiones a la API de Google Gemini
 */
export const callGeminiAPI = async (prompt: string): Promise<string> => {
  if (!GOOGLE_API_KEY) {
    throw new GeminiError("API Key de Google Gemini no configurada");
  }

  try {
    console.log("Enviando petición a Gemini API:", prompt.substring(0, 100) + "...");
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.2,
            topP: 0.8,
            maxOutputTokens: 1024,
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error en respuesta HTTP:", response.status, response.statusText, errorText);
      throw new GeminiError(`Error HTTP: ${response.status} ${response.statusText}`, {
        status: response.status,
        statusText: response.statusText,
        apiResponse: errorText
      });
    }

    const data = await response.json();
    console.log("Respuesta de Gemini (resumida):", JSON.stringify(data).substring(0, 200) + "...");

    // Verificar si hay errores en la respuesta
    if (data.error) {
      console.error("Error devuelto por la API de Gemini:", data.error);
      throw new GeminiError(`Error de la API de Gemini: ${data.error.message || "Error desconocido"}`, {
        apiResponse: data.error
      });
    }

    // Extraer el texto generado del formato de respuesta de Gemini
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts) {
      console.error("Respuesta completa con formato incorrecto:", JSON.stringify(data, null, 2));
      throw new GeminiError("Formato de respuesta inesperado de la API de Gemini", {
        apiResponse: data
      });
    }

    const responseText = data.candidates[0].content.parts[0].text;
    console.log("Texto de respuesta:", responseText.substring(0, 200) + "...");
    
    return responseText;
  } catch (error) {
    if (error instanceof GeminiError) {
      throw error;
    }
    console.error("Error inesperado al llamar a Gemini API:", error);
    throw new GeminiError(`Error al conectar con Gemini API: ${(error as Error).message}`);
  }
};

/**
 * Función específica para analizar mensajes de clientes
 */
export const analyzeCustomerMessage = async (message: string): Promise<MessageAnalysis> => {
  // Creamos el prompt para el modelo
  const prompt = `
  Analiza este mensaje de un cliente y extrae la siguiente información:
  1. Nombre del cliente
  2. Lista de productos solicitados con cantidades y variantes si están mencionadas

  Mensaje del cliente: "${message}"

  Responde SOLAMENTE en formato JSON con esta estructura exacta (sin explicaciones adicionales):
  {
    "client": {
      "name": "Nombre del cliente"
    },
    "items": [
      {
        "product": "Nombre del producto",
        "quantity": número,
        "variant": "variante (si se menciona, de lo contrario omitir)"
      }
    ]
  }
  `;

  try {
    // Obtenemos la respuesta de la API
    const responseText = await callGeminiAPI(prompt);
    
    // Limpiamos el texto para asegurar que sea JSON válido
    let jsonText = responseText.trim();
    // Eliminar marcadores de código si están presentes
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.replace(/```json\n/, "").replace(/\n```$/, "");
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/```\n/, "").replace(/\n```$/, "");
    }

    try {
      const parsedResult = JSON.parse(jsonText) as MessageAnalysis;
      console.log("Datos analizados:", parsedResult);
      
      // Validación básica del resultado
      if (!parsedResult.client || !parsedResult.items || !Array.isArray(parsedResult.items)) {
        throw new GeminiError("El formato de los datos analizados no es válido", {
          apiResponse: jsonText
        });
      }
      
      return parsedResult;
    } catch (parseError: any) {
      console.error("Error al analizar JSON:", parseError, "Texto recibido:", jsonText);
      throw new GeminiError(`Error al procesar la respuesta JSON: ${parseError.message}`, {
        apiResponse: jsonText
      });
    }
  } catch (error) {
    if (error instanceof GeminiError) {
      throw error;
    }
    throw new GeminiError(`Error al analizar el mensaje: ${(error as Error).message}`);
  }
};
