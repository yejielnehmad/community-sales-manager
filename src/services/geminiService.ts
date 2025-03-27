import { COHERE_API_KEY, COHERE_ENDPOINT } from "@/lib/api-config";
import { logDebug, logError } from "@/lib/debug-utils";
import { MessageAnalysis } from "@/types";

/** 
 * Variable para controlar si se usa el análisis en dos o tres fases
 * El modo optimizado intenta primero con una sola fase, y si falla, 
 * utiliza las tres fases completas
 */
let useTwoPhasesAnalysis = false;
let useOptimizedAnalysis = true;

/**
 * Establece el modo de análisis (dos o tres fases)
 */
export const setUseTwoPhasesAnalysis = (value: boolean) => {
  useTwoPhasesAnalysis = value;
};

/**
 * Obtiene el estado actual del modo de análisis
 */
export const getUseTwoPhasesAnalysis = () => {
  return useTwoPhasesAnalysis;
};

/**
 * Establece el modo de análisis optimizado
 */
export const setUseOptimizedAnalysis = (value: boolean) => {
  useOptimizedAnalysis = value;
};

/**
 * Obtiene el estado actual del modo de análisis optimizado
 */
export const getUseOptimizedAnalysis = () => {
  return useOptimizedAnalysis;
};

export class GeminiError extends Error {
  status?: number;
  apiResponse?: any;
  phase1Response?: string | null;
  rawJsonResponse?: string | null;
  phase3Response?: string | null;

  constructor(
    message: string,
    status?: number,
    apiResponse?: any,
    phase1Response?: string | null,
    rawJsonResponse?: string | null,
    phase3Response?: string | null
  ) {
    super(message);
    this.name = "GeminiError";
    this.status = status;
    this.apiResponse = apiResponse;
    this.phase1Response = phase1Response;
    this.rawJsonResponse = rawJsonResponse;
    this.phase3Response = phase3Response
  }
}

/**
 * Valida la estructura del análisis del mensaje
 * @param analysis Análisis a validar
 */
const validateMessageAnalysis = (analysis: any) => {
  if (!Array.isArray(analysis)) {
    throw new Error("El resultado no es un array");
  }

  analysis.forEach((item, index) => {
    if (typeof item !== 'object' || item === null) {
      throw new Error(`El elemento ${index} no es un objeto`);
    }

    if (!item.client || typeof item.client !== 'object') {
      throw new Error(`Cliente inválido en el elemento ${index}`);
    }

    if (!item.items || !Array.isArray(item.items)) {
      throw new Error(`Items inválidos en el elemento ${index}`);
    }
  });
};

/**
 * Analiza el mensaje en la fase 1
 * @param message Mensaje a analizar
 * @returns Respuesta de la API
 */
