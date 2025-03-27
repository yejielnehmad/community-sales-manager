import { COHERE_API_KEY, COHERE_ENDPOINT, OPENROUTER_API_KEY, OPENROUTER_ENDPOINT } from "@/lib/api-config";
import { MessageAnalysis, Product } from "@/types";
import { supabase } from "@/lib/supabase";
import { logDebug, logError } from "@/lib/debug-utils";

export class GeminiError extends Error {
  status?: number;
  statusText?: string;
  apiResponse?: any;
  rawJsonResponse?: string;
  
  constructor(message: string, details?: { 
    status?: number, 
    statusText?: string, 
    apiResponse?: any,
    rawJsonResponse?: string 
  }) {
    super(message);
    this.name = "GeminiError";
    this.status = details?.status;
    this.statusText = details?.statusText;
    this.apiResponse = details?.apiResponse;
    this.rawJsonResponse = details?.rawJsonResponse;
  }
}

export { GeminiError as AIServiceError };

export const DEFAULT_ANALYSIS_PROMPT = `Analiza este mensaje de uno o varios clientes y extrae los pedidos. Cada línea puede contener un pedido distinto. Múltiples mensajes deben ser tratados como pedidos separados.

CONTEXTO (productos y clientes existentes en la base de datos):

PRODUCTOS:
{productsContext}

CLIENTES:
{clientsContext}

INSTRUCCIONES IMPORTANTES:
1. Devuelve EXCLUSIVAMENTE un array JSON válido. No incluyas explicaciones, comentarios ni ningún texto adicional.
2. La respuesta DEBE ser solo un array JSON que siga exactamente el esquema indicado más abajo.
3. NO uses caracteres de markdown como \`\`\` ni ningún otro envoltorio alrededor del JSON.
4. SIEMPRE genera tarjetas de pedidos, incluso si falta información o hay ambigüedad.
5. Identifica el cliente de cada pedido. Si no hay coincidencia exacta, selecciona el más parecido.
6. Si un nombre no coincide con ningún cliente y no se asocia a productos conocidos, inclúyelo con matchConfidence: "desconocido".
7. Detecta los productos solicitados junto con cantidades.
8. Si hay duda o ambigüedad en el pedido, márcalo como status: "duda" y explica brevemente en "notes".
9. Las respuestas suelen ser informales, cortas y pueden tener errores, abreviaciones o mezcla de cliente, cantidad y producto.
10. Adapta tu análisis a ese estilo informal y flexible.
11. Tu respuesta debe estar perfectamente formateada como JSON válido. NO puede tener errores de sintaxis, comas faltantes, llaves mal cerradas ni valores incompletos.
12. NO devuelvas contenido truncado ni texto fuera del JSON. Si hay duda, colócala en el campo "notes" o "unmatchedText", pero nunca como texto suelto fuera del esquema.
13. Asegurate de que cada objeto del array esté completamente cerrado y estructurado correctamente.

MENSAJE A ANALIZAR:
"{messageText}"

Devuelve únicamente un array JSON con esta estructura:

[
  {
    "client": {
      "id": "ID del cliente o null",
      "name": "Nombre del cliente",
      "matchConfidence": "alto|medio|bajo|desconocido"
    },
    "items": [
      {
        "product": {
          "id": "ID del producto o null",
          "name": "Nombre del producto"
        },
        "quantity": número,
        "variant": {
          "id": "ID de la variante o null",
          "name": "Nombre de la variante"
        },
        "status": "confirmado|duda",
        "alternatives": [],
        "notes": "Notas o dudas sobre este ítem"
      }
    ],
    "unmatchedText": "Texto no asociado a cliente o producto"
  }
]`;

let currentAnalysisPrompt = DEFAULT_ANALYSIS_PROMPT;

export const setCustomAnalysisPrompt = (prompt: string) => {
  if (!prompt || prompt.trim() === '') {
    currentAnalysisPrompt = DEFAULT_ANALYSIS_PROMPT;
    return;
  }
  currentAnalysisPrompt = prompt;
};

export const getCurrentAnalysisPrompt = () => {
  return currentAnalysisPrompt;
};

