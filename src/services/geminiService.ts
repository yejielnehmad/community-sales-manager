
import { OPENROUTER_API_KEY, OPENROUTER_ENDPOINT } from "@/lib/api-config";
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

// Exportamos GeminiError también como AIServiceError para mantener compatibilidad
export { GeminiError as AIServiceError };

// Prompt para análisis de pedidos - versión por defecto
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

// Variable para almacenar el prompt personalizado
let currentAnalysisPrompt = DEFAULT_ANALYSIS_PROMPT;

// Función para establecer un prompt personalizado
export const setCustomAnalysisPrompt = (prompt: string) => {
  if (!prompt || prompt.trim() === '') {
    currentAnalysisPrompt = DEFAULT_ANALYSIS_PROMPT;
    return;
  }
  currentAnalysisPrompt = prompt;
};

// Función para obtener el prompt actual
export const getCurrentAnalysisPrompt = () => {
  return currentAnalysisPrompt;
};

// Función para restablecer el prompt por defecto
export const resetAnalysisPrompt = () => {
  currentAnalysisPrompt = DEFAULT_ANALYSIS_PROMPT;
};

/**
 * Función para realizar peticiones a la API de OpenRouter (Claude 3 Haiku)
 */
export const callGeminiAPI = async (prompt: string): Promise<string> => {
  if (!OPENROUTER_API_KEY) {
    logError("API", "API Key de OpenRouter no configurada");
    throw new GeminiError("API Key de OpenRouter no configurada");
  }

  try {
    // Usar endpoint desde la configuración
    const endpoint = OPENROUTER_ENDPOINT || "https://openrouter.ai/api/v1/chat/completions";
    
    logDebug("API", `Enviando petición a OpenRouter API v1.0.18 (Claude 3 Haiku): ${prompt.substring(0, 100)}...`);
    logDebug("API", `Usando endpoint: ${endpoint}`);
    logDebug("API", `API Key (primeros 10 caracteres): ${OPENROUTER_API_KEY.substring(0, 10)}...`);
    
    const response = await fetch(
      endpoint,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "HTTP-Referer": window.location.origin, // Requerido por OpenRouter
          "X-Title": "VentasCom" // Nombre de la aplicación
        },
        body: JSON.stringify({
          model: "anthropic/claude-3-haiku",
          messages: [
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.2, // Bajo para respuestas consistentes
          max_tokens: 1024
        }),
      }
    );

    const responseText = await response.text();
    logDebug("API", `Respuesta raw de OpenRouter: ${responseText.substring(0, 200)}...`);
    
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
      logError("API", `Error al parsear respuesta de OpenRouter:`, parseError);
      throw new GeminiError(`Error al parsear respuesta: ${(parseError as Error).message}`, {
        apiResponse: parseError,
        rawJsonResponse: responseText
      });
    }

    logDebug("API", `Respuesta de OpenRouter (resumida): ${JSON.stringify(data).substring(0, 200)}...`);

    if (data.error) {
      logError("API", `Error devuelto por la API de OpenRouter:`, data.error);
      throw new GeminiError(`Error de la API de OpenRouter: ${data.error.message || "Error desconocido"}`, {
        apiResponse: data.error,
        rawJsonResponse: responseText
      });
    }

    if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
      logError("API", `Respuesta completa con formato incorrecto:`, data);
      throw new GeminiError("Formato de respuesta inesperado de la API de OpenRouter", {
        apiResponse: data,
        rawJsonResponse: responseText
      });
    }

    const resultText = data.choices[0].message.content;
    logDebug("API", `Texto de respuesta: ${resultText.substring(0, 200)}...`);
    
    return resultText;
  } catch (error) {
    if (error instanceof GeminiError) {
      throw error;
    }
    logError("API", `Error inesperado al llamar a OpenRouter API:`, error);
    throw new GeminiError(`Error al conectar con OpenRouter API: ${(error as Error).message}`);
  }
};

/**
 * Función para limpiar y extraer JSON de la respuesta
 */