const analyzePhase1 = async (message: string): Promise<string> => {
  const prompt = `
Analiza este mensaje de un cliente e identifica:
1. El nombre del cliente (si está presente)
2. Los productos que desea comprar y la cantidad de cada uno

Mensaje del cliente:
"${message}"

Responde con un texto claro y conciso.
`;

  const response = await fetch(
    COHERE_ENDPOINT,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${COHERE_API_KEY}`
      },
      body: JSON.stringify({
        model: "command-r-plus",
        message: prompt,
        temperature: 0.3,
        p: 0.7,
        chat_history: []
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Error en respuesta:", errorText);
    throw new Error(`Error HTTP ${response.status}: ${errorText}`);
  }

  const data = await response.json();

  if (!data.text) {
    throw new Error("Respuesta vacía del servicio Cohere");
  }

  return data.text;
};

/**
 * Analiza el mensaje en la fase 2
 * @param phase1Response Respuesta de la fase 1
 * @returns Respuesta de la API
 */
const analyzePhase2 = async (phase1Response: string): Promise<string> => {
  const prompt = `
Convierte este análisis de un mensaje de cliente en un array JSON:
[
  {
    "client": {
      "id": null,
      "name": "nombre identificado",
      "phone": "teléfono si está disponible o null",
      "matchConfidence": "alto/medio/bajo"
    },
    "items": [
      {
        "product": {
          "id": null,
          "name": "nombre del producto identificado"
        },
        "variant": {
          "id": null,
          "name": "variante si se identificó o null"
        },
        "quantity": número,
        "notes": "observaciones adicionales o null",
        "status": "confirmado/duda"
      }
    ]
  }
]

Si identificas varios clientes en el mismo mensaje, crea un objeto por cada cliente.
Usa el campo "status": "duda" si hay ambigüedad sobre algún producto o cantidad.
Usa "matchConfidence" como "bajo" si el nombre del cliente es poco claro.

Análisis del mensaje:
"${phase1Response}"

Responde SOLO con un array JSON válido (sin explicaciones).
`;

  const response = await fetch(
    COHERE_ENDPOINT,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${COHERE_API_KEY}`
      },
      body: JSON.stringify({
        model: "command-r-plus",
        message: prompt,
        temperature: 0.2,
        p: 0.7,
        chat_history: []
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Error en respuesta:", errorText);
    throw new Error(`Error HTTP ${response.status}: ${errorText}`);
  }

  const data = await response.json();

  if (!data.text) {
    throw new Error("Respuesta vacía del servicio Cohere");
  }

  return data.text;
};

/**
 * Analiza el mensaje en la fase 3
 * @param phase2Response Respuesta de la fase 2
 * @returns Respuesta de la API
 */
const analyzePhase3 = async (phase2Response: string): Promise<string> => {
  const prompt = `
Valida y corrige este array JSON para que sea 100% válido y asegúrate de que todos los campos sigan el formato correcto:
[
  {
    "client": {
      "id": null,
      "name": "nombre identificado",
      "phone": "teléfono si está disponible o null",
      "matchConfidence": "alto/medio/bajo"
    },
    "items": [
      {
        "product": {
          "id": null,
          "name": "nombre del producto identificado"
        },
        "variant": {
          "id": null,
          "name": "variante si se identificó o null"
        },
        "quantity": número,
        "notes": "observaciones adicionales o null",
        "status": "confirmado/duda"
      }
    ]
  }
]

Si identificas varios clientes en el mismo mensaje, crea un objeto por cada cliente.
Usa el campo "status": "duda" si hay ambigüedad sobre algún producto o cantidad.
Usa "matchConfidence" como "bajo" si el nombre del cliente es poco claro.

JSON a validar y corregir:
"${phase2Response}"

Responde SOLO con el array JSON corregido y validado (sin explicaciones).
`;

  const response = await fetch(
    COHERE_ENDPOINT,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${COHERE_API_KEY}`
      },
      body: JSON.stringify({
        model: "command-r-plus",
        message: prompt,
        temperature: 0.1,
        p: 0.8,
        chat_history: []
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Error en respuesta:", errorText);
    throw new Error(`Error HTTP ${response.status}: ${errorText}`);
  }

  const data = await response.json();

  if (!data.text) {
    throw new Error("Respuesta vacía del servicio Cohere");
  }

  return data.text;
};

/**
 * Analiza el mensaje del cliente utilizando Gemini
 * @param message Mensaje del cliente a analizar
 * @param onProgress Callback para reportar progreso
 * @returns Resultado del análisis
 */
export const analyzeCustomerMessage = async (
  message: string,
  onProgress?: (progress: number) => void
): Promise<{
  result: MessageAnalysis[];
  phase1Response: string | null;
  phase2Response: string | null;
  phase3Response: string | null;
}> => {
  if (!message) {
    throw new Error("El mensaje está vacío");
  }

  try {
    onProgress?.(5);
    
    // Si está habilitado el modo optimizado, intentamos primero con una sola fase
    if (useOptimizedAnalysis && !useTwoPhasesAnalysis) {
      try {
        onProgress?.(15);
        
        // Intento directo en una fase (más rápido)
        console.log("Intentando análisis en una sola fase...");
        onProgress?.(30);
        
        const directResult = await singlePhaseAnalysis(message);
        onProgress?.(90);
        
        console.log("Análisis en una fase completado exitosamente");
        onProgress?.(100);
        
        return {
          result: directResult.result,
          phase1Response: null,
          phase2Response: directResult.jsonResponse,
          phase3Response: null
        };
      } catch (error) {
        console.log("El análisis en una fase falló, cambiando a tres fases:", error);
        onProgress?.(35);
        // Si falla, caemos en el análisis completo de tres fases
      }
    }
    
    // Análisis completo en dos o tres fases
    let phase1Response = null;
    let phase2Response = null;
    let phase3Response = null;
    
    // FASE 1: Análisis general del mensaje
    onProgress?.(40);
    console.log("Iniciando fase 1: Análisis general del mensaje");
    phase1Response = await analyzePhase1(message);
    onProgress?.(55);
    
    // FASE 2: Estructuración en JSON
    console.log("Iniciando fase 2: Estructuración en JSON");
    phase2Response = await analyzePhase2(phase1Response);
    onProgress?.(75);
    
    // FASE 3: Validación y corrección de JSON
    if (useTwoPhasesAnalysis) {
      console.log("Iniciando fase 3: Validación y corrección de JSON");
      phase3Response = await analyzePhase3(phase2Response);
      onProgress?.(90);
      
      // Parsear el JSON final validado
      let validAnalysis: MessageAnalysis[] = [];
      try {
        validAnalysis = JSON.parse(phase3Response);
        validateMessageAnalysis(validAnalysis);
      } catch (error) {
        console.error("Error al validar el JSON corregido:", error);
        throw new GeminiError(
          "La fase 3 produjo un JSON inválido",
          400,
          null,
          phase1Response,
          phase2Response,
          phase3Response
        );
      }
      
      onProgress?.(95);
      console.log("Análisis completado correctamente usando tres fases");
      
      return {
        result: validAnalysis,
        phase1Response,
        phase2Response,
        phase3Response
      };
    } else {
      // Análisis en dos fases (sin validación adicional)
      let parsedAnalysis: MessageAnalysis[] = [];
      
      try {
        parsedAnalysis = JSON.parse(phase2Response);
        validateMessageAnalysis(parsedAnalysis);
      } catch (error) {
        console.error("Error en el análisis en dos fases:", error);
        throw new GeminiError(
          "Error al parsear el JSON generado",
          400,
          null,
          phase1Response,
          phase2Response
        );
      }
      
      onProgress?.(95);
      console.log("Análisis completado correctamente usando dos fases");
      
      return {
        result: parsedAnalysis,
        phase1Response,
        phase2Response,
        phase3Response: null
      };
    }
  } catch (error) {
    console.error("Error en analyzeCustomerMessage:", error);
    
    if (error instanceof GeminiError) {
      throw error;
    }
    
    throw new GeminiError(
      (error as Error).message || "Error desconocido al analizar el mensaje",
      500
    );
  }
};

/**
 * Análisis en una sola fase (más rápido)
 */
const singlePhaseAnalysis = async (message: string): Promise<{
  result: MessageAnalysis[],
  jsonResponse: string
}> => {
  const prompt = `
Analiza este mensaje de un cliente y extrae la siguiente información en formato JSON:
1. Información del cliente (nombre, teléfono si está disponible)
2. Productos solicitados con cantidades

Mensaje del cliente:
"${message}"

Responde SOLO con un array JSON válido con esta estructura exacta (sin explicaciones):
[
  {
    "client": {
      "id": null,
      "name": "nombre identificado",
      "phone": "teléfono si está disponible o null",
      "matchConfidence": "alto/medio/bajo"
    },
    "items": [
      {
        "product": {
          "id": null,
          "name": "nombre del producto identificado"
        },
        "variant": {
          "id": null,
          "name": "variante si se identificó o null"
        },
        "quantity": número,
        "notes": "observaciones adicionales o null",
        "status": "confirmado/duda"
      }
    ]
  }
]

Si identificas varios clientes en el mismo mensaje, crea un objeto por cada cliente.
Usa el campo "status": "duda" si hay ambigüedad sobre algún producto o cantidad.
Usa "matchConfidence" como "bajo" si el nombre del cliente es poco claro.
`;

  const response = await fetch(
    COHERE_ENDPOINT,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${COHERE_API_KEY}`
      },
      body: JSON.stringify({
        model: "command-r-plus",
        message: prompt,
        temperature: 0.2,
        p: 0.7,
        chat_history: []
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Error en respuesta:", errorText);
    throw new Error(`Error HTTP ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  console.log("Respuesta del análisis en una fase:", data);

  if (!data.text) {
    throw new Error("Respuesta vacía del servicio Cohere");
  }

  // Extraer solo el JSON de la respuesta
  let jsonText = data.text.trim();
  
  // Si hay texto alrededor del JSON, intentamos extraerlo
  const jsonStartIdx = jsonText.indexOf('[');
  const jsonEndIdx = jsonText.lastIndexOf(']') + 1;
  
  if (jsonStartIdx >= 0 && jsonEndIdx > jsonStartIdx) {
    jsonText = jsonText.substring(jsonStartIdx, jsonEndIdx);
  }

  try {
    const result = JSON.parse(jsonText);
    validateMessageAnalysis(result);
    return { result, jsonResponse: jsonText };
  } catch (error) {
    console.error("Error al parsear JSON en análisis simple:", error);
    throw new Error(`JSON inválido recibido: ${jsonText}`);
  }
};