export const resetAnalysisPrompt = () => {
  currentAnalysisPrompt = DEFAULT_ANALYSIS_PROMPT;
};

/**
 * Función para realizar peticiones a la API de Cohere
 */
export const callGeminiAPI = async (prompt: string): Promise<string> => {
  if (!COHERE_API_KEY) {
    logError("API", "API Key de Cohere no configurada");
    throw new GeminiError("API Key de Cohere no configurada");
  }

  try {
    // Usar endpoint desde la configuración
    const endpoint = COHERE_ENDPOINT || "https://api.cohere.ai/v1/chat";
    
    logDebug("API", `Enviando petición a Cohere API v1.0.19: ${prompt.substring(0, 100)}...`);
    logDebug("API", `Usando endpoint: ${endpoint}`);
    
    // Solo mostramos la parte inicial de la API key si tiene suficiente longitud
    if (COHERE_API_KEY && COHERE_API_KEY.length > 10) {
      logDebug("API", `API Key (primeros 10 caracteres): ${COHERE_API_KEY.substring(0, 10)}...`);
    } else {
      logDebug("API", "API Key presente pero es demasiado corta para mostrar");
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
          model: "command-r-plus",
          message: prompt,
          temperature: 0.2,
          max_tokens: 1024,
          chat_history: []
        }),
      }
    );

    const responseText = await response.text();
    logDebug("API", `Respuesta raw de Cohere: ${responseText.substring(0, 200)}...`);
    
    if (!response.ok) {
      logError("API", `Error en respuesta HTTP: ${response.status} ${response.statusText}`, responseText);
      throw new GeminiError(`Error HTTP: ${response.status} ${response.statusText}`, {
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
      logError("API", `Error al parsear respuesta de Cohere:`, parseError);
      throw new GeminiError(`Error al parsear respuesta: ${(parseError as Error).message}`, {
        apiResponse: parseError,
        rawJsonResponse: responseText
      });
    }

    logDebug("API", `Respuesta de Cohere (resumida): ${JSON.stringify(data).substring(0, 200)}...`);

    if (data.error) {
      logError("API", `Error devuelto por la API de Cohere:`, data.error);
      throw new GeminiError(`Error de la API de Cohere: ${data.error.message || "Error desconocido"}`, {
        apiResponse: data.error,
        rawJsonResponse: responseText
      });
    }

    if (!data.text) {
      logError("API", `Respuesta completa con formato incorrecto:`, data);
      throw new GeminiError("Formato de respuesta inesperado de la API de Cohere", {
        apiResponse: data,
        rawJsonResponse: responseText
      });
    }

    const resultText = data.text;
    logDebug("API", `Texto de respuesta: ${resultText.substring(0, 200)}...`);
    
    return resultText;
  } catch (error) {
    if (error instanceof GeminiError) {
      throw error;
    }
    logError("API", `Error inesperado al llamar a Cohere API:`, error);
    throw new GeminiError(`Error al conectar con Cohere API: ${(error as Error).message}`);
  }
};

const extractJsonFromResponse = (text: string): string => {
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
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\n+/g, ' ')
    .trim();
  
  if (!jsonText.startsWith('[') || !jsonText.endsWith(']')) {
    const arrayMatch = jsonText.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (arrayMatch) {
      jsonText = arrayMatch[0];
    }
  }
  
  return jsonText;
};

export const fetchDatabaseContext = async () => {
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, name, price, description');
  
  if (productsError) {
    console.error("Error al obtener productos:", productsError);
    throw new Error(`Error al obtener productos: ${productsError.message}`);
  }

  const { data: variants, error: variantsError } = await supabase
    .from('product_variants')
    .select('id, product_id, name, price');
  
  if (variantsError) {
    console.error("Error al obtener variantes:", variantsError);
    throw new Error(`Error al obtener variantes: ${variantsError.message}`);
  }

  const productsWithVariants = products.map(product => {
    const productVariants = variants.filter(v => v.product_id === product.id);
    return {
      ...product,
      variants: productVariants
    };
  });

  const { data: clients, error: clientsError } = await supabase
    .from('clients')
    .select('id, name, phone');
  
  if (clientsError) {
    console.error("Error al obtener clientes:", clientsError);
    throw new Error(`Error al obtener clientes: ${clientsError.message}`);
  }

  return {
    products: productsWithVariants,
    clients
  };
};