const extractJsonFromResponse = (text: string): string => {
  // Eliminar posibles comentarios y marcadores de código
  let jsonText = text.trim();
  
  // Eliminar backticks y marcadores de código
  if (jsonText.includes("```")) {
    // Extraer contenido entre los primeros backticks
    const match = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
      jsonText = match[1].trim();
    } else {
      // Si no podemos extraer correctamente, intentamos quitar todos los backticks
      jsonText = jsonText.replace(/```(?:json)?|```/g, "").trim();
    }
  }
  
  // Eliminar caracteres problemáticos
  jsonText = jsonText
    .replace(/[\u2018\u2019]/g, "'") // Reemplazar comillas simples tipográficas
    .replace(/[\u201C\u201D]/g, '"') // Reemplazar comillas dobles tipográficas
    .replace(/\n+/g, ' ') // Reemplazar saltos de línea múltiples por espacio
    .trim();
  
  // Verificar si el texto empieza y termina con corchetes para array JSON
  if (!jsonText.startsWith('[') || !jsonText.endsWith(']')) {
    // Intentar encontrar el array JSON dentro del texto
    const arrayMatch = jsonText.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (arrayMatch) {
      jsonText = arrayMatch[0];
    }
  }
  
  return jsonText;
};

/**
 * Función para obtener productos y clientes de la base de datos
 */
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

/**
 * Función específica para analizar mensajes de clientes con contexto de la base de datos
 */
export const analyzeCustomerMessage = async (
  message: string
): Promise<MessageAnalysis[]> => {
  try {
    console.log("Analizando mensaje...");
    
    // Intentar hasta 3 veces en caso de error
    let attempts = 0;
    const maxAttempts = 3;
    let lastError: GeminiError | null = null;
    let lastJsonResponse: string | null = null;
    
    while (attempts < maxAttempts) {
      try {
        attempts++;
        console.log(`Intento #${attempts} de analizar mensaje`);
        
        const dbContext = await fetchDatabaseContext();
        
        // Preparar el contexto para el prompt
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
        
        // Obtener el prompt personalizado y reemplazar placeholders
        let prompt = currentAnalysisPrompt
          .replace('{productsContext}', productsContext)
          .replace('{clientsContext}', clientsContext)
          .replace('{messageText}', message);
        
        const responseText = await callGeminiAPI(prompt);
        lastJsonResponse = responseText;
        
        let jsonText = extractJsonFromResponse(responseText);
        lastJsonResponse = jsonText;
        
        try {
          // Intentar analizar el JSON
          const parsedResult = JSON.parse(jsonText) as MessageAnalysis[];
          console.log("Análisis completado. Pedidos identificados:", parsedResult.length);
          
          if (!Array.isArray(parsedResult)) {
            throw new Error("El formato de los datos analizados no es válido (no es un array)");
          }
          
          // Filtrar resultados inválidos
          const processedResult = parsedResult.filter(result => {
            // Asegurarse de que hay un cliente válido
            if (!result.client || typeof result.client !== 'object') {
              return false;
            }
            
            // Asegurarse de que items es un array
            if (!Array.isArray(result.items)) {
              result.items = [];
            }
            
            // Filtrar elementos que son solo nombres no reconocidos sin productos
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
          
          // Guardamos el error para devolver en caso de fallo total
          lastError = new GeminiError(`Error al procesar la respuesta JSON: ${parseError.message}`, {
            apiResponse: parseError,
            rawJsonResponse: jsonText
          });
          
          // Si no es el último intento, intentamos de nuevo
          if (attempts < maxAttempts) {
            console.log("Reintentando análisis con formato mejorado...");
            continue;
          }
          
          throw lastError;
        }
      } catch (attemptError: any) {
        // Capturar el error y la respuesta JSON para devolverla en caso de fallo total
        if (attemptError instanceof GeminiError) {
          lastError = attemptError;
        } else {
          lastError = new GeminiError(`Error en el intento #${attempts}: ${attemptError.message}`, {
            rawJsonResponse: lastJsonResponse || "No disponible"
          });
        }
        
        // Si es el último intento, propagamos el error
        if (attempts >= maxAttempts) {
          throw lastError;
        }
        
        console.log(`Error en intento #${attempts}, reintentando...`, attemptError);
        // Esperar un segundo antes de reintentar
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Este código no debería ejecutarse, pero por si acaso
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

/**
 * Función para interactuar con el asistente virtual
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
