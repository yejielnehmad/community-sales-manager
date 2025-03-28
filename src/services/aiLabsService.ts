
/**
 * Servicios de integración con AI para generación de ejemplos y asistencia
 * v1.0.3
 */
import { 
  setAPIProvider, 
  getCurrentAPIProvider, 
  setCurrentModel, 
  getCurrentModel,
  callAPI
} from "@/services/apiProviders";
import { logDebug, logError, logCardGeneration } from "@/lib/debug-utils";

// ID único para el seguimiento entre renders
let currentGenerationId = '';

/**
 * Genera un mensaje de ejemplo con múltiples pedidos para probar
 * @param numOrders Número de pedidos a generar (por defecto: 5)
 * @param accuracy Precisión de los pedidos (0.0-1.0, donde 1.0 es 100% precisos)
 * @returns Mensaje de texto con los pedidos generados
 */
export const generateMultipleExamples = async (
  numOrders: number = 5, 
  accuracy: number = 0.85
): Promise<string> => {
  try {
    if (!currentGenerationId) {
      currentGenerationId = `gen_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    }
    
    // Emitir evento de inicio de generación
    emitExampleGenerationEvent(true, "Preparando generación...", 10);
    
    // Guarda el proveedor actual para restaurarlo después
    const currentProvider = getCurrentAPIProvider();
    const currentModelName = getCurrentModel();
    
    // Calculamos el porcentaje de pedidos confusos
    const confusionPercent = (1 - accuracy) * 100;
    
    // Establecemos Google Gemini para la generación
    setAPIProvider("google-gemini");
    setCurrentModel("gemini-2.0-flash");
    
    logDebug("AI-LABS", `Generando ejemplos con ${numOrders} pedidos usando ${getCurrentModel()} (precisión: ${accuracy * 100}%)`);
    
    emitExampleGenerationEvent(true, "Consultando a la IA...", 30);
    
    // Prompt optimizado para la generación
    const systemMessage = `Eres un asistente que ayuda a los desarrolladores a generar ejemplos de mensajes de clientes para probar un sistema de procesamiento de pedidos. 
        Debes generar mensajes que parezcan reales con las siguientes características:
        
        1. Incluye exactamente ${numOrders} pedidos diferentes.
        2. Alrededor del ${accuracy * 100}% de los pedidos deben estar claramente especificados (nombre del cliente y productos con cantidades), mientras que el ${confusionPercent}% deben ser ambiguos o confusos (faltar datos, expresiones poco claras, errores).
        3. Los pedidos deben ser variados, pueden repetirse algunos clientes.
        4. Incluye variaciones en la forma de expresar cantidades (números, texto).
        5. El mensaje debe simularse como si fuera un mensaje de WhatsApp o chat normal.
        
        Solo genera el texto del mensaje, sin ninguna explicación adicional ni formato.
        
        IMPORTANTE: Debes responder únicamente con el mensaje de texto simulado, sin ningún otro contenido.
        No incluyas explicaciones, marcado ni estructura formal como lista numerada o con viñetas. 
        El resultado debe ser un mensaje de chat simple como lo escribiría un cliente real.`;
    
    const userMessage = `Genera un ejemplo de mensaje de WhatsApp con exactamente ${numOrders} pedidos de clientes diferentes. 
        Asegúrate de que el formato sea similar a un mensaje real de WhatsApp (sin estructura formal, sin numeración).
        Usa nombres comunes de clientes (Juan, María, Pedro, etc.) y productos típicos (pañales, agua, leche, pan, etc.)`;
    
    // Consulta a la API
    try {
      const startTime = performance.now();
      
      // Utilizamos un formato directo para evitar problemas con la estructura
      const combinedPrompt = `${systemMessage}\n\n${userMessage}`;
      const response = await callAPI(combinedPrompt);
      
      const endTime = performance.now();
      const processingTime = (endTime - startTime) / 1000; // en segundos
      
      emitExampleGenerationEvent(true, "Procesando respuesta...", 70);
      
      // Retornamos el ejemplo generado
      if (response) {
        // Registro de finalización exitosa
        logCardGeneration(currentGenerationId, 'completed', { 
          processingTime,
          ordersCount: numOrders,
          accuracy: accuracy * 100
        });
        
        // Emitir evento de finalización exitosa
        emitExampleGenerationEvent(false, "Ejemplo generado correctamente", 100);
        
        // Restauramos el proveedor original
        setAPIProvider(currentProvider);
        setCurrentModel(currentModelName);
        
        // Limpiamos el ID para la próxima generación
        currentGenerationId = '';
        
        return response;
      } else {
        throw new Error("No se obtuvo respuesta de la API");
      }
    } catch (error: any) {
      // Error específico de la API
      logError("AI-LABS", "Error de API:", error);
      
      // Registrar el error
      logCardGeneration(currentGenerationId, 'error', { 
        error: error?.message || "Error desconocido",
        errorDetails: error
      });
      
      // Emitir evento de error
      emitExampleGenerationEvent(false, "Error al conectar con la API", 0, error?.message || "Error desconocido");
      
      // Restauramos el proveedor original
      setAPIProvider(currentProvider);
      setCurrentModel(currentModelName);
      
      // Limpiamos el ID para la próxima generación
      currentGenerationId = '';
      
      // Devolvemos un mensaje de error descriptivo
      return `Error al generar ejemplos: ${error?.message || "Error desconocido"}. Por favor, intenta nuevamente.`;
    }
  } catch (error: any) {
    // Error general en la función
    logError("AI-LABS", "Error al generar ejemplos:", error);
    
    // Registrar el error
    if (currentGenerationId) {
      logCardGeneration(currentGenerationId, 'error', { 
        error: error?.message || "Error desconocido",
        errorType: 'general_error'
      });
    }
    
    // Emitir evento de error
    emitExampleGenerationEvent(false, "Error al generar ejemplos", 0, error?.message || "Error desconocido");
    
    // Limpiamos el ID para la próxima generación
    currentGenerationId = '';
    
    // Devolvemos un mensaje de error
    return `Error al generar ejemplos: ${error?.message || "Error desconocido"}. Por favor, intenta nuevamente.`;
  }
};

/**
 * Emite un evento personalizado para informar sobre el estado de la generación de ejemplos
 */
const emitExampleGenerationEvent = (
  isGenerating: boolean, 
  stage: string = "", 
  progress: number = 0,
  error: string | null = null
): void => {
  const event = new CustomEvent('exampleGenerationStateChange', {
    detail: { 
      isGenerating, 
      stage, 
      progress,
      error 
    }
  });
  
  window.dispatchEvent(event);
  
  logDebug("AI-LABS", `Evento de generación de ejemplos detectado: ${isGenerating ? 'Generando' : 'Finalizado'} ${stage}`);
};

/**
 * Comprueba la conectividad con las APIs de AI
 * @returns Objeto con el estado de conexión para cada proveedor
 */
export const checkAIConnectivity = async (): Promise<Record<string, boolean>> => {
  const results: Record<string, boolean> = {
    "google-gemini": false,
    "cohere": false
  };
  
  // Comprobar Google Gemini
  try {
    // Guarda el proveedor actual
    const currentProvider = getCurrentAPIProvider();
    const currentModel = getCurrentModel();
    
    // Configura para usar Gemini
    setAPIProvider("google-gemini");
    setCurrentModel("gemini-2.0-flash");
    
    // Usa un prompt simple para probar la conexión
    const testResponse = await callAPI("Responde solo con la palabra 'ok' si la conexión está funcionando");
    
    // Si llegamos aquí, la conexión funciona
    results["google-gemini"] = testResponse.toLowerCase().includes("ok");
    
    // Restaura el proveedor original
    setAPIProvider(currentProvider);
    setCurrentModel(currentModel);
  } catch (error) {
    logError("AI-LABS", "Error al comprobar conectividad con Gemini:", error);
    results["google-gemini"] = false;
  }
  
  // Aquí se podría añadir la comprobación para Cohere si es necesario
  
  return results;
};

// Re-exportamos las funciones principales
export { callAPI, setAPIProvider, getCurrentAPIProvider, setCurrentModel, getCurrentModel };