export const analyzeCustomerMessage = async (
  message: string
): Promise<MessageAnalysis[]> => {
  try {
    console.log("Analizando mensaje...");
    
    let attempts = 0;
    const maxAttempts = 3;
    let lastError: GeminiError | null = null;
    let lastJsonResponse: string | null = null;
    
    while (attempts < maxAttempts) {
      try {
        attempts++;
        console.log(`Intento #${attempts} de analizar mensaje`);
        
        const dbContext = await fetchDatabaseContext();
        
        const clientNames = dbContext.clients.map(client => client.name.toLowerCase());
        
        const productsContext = dbContext.products.map(p => {
          const variantsText = p.variants && p.variants.length 
            ? `Variantes: ${p.variants.map(v => `${v.name} (ID: ${v.id})`).join(', ')}` 
            : 'Sin variantes';
          
          return `- ${p.name} (ID: ${p.id}), Precio: ${p.price}. ${variantsText}`;
        }).join('\n');
        
        const clientsContext = dbContext.clients.map(c => 
          `- ${c.name} (ID: ${c.id})${c.phone ? `, Teléfono: ${c.phone}` : ''}`
        ).join('\n');
        
        let prompt = currentAnalysisPrompt
          .replace('{productsContext}', productsContext)
          .replace('{clientsContext}', clientsContext)
          .replace('{messageText}', message);
        
        const responseText = await callGeminiAPI(prompt);
        lastJsonResponse = responseText;
        
        let jsonText = extractJsonFromResponse(responseText);
        lastJsonResponse = jsonText;
        
        try {
          const parsedResult = JSON.parse(jsonText) as MessageAnalysis[];
          console.log("Análisis completado. Pedidos identificados:", parsedResult.length);
          
          if (!Array.isArray(parsedResult)) {
            throw new Error("El formato de los datos analizados no es válido (no es un array)");
          }
          
          const processedResult = parsedResult.filter(result => {
            if (!result.client || typeof result.client !== 'object') {
              return false;
            }
            
            if (!Array.isArray(result.items)) {
              result.items = [];
            }
            
            if (result.client.matchConfidence === "desconocido" && 
                (!result.items || result.items.length === 0 || 
                 result.items.every(item => !item.product.id))) {
              console.log(`Nombre no reconocido: ${result.client.name}`);
              return false;
            }
            
            return true;
          });
          
          return processedResult;
        } catch (parseError: any) {
          console.error("Error al analizar JSON (intento #" + attempts + "):", parseError);
          console.error("Texto JSON recibido:", jsonText);
          
          lastError = new GeminiError(`Error al procesar la respuesta JSON: ${parseError.message}`, {
            apiResponse: parseError,
            rawJsonResponse: jsonText
          });
          
          if (attempts < maxAttempts) {
            console.log("Reintentando análisis con formato mejorado...");
            continue;
          }
          
          throw lastError;
        }
      } catch (attemptError: any) {
        if (attemptError instanceof GeminiError) {
          lastError = attemptError;
        } else {
          lastError = new GeminiError(`Error en el intento #${attempts}: ${attemptError.message}`, {
            rawJsonResponse: lastJsonResponse || "No disponible"
          });
        }
        
        if (attempts >= maxAttempts) {
          throw lastError;
        }
        
        console.log(`Error en intento #${attempts}, reintentando...`, attemptError);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    throw new GeminiError("Error al analizar el mensaje después de múltiples intentos", {
      rawJsonResponse: lastJsonResponse || "No disponible"
    });
  } catch (error) {
    console.error("Error final en analyzeCustomerMessage:", error);
    if (error instanceof GeminiError) {
      throw error;
    }
    throw new GeminiError(`Error al analizar el mensaje: ${(error as Error).message}`);
  }
};

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
    const response = await callGeminiAPI(prompt);
    return response;
  } catch (error) {
    console.error("Error en chatWithAssistant:", error);
    if (error instanceof GeminiError) {
      throw error;
    }
    throw new GeminiError(`Error al procesar tu consulta: ${(error as Error).message}`);
  }
};
