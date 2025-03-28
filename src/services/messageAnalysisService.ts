
/**
 * Servicio para análisis de mensajes
 * v1.0.0
 */
import { MessageAnalysis } from "@/types";
import { 
  callAPI, 
  getCurrentAPIProvider, 
  getCurrentModel
} from "./apiProviders";
import { supabase } from "@/lib/supabase";
import { logDebug, logError } from "@/lib/debug-utils";
import { 
  STEP_ONE_PROMPT, 
  STEP_TWO_PROMPT, 
  STEP_THREE_PROMPT,
  getUseTwoPhasesAnalysis 
} from "./prompts/analysisPrompts";
import { extractJsonFromResponse, tryParseJson } from "./utils/jsonUtils";
import { BaseAPIError } from "./apiProviders/baseAPIProvider";

/**
 * Error específico del análisis de mensajes
 */
export class MessageAnalysisError extends BaseAPIError {
  constructor(message: string, details?: { 
    status?: number, 
    statusText?: string, 
    apiResponse?: any,
    rawJsonResponse?: string,
    phase1Response?: string,
    phase2Response?: string,
    phase3Response?: string
  }) {
    super(message, details);
    this.name = "MessageAnalysisError";
  }
}

/**
 * Obtiene el contexto de la base de datos para el análisis
 */
export const fetchDatabaseContext = async () => {
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, name, price, description');
  
  if (productsError) {
    logError("Database", "Error al obtener productos:", productsError);
    throw new Error(`Error al obtener productos: ${productsError.message}`);
  }

  const { data: variants, error: variantsError } = await supabase
    .from('product_variants')
    .select('id, product_id, name, price');
  
  if (variantsError) {
    logError("Database", "Error al obtener variantes:", variantsError);
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
    logError("Database", "Error al obtener clientes:", clientsError);
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
    logDebug("Analysis", "Analizando mensaje en dos fases (optimizado)...");
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
    logDebug("Analysis", "Fase 1: Iniciando análisis preliminar...");
    onProgress?.(30, "Fase 1: Analizando mensaje...");
    
    const phase1Prompt = STEP_ONE_PROMPT
      .replace('{productsContext}', productsContext)
      .replace('{clientsContext}', clientsContext)
      .replace('{messageText}', message);
    
    const phase1Response = await callAPI(phase1Prompt);
    logDebug("Analysis", "Fase 1 completada, análisis inicial obtenido");
    onProgress?.(60, "Fase 2: Estructurando en JSON...");
    
    // FASE 2: Convertir el análisis a JSON estructurado
    logDebug("Analysis", "Fase 2: Estructurando respuesta en formato JSON...");
    
    const phase2Prompt = STEP_TWO_PROMPT
      .replace('{analysisText}', phase1Response)
      .replace('{productsContext}', productsContext)
      .replace('{clientsContext}', clientsContext);
    
    const phase2Response = await callAPI(phase2Prompt);
    onProgress?.(80, "Procesando resultado...");
    
    // Extraer el JSON de la respuesta
    let jsonText = extractJsonFromResponse(phase2Response);
    
    // Intentamos parsear el JSON directamente
    const parseResult = tryParseJson<MessageAnalysis[]>(jsonText);
    
    if (parseResult.success && parseResult.data) {
      const parsedResult = parseResult.data;
      logDebug("Analysis", `Análisis en dos fases completado exitosamente. Pedidos identificados: ${parsedResult.length}`);
      
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
    } else {
      // Si hay un error en el JSON, usamos la fase 3 para corregirlo
      logDebug("Analysis", `Error en el JSON de la fase 2, usando fase 3 para corregir: ${parseResult.error?.message}`);
      onProgress?.(85, "Fase 3: Corrigiendo JSON...");
      
      // FASE 3: Validar y corregir el JSON
      const phase3Prompt = STEP_THREE_PROMPT
        .replace('{jsonText}', jsonText);
      
      const phase3Response = await callAPI(phase3Prompt);
      onProgress?.(95, "Finalizando...");
      
      // Extraer el JSON validado y corregido
      let validatedJsonText = extractJsonFromResponse(phase3Response);
      
      // Intentamos parsear el JSON corregido
      const finalParseResult = tryParseJson<MessageAnalysis[]>(validatedJsonText);
      
      if (finalParseResult.success && finalParseResult.data) {
        const parsedResult = finalParseResult.data;
        logDebug("Analysis", `Análisis con corrección en fase 3 completado. Pedidos identificados: ${parsedResult.length}`);
        
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
      } else {
        logError("Analysis", "Error persistente en el análisis JSON:", finalParseResult.error);
        throw new MessageAnalysisError(`Error al procesar la respuesta JSON: ${finalParseResult.error?.message}`, {
          apiResponse: finalParseResult.error,
          rawJsonResponse: validatedJsonText,
          phase1Response,
          phase2Response: jsonText,
          phase3Response: validatedJsonText
        });
      }
    }
  } catch (error) {
    logError("Analysis", "Error en el análisis de dos fases:", error);
    if (error instanceof MessageAnalysisError) {
      throw error;
    }
    throw new MessageAnalysisError(`Error en el análisis de dos fases: ${(error as Error).message}`);
  }
};

