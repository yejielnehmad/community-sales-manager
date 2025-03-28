
/**
 * Servicio para análisis de mensajes utilizando IA
 * v1.0.6
 */
import { MessageAnalysis } from "@/types";
import { logDebug, logError } from "@/lib/debug-utils";
import { callAPI } from "./apiProviders";
import { extractJsonFromResponse } from "./utils/jsonUtils";

// Prompt por defecto para análisis de mensajes
export const DEFAULT_ANALYSIS_PROMPT = `Eres un asistente experto en analizar mensajes de clientes y extraer información de pedidos en un formato estructurado JSON. Tu tarea es identificar productos, cantidades, variantes y cliente en el siguiente mensaje. Usa exactamente los nombres de productos y clientes que te proporcionaré como contexto. 

CONTEXTO DE PRODUCTOS:
{productsContext}

CONTEXTO DE CLIENTES:
{clientsContext}

MENSAJE A ANALIZAR:
{messageText}

INSTRUCCIONES:
1. Analiza cuidadosamente el mensaje.
2. Identifica qué cliente está haciendo el pedido (usa los datos del contexto).
3. Extrae los productos solicitados, cantidades y variantes si se mencionan.
4. Devuelve los resultados en formato JSON según el esquema proporcionado.

Para la identificación de cliente:
- Busca coincidencias exactas o parciales con nombres en el contexto.
- Si hay múltiples coincidencias posibles, selecciona la más probable.
- Indica tu nivel de confianza como "alto", "medio" o "bajo".

Para productos:
- Identifica los nombres de productos del contexto mencionados en el mensaje.
- Determina cantidades (por defecto 1 si no se especifica).
- Identifica variantes si se mencionan.
- Marca estado como "duda" si hay información ambigua o "confirmado" si es clara.
- Incluye notas explicativas si es necesario.

Si no hay suficiente información para crear un pedido completo, haz tu mejor esfuerzo e indica las dudas.

ESQUEMA JSON REQUERIDO:
[{
  "client": {
    "id": string | null,
    "name": string,
    "matchConfidence": "alto" | "medio" | "bajo"
  },
  "items": [{
    "product": {
      "id": string | null,
      "name": string
    },
    "variant": {
      "id": string | null,
      "name": string
    } | null,
    "quantity": number,
    "status": "confirmado" | "duda",
    "notes": string
  }]
}]

IMPORTANTE:
- Devuelve SOLO el JSON válido sin ningún otro texto o explicación.
- Utiliza null cuando no puedas identificar un ID.
- Crea un objeto de pedido para cada cliente detectado en el mensaje.
- No inventes productos o clientes que no estén en el contexto.
- Si un producto tiene variantes y no se especifica, marca como "duda" e indica las variantes disponibles.
- El JSON debe ser válido y seguir estrictamente el esquema proporcionado.
`;

// Variable para almacenar el prompt personalizado
let customAnalysisPrompt: string | null = null;

// Clase para errores específicos de análisis de mensajes
export class MessageAnalysisError extends Error {
  public rawJsonResponse?: string;
  public phase1Response?: string;
  
  constructor(message: string, options?: { rawJsonResponse?: string, phase1Response?: string }) {
    super(message);
    this.name = "MessageAnalysisError";
    this.rawJsonResponse = options?.rawJsonResponse;
    this.phase1Response = options?.phase1Response;
  }
}

// Obtener el prompt actual (default o personalizado)
export const getCurrentAnalysisPrompt = (): string => {
  return customAnalysisPrompt || DEFAULT_ANALYSIS_PROMPT;
};

// Establecer un prompt personalizado
export const setCustomAnalysisPrompt = (prompt: string): void => {
  if (!prompt || prompt.trim().length === 0) {
    throw new Error("El prompt no puede estar vacío");
  }
  
  // Verificar que el prompt incluye las variables necesarias
  const requiredVariables = ['{productsContext}', '{clientsContext}', '{messageText}'];
  const missingVariables = requiredVariables.filter(variable => !prompt.includes(variable));
  
  if (missingVariables.length > 0) {
    throw new Error(`El prompt debe incluir las variables: ${missingVariables.join(', ')}`);
  }
  
  customAnalysisPrompt = prompt;
  localStorage.setItem('customAnalysisPrompt', prompt);
  
  logDebug("AnalysisService", "Prompt personalizado establecido");
};

// Resetear al prompt por defecto
export const resetAnalysisPrompt = (): void => {
  customAnalysisPrompt = null;
  localStorage.removeItem('customAnalysisPrompt');
  logDebug("AnalysisService", "Prompt restablecido al valor predeterminado");
};

// Cargar prompt personalizado desde localStorage al iniciar
export const loadCustomPromptFromStorage = (): void => {
  try {
    const storedPrompt = localStorage.getItem('customAnalysisPrompt');
    if (storedPrompt) {
      customAnalysisPrompt = storedPrompt;
      logDebug("AnalysisService", "Prompt personalizado cargado desde localStorage");
    }
  } catch (error) {
    logError("AnalysisService", "Error al cargar prompt desde localStorage", error);
  }
};

// Inicialización - cargar prompt personalizado si existe
loadCustomPromptFromStorage();

