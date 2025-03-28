import { COHERE_API_KEY, COHERE_ENDPOINT, OPENROUTER_API_KEY, OPENROUTER_ENDPOINT, GOOGLE_API_KEY, GOOGLE_GEMINI_ENDPOINT, GOOGLE_GEMINI_MODELS } from "@/lib/api-config";
import { MessageAnalysis, Product } from "@/types";
import { supabase } from "@/lib/supabase";
import { logDebug, logError } from "@/lib/debug-utils";

export type ApiProvider = "cohere" | "google-gemini";
let currentApiProvider: ApiProvider = "cohere"; // Por defecto usamos Cohere

// Definición de la variable faltante
let currentGeminiModel: string = GOOGLE_GEMINI_MODELS.GEMINI_FLASH_2; // Por defecto usamos gemini-2.0-flash

export const setApiProvider = (provider: ApiProvider) => {
  currentApiProvider = provider;
  logDebug("API", `Proveedor de API establecido a: ${provider}`);
};

export const getCurrentApiProvider = (): ApiProvider => {
  return currentApiProvider;
};

export const setGeminiModel = (model: string) => {
  if (Object.values(GOOGLE_GEMINI_MODELS).includes(model as any)) {
    currentGeminiModel = model;
    logDebug("API", `Modelo de Google Gemini establecido a: ${model}`);
  } else {
    logError("API", `Modelo de Google Gemini no válido: ${model}`);
  }
};

export const getCurrentGeminiModel = (): string => {
  return currentGeminiModel;
};

export class GeminiError extends Error {
  status?: number;
  statusText?: string;
  apiResponse?: any;
  rawJsonResponse?: string;
  phase1Response?: string;
  phase2Response?: string;
  phase3Response?: string;
  
  constructor(message: string, details?: { 
    status?: number, 
    statusText?: string, 
    apiResponse?: any,
    rawJsonResponse?: string,
    phase1Response?: string,
    phase2Response?: string,
    phase3Response?: string
  }) {
    super(message);
    this.name = "GeminiError";
    this.status = details?.status;
    this.statusText = details?.statusText;
    this.apiResponse = details?.apiResponse;
    this.rawJsonResponse = details?.rawJsonResponse;
    this.phase1Response = details?.phase1Response;
    this.phase2Response = details?.phase2Response;
    this.phase3Response = details?.phase3Response;
  }
}

export { GeminiError as AIServiceError };

export const STEP_ONE_PROMPT = `Analiza este mensaje de uno o varios clientes y extrae los pedidos por cliente. Cada línea o párrafo puede contener un pedido distinto de un cliente diferente.

CONTEXTO (productos y clientes existentes en la base de datos):

PRODUCTOS:
{productsContext}

CLIENTES:
{clientsContext}

INSTRUCCIONES IMPORTANTES:
1. Analiza detalladamente el mensaje y separa los pedidos por cliente.
2. Identifica qué cliente está haciendo cada pedido.
3. Para cada cliente, identifica los productos que están pidiendo con sus cantidades.
4. Si un nombre no coincide con ningún cliente conocido, considera si podría ser un nuevo cliente.
5. Detecta productos, variantes y cantidades. Por ejemplo, "3M" es 3 pañales talle M.
6. Si el producto o variante NO está en el catálogo, marca que hay una duda.
7. Si el producto o variante SÍ está en el catálogo, NO generes dudas. Por ejemplo: "Tres leche" se refiere a 3 unidades de leche si "Tres Leches" no existe en el catálogo como postre.
8. Presta atención a mensajes informales, abreviaciones y mezclas de información.

MENSAJE A ANALIZAR:
"{messageText}"

Devuelve tu análisis en formato texto estructurado como este ejemplo:

---
Cliente: Martín  
Pedido: 5 pollos, 3 pañales talle M, 3 leches  
Notas: Todo claro  

Cliente: Eli  
Pedido: 5 pollos, 1 queso muzarela  
Notas: Todo claro  
---`;

