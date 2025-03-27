
import { GOOGLE_API_KEY } from "@/lib/api-config";
import { MessageAnalysis, Product } from "@/types";
import { supabase } from "@/lib/supabase";

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
 * Función para realizar peticiones a la API de Google Gemini
 */
export const callGeminiAPI = async (prompt: string): Promise<string> => {
  if (!GOOGLE_API_KEY) {
    throw new GeminiError("API Key de Google Gemini no configurada");
  }

  try {
    console.log("Enviando petición a Gemini API v1.0.12:", prompt.substring(0, 100) + "...");
    
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

    if (data.error) {
      console.error("Error devuelto por la API de Gemini:", data.error);
      throw new GeminiError(`Error de la API de Gemini: ${data.error.message || "Error desconocido"}`, {
        apiResponse: data.error
      });
    }

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
        let jsonText = extractJsonFromResponse(responseText);
        
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
          
          // Si no es el último intento, intentamos de nuevo
          if (attempts < maxAttempts) {
            console.log("Reintentando análisis con formato mejorado...");
            continue;
          }
          
          throw new GeminiError(`Error al procesar la respuesta JSON: ${parseError.message}`, {
            apiResponse: jsonText
          });
        }
      } catch (attemptError) {
        // Si es el último intento, propagamos el error
        if (attempts >= maxAttempts) {
          throw attemptError;
        }
        
        console.log(`Error en intento #${attempts}, reintentando...`, attemptError);
        // Esperar un segundo antes de reintentar
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Este código no debería ejecutarse, pero por si acaso
    throw new GeminiError("Error al analizar el mensaje después de múltiples intentos");
    
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
