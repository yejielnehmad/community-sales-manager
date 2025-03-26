
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

/**
 * Función para realizar peticiones a la API de Google Gemini
 */
export const callGeminiAPI = async (prompt: string): Promise<string> => {
  if (!GOOGLE_API_KEY) {
    throw new GeminiError("API Key de Google Gemini no configurada");
  }

  try {
    console.log("Enviando petición a Gemini API v1.0.10:", prompt.substring(0, 100) + "...");
    
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

    const variantToProductMap = {};
    dbContext.products.forEach(product => {
      if (product.variants && product.variants.length) {
        product.variants.forEach(variant => {
          variantToProductMap[variant.name.toLowerCase()] = {
            productId: product.id,
            productName: product.name,
            variantId: variant.id,
            variantName: variant.name
          };
        });
      }
    });

    const prompt = `
    Analiza este mensaje de un cliente o varios clientes y extrae pedidos. Cada línea puede ser un pedido distinto.
    Múltiples mensajes deben ser tratados como pedidos separados.
    
    CONTEXTO (productos y clientes existentes en la base de datos):
    
    PRODUCTOS:
    ${productsContext}
    
    CLIENTES:
    ${clientsContext}
    
    INSTRUCCIONES:
    1. SIEMPRE debes devolver tarjetas de pedidos, incluso si la información está incompleta.
    2. Identifica el cliente para cada pedido. Si no existe exactamente, busca el más similar.
    3. Si un nombre no coincide con ningún cliente en la base de datos y está sin productos asociados, inclúyelo con matchConfidence "desconocido" para que la interfaz lo marque.
    4. Identifica los productos solicitados con cantidades.
    5. Si se menciona una variante específica, asóciala con el producto correspondiente, aunque no se haya mencionado el producto explícitamente.
    6. Si hay ambigüedad, incertidumbre o información faltante (cliente no identificado, producto no identificado, 
       variante no especificada, cantidad no mencionada), marca como "duda".
    7. NO asumas información que no está explícita en el mensaje. Si falta información, marca como "duda".
    8. Las respuestas suelen ser muy cortas y pueden contener: nombre del cliente, cantidad, producto, y a veces una expresión de agradecimiento (esto último ignóralo).
    9. Adapta tu análisis al estilo informal de los mensajes, que pueden estar mal escritos, sin puntuación o con palabras incompletas.
    10. Por ejemplo, mensajes como "shelo 3 maples" o "4 pavita para moshi gracias" son muy comunes.
    11. Cada línea del mensaje puede referirse a un pedido diferente de un cliente diferente.
    12. Cuando aparece un nombre que no coincide con ningún cliente, evalúa en el contexto si podría ser:
       a) Un cliente no registrado (márquelo con matchConfidence "desconocido")
       b) Un producto mal escrito (intenta asociarlo)
       c) Una parte del mensaje sin relevancia
    13. IMPORTANTE: Para evitar problemas de formato JSON, asegúrate de que el JSON que generes no tenga caracteres adicionales o comillas sin escapar correctamente.
       
    Mensaje del cliente a analizar: "${message}"
    
    Responde SOLAMENTE en formato JSON con esta estructura exacta, sin comillas extra ni caracteres especiales:
    [
      {
        "client": {
          "id": "ID del cliente si lo encontraste exactamente",
          "name": "Nombre del cliente",
          "matchConfidence": "alto|medio|bajo|desconocido"
        },
        "items": [
          {
            "product": {
              "id": "ID del producto si lo encontraste exactamente",
              "name": "Nombre del producto"
            },
            "quantity": número,
            "variant": {
              "id": "ID de la variante si la encontraste exactamente",
              "name": "Nombre de la variante"
            },
            "status": "confirmado|duda",
            "alternatives": [
              {
                "id": "ID de la alternativa",
                "name": "Nombre de la alternativa"
              }
            ],
            "notes": "Notas o dudas sobre este ítem"
          }
        ],
        "pickupLocation": "Ubicación de recogida si se menciona"
      }
    ]
    `;

    const responseText = await callGeminiAPI(prompt);
    
    let jsonText = responseText.trim();
    // Limpiar la respuesta de posibles códigos de markdown
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.replace(/```json\n/, "").replace(/\n```$/, "");
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/```\n/, "").replace(/\n```$/, "");
    }

    try {
      // Mejora al procesamiento de JSON: limpieza más agresiva de caracteres problemáticos
      jsonText = jsonText.replace(/,\s*]/g, ']'); // Eliminar comas finales en arrays
      jsonText = jsonText.replace(/,\s*}/g, '}'); // Eliminar comas finales en objetos
      
      // Limpiar comillas mal formateadas o extra
      jsonText = jsonText.replace(/"([^"]*?)(?=[,}])/g, (match) => {
        if (!match.endsWith('"')) {
          return match + '"';
        }
        return match;
      });
      
      // Eliminar caracteres de control y espacios dentro de strings que no deberían tenerlos
      jsonText = jsonText.replace(/"([^"]*)"/g, (match, p1) => {
        const cleaned = p1.replace(/[\n\r\t]+/g, ' ').trim();
        return `"${cleaned}"`;
      });
      
      // Corregir comillas extras al inicio y final de valores
      jsonText = jsonText.replace(/""([^"]*)""/g, '"$1"');
      
      // Eliminar caracteres extraños que puedan haberse colado
      jsonText = jsonText.replace(/[^\x20-\x7E]+/g, '');
      
      // Corregir problemas con números seguidos de comillas
      jsonText = jsonText.replace(/(\d+)"/g, '$1');
      
      // Corregir problemas con null seguidos de comillas
      jsonText = jsonText.replace(/null"/g, 'null');
      
      console.log("JSON limpiado:", jsonText.substring(0, 200) + "...");
      
      const parsedResult = JSON.parse(jsonText) as MessageAnalysis[];
      console.log("Análisis completado. Pedidos identificados:", parsedResult.length);
      
      if (!Array.isArray(parsedResult)) {
        throw new GeminiError("El formato de los datos analizados no es válido (no es un array)", {
          apiResponse: jsonText
        });
      }
      
      const processedResult = parsedResult.filter(result => {
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
      console.error("Error al analizar JSON:", parseError, "Texto recibido:", jsonText);
      
      // Mostrar información detallada para ayudar a depurar
      const errorPosition = parseError.message.match(/position (\d+)/);
      let errorContext = "";
      
      if (errorPosition && errorPosition[1]) {
        const pos = parseInt(errorPosition[1]);
        const start = Math.max(0, pos - 30);
        const end = Math.min(jsonText.length, pos + 30);
        errorContext = `Contexto del error: "${jsonText.substring(start, pos)}[ERROR AQUÍ]${jsonText.substring(pos, end)}"`;
      }
      
      throw new GeminiError(`Error al procesar la respuesta JSON: ${parseError.message}. ${errorContext}`, {
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