export const STEP_TWO_PROMPT = `Ahora, convierte el siguiente análisis de pedidos en un formato JSON estructurado:

ANÁLISIS PREVIO:
{analysisText}

CONTEXTO (productos y clientes existentes en la base de datos):

PRODUCTOS:
{productsContext}

CLIENTES:
{clientsContext}

INSTRUCCIONES IMPORTANTES:
1. Devuelve EXCLUSIVAMENTE un array JSON válido. No incluyas explicaciones, comentarios ni ningún texto adicional.
2. La respuesta DEBE ser solo un array JSON que siga exactamente el esquema indicado más abajo.
3. NO uses caracteres de markdown como \`\`\` ni ningún otro envoltorio alrededor del JSON.
4. SIEMPRE genera tarjetas de pedidos para cada cliente identificado.
5. Identifica el cliente de cada pedido. Si no hay coincidencia exacta, selecciona el más parecido.
6. Detecta los productos solicitados junto con cantidades.
7. Si hay duda o ambigüedad en el pedido, márcalo como status: "duda" y explica brevemente en "notes".
8. El JSON debe estar perfectamente formado. No incluyas explicaciones ni errores de sintaxis.
9. Todas las aclaraciones o dudas deben ir dentro del campo "notes".
10. Tu respuesta debe estar perfectamente formateada como JSON válido. NO puede tener errores de sintaxis, comas faltantes, llaves mal cerradas ni valores incompletos.

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

export const STEP_THREE_PROMPT = `Valida y corrige el siguiente JSON para asegurar que esté bien formado y cumpla con la estructura esperada:

JSON A VALIDAR:
{jsonText}

INSTRUCCIONES IMPORTANTES:
1. Verifica la sintaxis del JSON: comillas faltantes, comas, llaves o corchetes mal cerrados.
2. Asegúrate de que todos los valores para cada campo tengan el tipo correcto:
   - Los IDs pueden ser string o null
   - Las cantidades ("quantity") deben ser números
   - El "matchConfidence" debe ser uno de: "alto", "medio", "bajo", "desconocido"
   - El "status" debe ser uno de: "confirmado", "duda"
3. NO cambies la estructura del JSON ni agregues campos nuevos.
4. NO agregues comentarios ni explicaciones, devuelve SOLO el JSON corregido.
5. Si el JSON ya está bien formado, devuélvelo igual.
6. Mantén los arrays vacíos como están (p.ej., "alternatives": []).
7. El JSON DEBE ser un array válido que comience con [ y termine con ].

Devuelve EXCLUSIVAMENTE el JSON corregido, sin explicaciones ni marcadores adicionales.`;

export const DEFAULT_ANALYSIS_PROMPT = `Analiza el siguiente mensaje y detecta los pedidos que se solicitan. El mensaje puede ser informal y contener múltiples pedidos de diferentes clientes.

CONTEXTO (productos y clientes existentes en la base de datos):

PRODUCTOS:
{productsContext}

CLIENTES:
{clientsContext}

MENSAJE A ANALIZAR:
"{messageText}"

Analiza el mensaje y devuelve un array JSON con la siguiente estructura exacta. El JSON debe contener todos los pedidos identificados, separados por cliente. Si un mismo cliente hace múltiples pedidos, agrúpalos en una sola entrada.