// Función principal para analizar mensajes
export const analyzeCustomerMessage = async (
  messageText: string,
  onProgress?: (progress: number, stage?: string) => void,
  signal?: AbortSignal
): Promise<{result: MessageAnalysis[], phase1Response?: string, phase2Response?: string, phase3Response?: string, elapsedTime?: number}> => {
  // Fase 1: Obtener contexto y preparar prompt
  onProgress?.(20, "Preparando análisis...");
  
  try {
    // Obtener contexto de productos y clientes desde localStorage
    const productsData = localStorage.getItem('magicOrder_products');
    const clientsData = localStorage.getItem('magicOrder_clients');
    
    const products = productsData ? JSON.parse(productsData) : [];
    const clients = clientsData ? JSON.parse(clientsData) : [];
    
    // Formatear productos para el contexto
    const productsContext = products.map((p: any) => {
      const variantsText = p.variants && p.variants.length > 0
        ? `Variantes: ${p.variants.map((v: any) => `${v.name} (ID: ${v.id})`).join(', ')}`
        : 'Sin variantes';
      
      return `Producto: ${p.name} (ID: ${p.id}). ${variantsText}`;
    }).join('\n');
    
    // Formatear clientes para el contexto
    const clientsContext = clients.map((c: any) => 
      `Cliente: ${c.name} (ID: ${c.id})${c.phone ? `, Teléfono: ${c.phone}` : ''}`
    ).join('\n');
    
    // Verificar si la operación fue cancelada
    if (signal?.aborted) {
      throw new Error("Análisis cancelado por el usuario");
    }
    
    // Preparar prompt completo
    const promptTemplate = getCurrentAnalysisPrompt();
    const prompt = promptTemplate
      .replace('{productsContext}', productsContext || 'No hay productos registrados')
      .replace('{clientsContext}', clientsContext || 'No hay clientes registrados')
      .replace('{messageText}', messageText);
    
    onProgress?.(30, "Analizando mensaje...");
    
    // Fase 1: Análisis inicial del mensaje
    logDebug("AnalysisService", "Iniciando análisis de mensaje", { messageLength: messageText.length });
    
    // Limpiar cualquier caché que pudiera existir para este mensaje
    sessionStorage.removeItem('magicOrder_analysis_cache');
    const phase1Response = await callAPI(prompt);
    
    // Verificar si la operación fue cancelada
    if (signal?.aborted) {
      throw new Error("Análisis cancelado por el usuario");
    }
    
    onProgress?.(60, "Procesando resultados...");
    
    // Fase 2: Extracción de JSON válido de la respuesta
    let jsonResult: MessageAnalysis[] = [];
    let extractedJson = '';
    
    try {
      extractedJson = extractJsonFromResponse(phase1Response);
      jsonResult = JSON.parse(extractedJson) as MessageAnalysis[];
      
      // Verificar estructura básica del JSON
      if (!Array.isArray(jsonResult)) {
        throw new Error("El resultado no es un array");
      }
      
      logDebug("AnalysisService", "JSON extraído correctamente", {
        resultCount: jsonResult.length
      });
    } catch (error) {
      logError("AnalysisService", "Error al procesar JSON de respuesta", error);
      throw new MessageAnalysisError(
        "No se pudo procesar la respuesta de la IA. El formato JSON no es válido.", 
        { rawJsonResponse: extractedJson, phase1Response }
      );
    }
    
    // Fase 3: Validación y corrección
    onProgress?.(80, "Validando resultados...");
    
    // Validación básica de resultados
    const validatedResults = jsonResult.map((order) => {
      // Asegurar que client existe
      if (!order.client) {
        order.client = {
          id: null,
          name: "Cliente desconocido",
          matchConfidence: "bajo"
        };
      }
      
      // Asegurar que items es un array
      if (!order.items || !Array.isArray(order.items)) {
        order.items = [];
      }
      
      // Validar cada item
      order.items = order.items.map(item => {
        // Asegurar que product existe
        if (!item.product) {
          item.product = {
            id: null,
            name: "Producto desconocido"
          };
        }
        
        // Asegurar quantity
        if (typeof item.quantity !== 'number' || item.quantity <= 0) {
          item.quantity = 1;
          item.status = "duda";
          item.notes = `${item.notes || ''} Cantidad no especificada, se asume 1.`.trim();
        }
        
        // Asegurar status
        if (!item.status || !['confirmado', 'duda'].includes(item.status)) {
          item.status = "duda";
        }
        
        // Asegurar notes
        if (!item.notes) {
          item.notes = "";
        }
        
        return item;
      });
      
      return order;
    });
    
    // Generar respuesta para fase 3 (validación)
    const phase3Response = JSON.stringify(validatedResults, null, 2);
    
    onProgress?.(100, "¡Análisis completado!");
    
    logDebug("AnalysisService", "Análisis completado con éxito", {
      ordersCount: validatedResults.length,
      itemsCount: validatedResults.reduce((acc, order) => acc + order.items.length, 0)
    });
    
    return {
      result: validatedResults,
      phase1Response,
      phase2Response: extractedJson,
      phase3Response
    };
  } catch (error) {
    logError("AnalysisService", "Error en el proceso de análisis", error);
    
    if (error instanceof MessageAnalysisError) {
      throw error;
    }
    
    throw new MessageAnalysisError(
      `Error al analizar el mensaje: ${(error as Error).message}`,
      { phase1Response: (error as any).phase1Response }
    );
  }
};