/**
 * Analiza un mensaje en tres fases completas
 */
export const analyzeThreePhases = async (
  message: string,
  dbContext: any,
  onProgress?: (progress: number) => void
): Promise<{result: MessageAnalysis[], phase1Response: string, phase2Response: string, phase3Response: string}> => {
  try {
    logDebug("Analysis", "Analizando mensaje en tres fases...");
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
    logDebug("Analysis", "Fase 1: Iniciando análisis preliminar...");
    onProgress?.(25);
    
    const phase1Prompt = STEP_ONE_PROMPT
      .replace('{productsContext}', productsContext)
      .replace('{clientsContext}', clientsContext)
      .replace('{messageText}', message);
    
    const phase1Response = await callAPI(phase1Prompt);
    logDebug("Analysis", "Fase 1 completada, análisis inicial obtenido");
    onProgress?.(50);
    
    // FASE 2: Convertir el análisis a JSON estructurado
    logDebug("Analysis", "Fase 2: Estructurando respuesta en formato JSON...");
    
    const phase2Prompt = STEP_TWO_PROMPT
      .replace('{analysisText}', phase1Response)
      .replace('{productsContext}', productsContext)
      .replace('{clientsContext}', clientsContext);
    
    const phase2Response = await callAPI(phase2Prompt);
    onProgress?.(75);
    
    // FASE 3: Validar y corregir el JSON
    logDebug("Analysis", "Fase 3: Validando y corrigiendo el JSON...");
    
    // Extraemos el JSON de la respuesta de la fase 2
    let jsonText = extractJsonFromResponse(phase2Response);
    
    const phase3Prompt = STEP_THREE_PROMPT
      .replace('{jsonText}', jsonText);
    
    const phase3Response = await callAPI(phase3Prompt);
    onProgress?.(90);
    
    // Extraer el JSON validado y corregido
    let validatedJsonText = extractJsonFromResponse(phase3Response);
    
    // Intentamos parsear el JSON final
    const parseResult = tryParseJson<MessageAnalysis[]>(validatedJsonText);
    
    if (parseResult.success && parseResult.data) {
      const parsedResult = parseResult.data;
      logDebug("Analysis", `Análisis en tres fases completado. Pedidos identificados: ${parsedResult.length}`);
      
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
    } else {
      logError("Analysis", "Error al analizar JSON:", parseResult.error);
      logError("Analysis", "Texto JSON recibido:", validatedJsonText);
      
      throw new MessageAnalysisError(`Error al procesar la respuesta JSON: ${parseResult.error?.message}`, {
        apiResponse: parseResult.error,
        rawJsonResponse: validatedJsonText,
        phase1Response,
        phase2Response
      });
    }
  } catch (error) {
    logError("Analysis", "Error en el análisis de tres fases:", error);
    if (error instanceof MessageAnalysisError) {
      throw error;
    }
    throw new MessageAnalysisError(`Error en el análisis de tres fases: ${(error as Error).message}`);
  }
};

/**
 * Función principal para analizar mensajes
 */
export const analyzeCustomerMessage = async (
  message: string, 
  onProgress?: (progress: number, stage?: string) => void
): Promise<{result: MessageAnalysis[], phase1Response?: string, phase2Response?: string, phase3Response?: string, elapsedTime?: number}> => {
  try {
    logDebug("Analysis", "Analizando mensaje...");
    
    // Iniciamos el tiempo de medición
    const startTime = performance.now();
    
    onProgress?.(10, "Iniciando análisis...");
    
    const dbContext = await fetchDatabaseContext();
    onProgress?.(20, "Cargando datos de contexto...");
    
    // Usamos el análisis en dos fases con corrección automática en fase 3 si es necesario
    logDebug("Analysis", "Usando el método optimizado de análisis en dos fases con corrección opcional");
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
      logError("Analysis", "Error en el análisis optimizado, intentando método de reserva:", error);
      
      // Fallback al método de tres fases completo si el optimizado falla
      logDebug("Analysis", "Usando método de reserva: análisis en tres fases completo");
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
    logError("Analysis", "Error final en analyzeCustomerMessage:", error);
    onProgress?.(100, "Error en el análisis");
    if (error instanceof MessageAnalysisError) {
      throw error;
    }
    throw new MessageAnalysisError(`Error al analizar el mensaje: ${(error as Error).message}`);
  }
};