IMPORTANTE:
- El resultado DEBE ser un array JSON válido y bien formado.
- NO incluyas explicaciones adicionales, código markdown, ni nada fuera del JSON.
- Si no puedes identificar algún cliente o producto, marca su ID como null.
- Si hay ambigüedad o falta claridad en algún ítem, marca su estado como "duda".
- Para clientes no reconocidos claramente, usa matchConfidence "bajo" o "desconocido".

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
          "name": "Nombre de producto identificado"
        },
        "quantity": 1,
        "variant": {
          "id": "ID de la variante o null",
          "name": "Nombre de la variante"
        },
        "status": "confirmado|duda",
        "alternatives": [],
        "notes": "Notas o dudas específicas de este ítem"
      }
    ],
    "unmatchedText": "Texto que no pudiste asociar a ningún cliente o producto"
  }
]`;

let currentAnalysisPrompt = DEFAULT_ANALYSIS_PROMPT;
let useNewTwoPhasesAnalysis = true; // Activamos por defecto el análisis en dos fases

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

export const setUseTwoPhasesAnalysis = (useIt: boolean) => {
  useNewTwoPhasesAnalysis = useIt;
};

export const getUseTwoPhasesAnalysis = () => {
  return useNewTwoPhasesAnalysis;
};

/**
 * Función para realizar peticiones a la API de Cohere
 */
export const callCohereAPI = async (prompt: string): Promise<string> => {
  if (!COHERE_API_KEY) {
    logError("API", "API Key de Cohere no configurada");
    throw new GeminiError("API Key de Cohere no configurada");
  }

  try {
    // Usar endpoint desde la configuración
    const endpoint = COHERE_ENDPOINT || "https://api.cohere.ai/v1/chat";
    
    logDebug("API", `Enviando petición a Cohere API: ${prompt.substring(0, 100)}...`);
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
          max_tokens: 4096,
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

/**
 * Función para realizar peticiones a la API de Google Gemini
 */
export const callGoogleGeminiAPI = async (prompt: string): Promise<string> => {
  if (!GOOGLE_API_KEY) {
    logError("API", "API Key de Google Gemini no configurada");
    throw new GeminiError("API Key de Google Gemini no configurada");
  }

  try {
    // Construir el endpoint completo con el modelo seleccionado
    const endpoint = `${GOOGLE_GEMINI_ENDPOINT}/${currentGeminiModel}:generateContent?key=${GOOGLE_API_KEY}`;
    
    logDebug("API", `Enviando petición a Google Gemini API: ${prompt.substring(0, 100)}...`);
    logDebug("API", `Usando modelo: ${currentGeminiModel}`);
    
    // Solo mostramos la parte inicial de la API key si tiene suficiente longitud
    if (GOOGLE_API_KEY && GOOGLE_API_KEY.length > 10) {
      logDebug("API", `API Key (primeros 10 caracteres): ${GOOGLE_API_KEY.substring(0, 10)}...`);
    } else {
      logDebug("API", "API Key presente pero es demasiado corta para mostrar");
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
    logDebug("API", `Respuesta raw de Google Gemini: ${responseText.substring(0, 200)}...`);
    
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
      logError("API", `Error al parsear respuesta de Google Gemini:`, parseError);
      throw new GeminiError(`Error al parsear respuesta: ${(parseError as Error).message}`, {
        apiResponse: parseError,
        rawJsonResponse: responseText
      });
    }

    logDebug("API", `Respuesta de Google Gemini (resumida): ${JSON.stringify(data).substring(0, 200)}...`);

    if (data.error) {
      logError("API", `Error devuelto por la API de Google Gemini:`, data.error);
      throw new GeminiError(`Error de la API de Google Gemini: ${data.error.message || "Error desconocido"}`, {
        apiResponse: data.error,
        rawJsonResponse: responseText
      });
    }

    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0].text) {
      logError("API", `Respuesta completa con formato incorrecto:`, data);
      throw new GeminiError("Formato de respuesta inesperado de la API de Google Gemini", {
        apiResponse: data,
        rawJsonResponse: responseText
      });
    }

    const resultText = data.candidates[0].content.parts[0].text;
    logDebug("API", `Texto de respuesta: ${resultText.substring(0, 200)}...`);
    
    return resultText;
  } catch (error) {
    if (error instanceof GeminiError) {
      throw error;
    }
    logError("API", `Error inesperado al llamar a Google Gemini API:`, error);
    throw new GeminiError(`Error al conectar con Google Gemini API: ${(error as Error).message}`);
  }
};

/**
 * Función general para realizar peticiones a la API según el proveedor configurado
 */
export const callGeminiAPI = async (prompt: string): Promise<string> => {
  // Determinar qué API usar según la configuración actual
  if (currentApiProvider === "google-gemini") {
    return callGoogleGeminiAPI(prompt);
  } else {
    // Por defecto o si es "cohere", usar Cohere
    return callCohereAPI(prompt);
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

/**
 * Analiza un mensaje en dos fases:
 * 1. Primero hace un análisis general y separación por cliente
 * 2. Luego convierte ese análisis a formato JSON estructurado
 * Si el JSON tiene errores, se utiliza una tercera fase para corregirlo
 */
export const analyzeTwoPhases = async (
  message: string,
  dbContext: any,
  onProgress?: (progress: number, stage?: string) => void
): Promise<{result: MessageAnalysis[], phase1Response: string, phase2Response: string, phase3Response?: string}> => {
  try {
    console.log("Analizando mensaje en dos fases (optimizado)...");
    onProgress?.(10, "Preparando análisis...");
    
    // Preparamos los contextos para los prompts
    const productsContext = dbContext.products.map(p => {
      const variantsText = p.variants && p.variants.length 
        ? `Variantes: ${p.variants.map(v => `${v.name} (ID: ${v.id})`).join(', ')}` 
        : 'Sin variantes';
      
      return `- ${p.name} (ID: ${p.id}), Precio: ${p.price}. ${variantsText}`;
    }).join('\n');
    
    const clientsContext = dbContext.clients.map(c => 
      `- ${c.name} (ID: ${c.id})${c.phone ? `, Teléfono: ${c.phone}` : ''}`
    ).join('\n');
    
    // FASE 1: Análisis inicial y separación por cliente
    console.log("Fase 1: Iniciando análisis preliminar...");
    onProgress?.(30, "Fase 1: Analizando mensaje...");
    
    const phase1Prompt = STEP_ONE_PROMPT
      .replace('{productsContext}', productsContext)
      .replace('{clientsContext}', clientsContext)
      .replace('{messageText}', message);
    
    const phase1Response = await callGeminiAPI(phase1Prompt);
    console.log("Fase 1 completada, análisis inicial obtenido");
    onProgress?.(60, "Fase 2: Estructurando en JSON...");
    
    // FASE 2: Convertir el análisis a JSON estructurado
    console.log("Fase 2: Estructurando respuesta en formato JSON...");
    
    const phase2Prompt = STEP_TWO_PROMPT
      .replace('{analysisText}', phase1Response)
      .replace('{productsContext}', productsContext)
      .replace('{clientsContext}', clientsContext);
    
    const phase2Response = await callGeminiAPI(phase2Prompt);
    onProgress?.(80, "Procesando resultado...");
    
    // Extraer el JSON de la respuesta
    let jsonText = extractJsonFromResponse(phase2Response);
    
    try {
      // Intentamos parsear el JSON directamente
      const parsedResult = JSON.parse(jsonText) as MessageAnalysis[];
      console.log("Análisis en dos fases completado exitosamente. Pedidos identificados:", parsedResult.length);
      
      onProgress?.(100, "Análisis completado");
      
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
        
        return true;
      });
      
      return {
        result: processedResult,
        phase1Response,
        phase2Response: jsonText
      };
    } catch (parseError: any) {
      // Si hay un error en el JSON, usamos la fase 3 para corregirlo
      console.log("Error en el JSON de la fase 2, usando fase 3 para corregir:", parseError.message);
      onProgress?.(85, "Fase 3: Corrigiendo JSON...");
      
      // FASE 3: Validar y corregir el JSON
      const phase3Prompt = STEP_THREE_PROMPT
        .replace('{jsonText}', jsonText);
      
      const phase3Response = await callGeminiAPI(phase3Prompt);
      onProgress?.(95, "Finalizando...");
      
      // Extraer el JSON validado y corregido
      let validatedJsonText = extractJsonFromResponse(phase3Response);
      
      try {
        const parsedResult = JSON.parse(validatedJsonText) as MessageAnalysis[];
        console.log("Análisis con corrección en fase 3 completado. Pedidos identificados:", parsedResult.length);
        
        onProgress?.(100, "Análisis completado");
        
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
          
          return true;
        });
        
        return {
          result: processedResult,
          phase1Response,
          phase2Response: jsonText,
          phase3Response: validatedJsonText
        };
      } catch (finalError: any) {
        console.error("Error persistente en el análisis JSON:", finalError);
        throw new GeminiError(`Error al procesar la respuesta JSON: ${finalError.message}`, {
          apiResponse: finalError,
          rawJsonResponse: validatedJsonText,
          phase1Response,
          phase2Response: jsonText,
          phase3Response: validatedJsonText
        });
      }
    }
  } catch (error) {
    console.error("Error en el análisis de dos fases:", error);
    if (error instanceof GeminiError) {
      throw error;
    }
    throw new GeminiError(`Error en el análisis de dos fases: ${(error as Error).message}`);
  }
};

/**
 * Analiza un mensaje en tres fases:
 * 1. Primero hace un análisis general y separación por cliente
 * 2. Luego convierte ese análisis a formato JSON estructurado
 * 3. Finalmente valida y corrige el JSON para asegurar que esté bien formado
 */
export const analyzeThreePhases = async (
  message: string,
  dbContext: any,
  onProgress?: (progress: number) => void
): Promise<{result: MessageAnalysis[], phase1Response: string, phase2Response: string, phase3Response: string}> => {
  try {
    console.log("Analizando mensaje en tres fases...");
    onProgress?.(10);
    
    // Preparamos los contextos para los prompts
    const productsContext = dbContext.products.map(p => {
      const variantsText = p.variants && p.variants.length 
        ? `Variantes: ${p.variants.map(v => `${v.name} (ID: ${v.id})`).join(', ')}` 
        : 'Sin variantes';
      
      return `- ${p.name} (ID: ${p.id}), Precio: ${p.price}. ${variantsText}`;
    }).join('\n');
    
    const clientsContext = dbContext.clients.map(c => 
      `- ${c.name} (ID: ${c.id})${c.phone ? `, Teléfono: ${c.phone}` : ''}`
    ).join('\n');
    
    // FASE 1: Análisis inicial y separación por cliente
    console.log("Fase 1: Iniciando análisis preliminar...");
    onProgress?.(25);
    
    const phase1Prompt = STEP_ONE_PROMPT
      .replace('{productsContext}', productsContext)
      .replace('{clientsContext}', clientsContext)
      .replace('{messageText}', message);
    
    const phase1Response = await callGeminiAPI(phase1Prompt);
    console.log("Fase 1 completada, análisis inicial obtenido");
    onProgress?.(50);
    
    // FASE 2: Convertir el análisis a JSON estructurado
    console.log("Fase 2: Estructurando respuesta en formato JSON...");
    
    const phase2Prompt = STEP_TWO_PROMPT
      .replace('{analysisText}', phase1Response)
      .replace('{productsContext}', productsContext)
      .replace('{clientsContext}', clientsContext);
    
    const phase2Response = await callGeminiAPI(phase2Prompt);
    onProgress?.(75);
    
    // FASE 3: Validar y corregir el JSON
    console.log("Fase 3: Validando y corrigiendo el JSON...");
    
    // Extraemos el JSON de la respuesta de la fase 2
    let jsonText = extractJsonFromResponse(phase2Response);
    
    const phase3Prompt = STEP_THREE_PROMPT
      .replace('{jsonText}', jsonText);
    
    const phase3Response = await callGeminiAPI(phase3Prompt);
    onProgress?.(90);
    
    // Extraer el JSON validado y corregido
    let validatedJsonText = extractJsonFromResponse(phase3Response);
    
    try {
      const parsedResult = JSON.parse(validatedJsonText) as MessageAnalysis[];
      console.log("Análisis en tres fases completado. Pedidos identificados:", parsedResult.length);
      
      onProgress?.(100);
      
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
        
        return true;
      });
      
      return {
        result: processedResult,
        phase1Response,
        phase2Response: jsonText,
        phase3Response: validatedJsonText
      };
    } catch (parseError: any) {
      console.error("Error al analizar JSON:", parseError);
      console.error("Texto JSON recibido:", validatedJsonText);
      
      throw new GeminiError(`Error al procesar la respuesta JSON: ${parseError.message}`, {
        apiResponse: parseError,
        rawJsonResponse: validatedJsonText,
        phase1Response,
        phase2Response
      });
    }
  } catch (error) {
    console.error("Error en el análisis de tres fases:", error);
    if (error instanceof GeminiError) {
      throw error;
    }
    throw new GeminiError(`Error en el análisis de tres fases: ${(error as Error).message}`);
  }
};

export const analyzeCustomerMessage = async (
  message: string, 
  onProgress?: (progress: number, stage?: string) => void
): Promise<{result: MessageAnalysis[], phase1Response?: string, phase2Response?: string, phase3Response?: string, elapsedTime?: number}> => {
  try {
    console.log("Analizando mensaje...");
    
    // Iniciamos el tiempo de medición
    const startTime = performance.now();
    
    onProgress?.(10, "Iniciando análisis...");
    
    const dbContext = await fetchDatabaseContext();
    onProgress?.(20, "Cargando datos de contexto...");
    
    // Usamos el análisis en dos fases con corrección automática en fase 3 si es necesario
    console.log("Usando el método optimizado de análisis en dos fases con corrección opcional");
    try {
      const twoPhaseResult = await analyzeTwoPhases(message, dbContext, onProgress);
      
      // Calculamos el tiempo transcurrido
      const endTime = performance.now();
      const elapsedTime = endTime - startTime;
      
      return {
        result: twoPhaseResult.result,
        phase1Response: twoPhaseResult.phase1Response,
        phase2Response: twoPhaseResult.phase2Response,
        phase3Response: twoPhaseResult.phase3Response,
        elapsedTime
      };
    } catch (error) {
      console.error("Error en el análisis optimizado, intentando método de reserva:", error);
      
      // Fallback al método de tres fases completo si el optimizado falla
      console.log("Usando método de reserva: análisis en tres fases completo");
      onProgress?.(30, "Usando método alternativo...");
      
      const threePhaseResult = await analyzeThreePhases(message, dbContext, 
        (progress) => onProgress?.(30 + Math.floor(progress * 0.7), "Análisis alternativo en curso..."));
      
      // Calculamos el tiempo transcurrido
      const endTime = performance.now();
      const elapsedTime = endTime - startTime;
      
      return {
        result: threePhaseResult.result,
        phase1Response: threePhaseResult.phase1Response,
        phase2Response: threePhaseResult.phase2Response,
        phase3Response: threePhaseResult.phase3Response,
        elapsedTime
      };
    }
  } catch (error) {
    console.error("Error final en analyzeCustomerMessage:", error);
    onProgress?.(100, "Error en el análisis");
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
