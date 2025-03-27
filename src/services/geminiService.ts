
import { GOOGLE_API_KEY, OPENROUTER_API_KEY } from "@/lib/api-config";
import { MessageAnalysis, Product } from "@/types";
import { supabase } from "@/lib/supabase";

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

// Constantes para selección de modelo
export const AI_MODEL_TYPE = {
  GEMINI: 'gemini',
  OPENROUTER: 'openrouter'
};

// Configuración por defecto
let currentAiModelType = AI_MODEL_TYPE.OPENROUTER;

// Prompt para análisis de pedidos - versión por defecto
export const DEFAULT_ANALYSIS_PROMPT = `Analiza este mensaje de uno o varios clientes y extrae los pedidos. Cada línea o parte del mensaje puede contener pedidos distintos.

CONTEXTO (productos y clientes existentes):
{productsContext}

CLIENTES:
{clientsContext}

INSTRUCCIONES IMPORTANTES:
1. Devuelve SOLO un array JSON válido con los pedidos. No incluyas texto adicional.
2. Identifica el cliente y los productos de cada pedido.
3. Si un nombre coincide parcialmente con un cliente, selecciónalo y marca confidence medio o bajo.
4. Si hay duda en productos o cantidades, marca status:"duda".
5. Tu respuesta DEBE ser un JSON válido sin caracteres ni textos adicionales.
6. Las respuestas son informales y pueden mezclar cliente, cantidad y producto.

MENSAJE:
"{messageText}"

Estructura JSON:
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
        "notes": "Notas opcionales"
      }
    ],
    "unmatchedText": "Texto no identificado"
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

// Función para cambiar el modelo de IA
export const setAiModelType = (modelType: string) => {
  if (Object.values(AI_MODEL_TYPE).includes(modelType as any)) {
    currentAiModelType = modelType;
    return true;
  }
  return false;
};

// Función para obtener el modelo actual
export const getCurrentAiModelType = () => {
  return currentAiModelType;
};

// Función para restablecer el prompt por defecto
export const resetAnalysisPrompt = () => {
  currentAnalysisPrompt = DEFAULT_ANALYSIS_PROMPT;
};

/**
 * Función para realizar peticiones a OpenRouter (Claude 3 Haiku)
 */
export const callOpenRouterAPI = async (prompt: string): Promise<string> => {
  if (!OPENROUTER_API_KEY) {
    throw new GeminiError("API Key de OpenRouter no configurada");
  }

  try {
    console.log("Enviando petición a OpenRouter (Claude 3 Haiku) v1.0.1:", prompt.substring(0, 100) + "...");
    
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": window.location.origin,
        "X-Title": "VentasCom App"
      },
      body: JSON.stringify({
        model: "anthropic/claude-3-haiku",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1
      })
    });

    const responseText = await response.text();
    console.log("Respuesta raw de OpenRouter:", responseText.substring(0, 200) + "...");
    
    if (!response.ok) {
      console.error("Error en respuesta HTTP:", response.status, response.statusText, responseText);
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
      console.error("Error al parsear respuesta de OpenRouter:", parseError, responseText);
      throw new GeminiError(`Error al parsear respuesta: ${(parseError as Error).message}`, {
        apiResponse: parseError,
        rawJsonResponse: responseText
      });
    }

    console.log("Respuesta de OpenRouter (resumida):", JSON.stringify(data).substring(0, 200) + "...");

    if (data.error) {
      console.error("Error devuelto por la API de OpenRouter:", data.error);
      throw new GeminiError(`Error de la API de OpenRouter: ${data.error.message || "Error desconocido"}`, {
        apiResponse: data.error,
        rawJsonResponse: responseText
      });
    }

    if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
      console.error("Respuesta completa con formato incorrecto:", JSON.stringify(data, null, 2));
      throw new GeminiError("Formato de respuesta inesperado de la API de OpenRouter", {
        apiResponse: data,
        rawJsonResponse: responseText
      });
    }

    const resultText = data.choices[0].message.content;
    console.log("Texto de respuesta:", resultText.substring(0, 200) + "...");
    
    return resultText;
  } catch (error) {
    if (error instanceof GeminiError) {
      throw error;
    }
    console.error("Error inesperado al llamar a OpenRouter API:", error);
    throw new GeminiError(`Error al conectar con OpenRouter API: ${(error as Error).message}`);
  }
};

/**
 * Función para realizar peticiones a la API de Google Gemini con soporte mejorado para respuestas largas
 */
export const callGeminiAPI = async (prompt: string): Promise<string> => {
  if (!GOOGLE_API_KEY) {
    throw new GeminiError("API Key de Google Gemini no configurada");
  }

  try {
    console.log("Enviando petición a Gemini API v1.0.15:", prompt.substring(0, 100) + "...");
    
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
            temperature: 0.1,
            topP: 0.9,
            maxOutputTokens: 4096, // Aumentado de 1024 a 4096 para permitir respuestas más largas
          }
        }),
      }
    );

    const responseText = await response.text();
    console.log("Respuesta raw de Gemini:", responseText.substring(0, 200) + "...");
    
    if (!response.ok) {
      console.error("Error en respuesta HTTP:", response.status, response.statusText, responseText);
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
      console.error("Error al parsear respuesta de Gemini:", parseError, responseText);
      throw new GeminiError(`Error al parsear respuesta: ${(parseError as Error).message}`, {
        apiResponse: parseError,
        rawJsonResponse: responseText
      });
    }

    console.log("Respuesta de Gemini (resumida):", JSON.stringify(data).substring(0, 200) + "...");

    if (data.error) {
      console.error("Error devuelto por la API de Gemini:", data.error);
      throw new GeminiError(`Error de la API de Gemini: ${data.error.message || "Error desconocido"}`, {
        apiResponse: data.error,
        rawJsonResponse: responseText
      });
    }

    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts) {
      console.error("Respuesta completa con formato incorrecto:", JSON.stringify(data, null, 2));
      throw new GeminiError("Formato de respuesta inesperado de la API de Gemini", {
        apiResponse: data,
        rawJsonResponse: responseText
      });
    }

    const resultText = data.candidates[0].content.parts[0].text;
    console.log("Texto de respuesta:", resultText.substring(0, 200) + "...");
    
    return resultText;
  } catch (error) {
    if (error instanceof GeminiError) {
      throw error;
    }
    console.error("Error inesperado al llamar a Gemini API:", error);
    throw new GeminiError(`Error al conectar con Gemini API: ${(error as Error).message}`);
  }
};

/**
 * Función para llamar a la API seleccionada actualmente
 */
export const callAiApi = async (prompt: string): Promise<string> => {
  if (currentAiModelType === AI_MODEL_TYPE.OPENROUTER) {
    return callOpenRouterAPI(prompt);
  } else {
    return callGeminiAPI(prompt);
  }
};

/**
 * Función mejorada para limpiar y extraer JSON de la respuesta
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
 * Función para dividir mensajes largos en segmentos para procesamiento por lotes
 */
const splitLongMessage = (message: string, maxLength: number = 1500): string[] => {
  if (message.length <= maxLength) {
    return [message];
  }
  
  // Identificar separadores naturales (guiones, saltos de línea, etc.)
  const separators = [' - ', '\n', '.', ','];
  const segments: string[] = [];
  let currentSegment = '';
  
  // Dividir por líneas primero
  const lines = message.split(/\n|(?= - )/);
  
  for (const line of lines) {
    if (currentSegment.length + line.length + 1 <= maxLength) {
      currentSegment += (currentSegment ? ' ' : '') + line;
    } else {
      if (currentSegment) {
        segments.push(currentSegment);
      }
      currentSegment = line;
    }
  }
  
  if (currentSegment) {
    segments.push(currentSegment);
  }
  
  return segments;
};

/**
 * Función para combinar resultados de múltiples análisis
 */
const combineAnalysisResults = (results: MessageAnalysis[][]): MessageAnalysis[] => {
  // Combinamos todos los resultados
  const combinedResults = results.flat();
  
  // Agrupamos por cliente para consolidar
  const clientGroups: Record<string, MessageAnalysis> = {};
  
  for (const result of combinedResults) {
    const clientKey = result.client.name.toLowerCase();
    
    if (!clientGroups[clientKey]) {
      clientGroups[clientKey] = {
        client: result.client,
        items: [],
        unmatchedText: result.unmatchedText || ""
      };
    } else {
      // Si este resultado tiene mejor confianza, actualizar la info del cliente
      if (confidenceRank(result.client.matchConfidence) > confidenceRank(clientGroups[clientKey].client.matchConfidence)) {
        clientGroups[clientKey].client = result.client;
      }
      
      // Combinar unmatchedText si existe
      if (result.unmatchedText) {
        clientGroups[clientKey].unmatchedText += (clientGroups[clientKey].unmatchedText ? " " : "") + result.unmatchedText;
      }
    }
    
    // Añadir items, evitando duplicados
    for (const item of result.items) {
      // Verificar si el ítem ya existe (mismo producto, variante y notas)
      const existingItemIndex = clientGroups[clientKey].items.findIndex(i => 
        i.product.id === item.product.id &&
        (i.variant?.id || null) === (item.variant?.id || null) &&
        i.notes === item.notes
      );
      
      if (existingItemIndex >= 0) {
        // Si existe, sumar la cantidad
        clientGroups[clientKey].items[existingItemIndex].quantity += item.quantity;
      } else {
        // Si no existe, añadirlo
        clientGroups[clientKey].items.push({...item});
      }
    }
  }
  
  return Object.values(clientGroups);
};

// Función auxiliar para clasificar niveles de confianza
const confidenceRank = (confidence: string): number => {
  switch (confidence) {
    case 'alto': return 3;
    case 'medio': return 2;
    case 'bajo': return 1;
    default: return 0;
  }
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
 * Función mejorada para analizar mensajes largos de clientes
 */
export const analyzeCustomerMessage = async (
  message: string
): Promise<MessageAnalysis[]> => {
  try {
    console.log("Analizando mensaje de longitud:", message.length);
    
    // Si el mensaje es muy largo, lo dividimos en segmentos
    const isLongMessage = message.length > 1000;
    const messageSegments = isLongMessage ? splitLongMessage(message) : [message];
    console.log(`Mensaje dividido en ${messageSegments.length} segmentos para análisis`);
    
    const dbContext = await fetchDatabaseContext();
    
    // Preparar el contexto para el prompt
    const productsContext = dbContext.products.map(p => {
      const variantsText = p.variants && p.variants.length 
        ? `Variantes: ${p.variants.map(v => `${v.name} (ID: ${v.id})`).join(', ')}` 
        : 'Sin variantes';
      
      return `- ${p.name} (ID: ${p.id}), Precio: ${p.price}. ${variantsText}`;
    }).join('\n');
    
    const clientsContext = dbContext.clients.map(c => 
      `- ${c.name} (ID: ${c.id})${c.phone ? `, Teléfono: ${c.phone}` : ''}`
    ).join('\n');
    
    // Analizar todos los segmentos
    const allResults: MessageAnalysis[][] = [];
    let lastError: GeminiError | null = null;
    
    for (let i = 0; i < messageSegments.length; i++) {
      const segment = messageSegments[i];
      console.log(`Analizando segmento ${i+1}/${messageSegments.length} (longitud: ${segment.length})`);
      
      // Intentar hasta 2 veces para cada segmento
      let attempts = 0;
      const maxAttempts = 2;
      let segmentResults: MessageAnalysis[] | null = null;
      
      while (attempts < maxAttempts && !segmentResults) {
        attempts++;
        try {
          // Obtener el prompt personalizado y reemplazar placeholders
          let prompt = currentAnalysisPrompt
            .replace('{productsContext}', productsContext)
            .replace('{clientsContext}', clientsContext)
            .replace('{messageText}', segment);
          
          const responseText = await callAiApi(prompt);
          let jsonText = extractJsonFromResponse(responseText);
          
          try {
            // Intentar analizar el JSON
            const parsedResult = JSON.parse(jsonText) as MessageAnalysis[];
            
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
              
              return true;
            });
            
            segmentResults = processedResult;
            allResults.push(processedResult);
            console.log(`Segmento ${i+1} analizado correctamente: ${processedResult.length} pedidos`);
          } catch (parseError: any) {
            console.error(`Error al procesar JSON del segmento ${i+1} (intento ${attempts}):`, parseError);
            console.error("Texto JSON recibido:", jsonText);
            lastError = new GeminiError(`Error al procesar la respuesta JSON: ${parseError.message}`, {
              apiResponse: parseError,
              rawJsonResponse: jsonText
            });
            
            // Si no es el último intento, continuamos
            if (attempts < maxAttempts) {
              console.log(`Reintentando análisis del segmento ${i+1}...`);
              await new Promise(resolve => setTimeout(resolve, 1000)); // Esperar un segundo
            }
          }
        } catch (error: any) {
          console.error(`Error al analizar segmento ${i+1} (intento ${attempts}):`, error);
          lastError = error instanceof GeminiError ? error : new GeminiError(error.message);
          
          // Si no es el último intento, continuamos
          if (attempts < maxAttempts) {
            console.log(`Reintentando análisis del segmento ${i+1}...`);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Esperar un segundo
          }
        }
      }
      
      // Si no pudimos analizar este segmento después de todos los intentos
      if (!segmentResults) {
        console.warn(`No se pudo analizar el segmento ${i+1} después de ${maxAttempts} intentos`);
        // Si es el único segmento, propagamos el error
        if (messageSegments.length === 1 && lastError) {
          throw lastError;
        }
      }
    }
    
    // Si no tenemos resultados y hubo error en el último segmento
    if (allResults.length === 0 && lastError) {
      throw lastError;
    }
    
    // Combinar los resultados de todos los segmentos
    const combinedResults = combineAnalysisResults(allResults);
    console.log("Análisis combinado completado. Pedidos totales identificados:", combinedResults.length);
    
    return combinedResults;
    
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
    const response = await callAiApi(prompt);
    return response;
  } catch (error) {
    console.error("Error en chatWithAssistant:", error);
    if (error instanceof GeminiError) {
      throw error;
    }
    throw new GeminiError(`Error al procesar tu consulta: ${(error as Error).message}`);
  }
};
