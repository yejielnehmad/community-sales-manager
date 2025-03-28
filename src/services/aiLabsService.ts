
/**
 * Servicios de integración con AI para generación de ejemplos y asistencia
 * v1.0.4
 */
import { 
  setAPIProvider, 
  getCurrentAPIProvider, 
  setCurrentModel, 
  getCurrentModel,
  callAPI
} from "@/services/apiProviders";
import { logDebug, logError, logCardGeneration } from "@/lib/debug-utils";
import { supabase } from "@/lib/supabase";

// ID único para el seguimiento entre renders
let currentGenerationId = '';

/**
 * Obtiene clientes y productos de la base de datos para generar ejemplos
 * @returns Objetos con datos de clientes y productos
 */
const fetchRealDataForExamples = async () => {
  try {
    // Obtener clientes
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, name');
    
    if (clientsError) {
      logError("AI-LABS", "Error al obtener clientes para ejemplos:", clientsError);
      throw new Error(`Error al obtener clientes: ${clientsError.message}`);
    }
    
    // Obtener productos y sus variantes
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, price, description');
    
    if (productsError) {
      logError("AI-LABS", "Error al obtener productos para ejemplos:", productsError);
      throw new Error(`Error al obtener productos: ${productsError.message}`);
    }
    
    // Obtener variantes de productos
    const { data: variants, error: variantsError } = await supabase
      .from('product_variants')
      .select('id, product_id, name, price');
    
    if (variantsError) {
      logError("AI-LABS", "Error al obtener variantes para ejemplos:", variantsError);
      throw new Error(`Error al obtener variantes: ${variantsError.message}`);
    }
    
    // Asociar variantes a sus productos
    const productsWithVariants = products.map(product => {
      const productVariants = variants.filter(v => v.product_id === product.id);
      return {
        ...product,
        variants: productVariants
      };
    });
    
    return { clients, products: productsWithVariants };
  } catch (error) {
    logError("AI-LABS", "Error al obtener datos para ejemplos:", error);
    throw error;
  }
};

/**
 * Genera un mensaje de ejemplo con múltiples pedidos para probar
 * @param numOrders Número de pedidos a generar (por defecto: 5)
 * @param accuracy Precisión de los pedidos (0.0-1.0, donde 1.0 es 100% precisos)
 * @param useRealData Si es true, usa datos reales de la base de datos
 * @returns Mensaje de texto con los pedidos generados
 */
export const generateMultipleExamples = async (
  numOrders: number = 5, 
  accuracy: number = 0.85,
  useRealData: boolean = false
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
    
    emitExampleGenerationEvent(true, useRealData ? "Obteniendo datos reales..." : "Consultando a la IA...", 20);
    
    let realDataContext = "";
    
    // Si usamos datos reales, obtenemos los datos de la base de datos
    if (useRealData) {
      try {
        emitExampleGenerationEvent(true, "Consultando base de datos...", 25);
        const { clients, products } = await fetchRealDataForExamples();
        
        if (clients.length === 0 || products.length === 0) {
          logError("AI-LABS", "No hay suficientes datos para generar ejemplos realistas");
          throw new Error("No hay suficientes clientes o productos en la base de datos para generar ejemplos realistas");
        }
        
        // Limitar a 7 clientes como máximo para el ejemplo (o menos si no hay suficientes)
        const clientsToUse = clients.slice(0, Math.min(7, clients.length));
        
        // Filtrar productos que tienen variantes
        const productsWithVariants = products.filter(p => p.variants && p.variants.length > 0);
        
        // Asegurar que tenemos suficientes productos con variantes
        if (productsWithVariants.length < 3) {
          logError("AI-LABS", "No hay suficientes productos con variantes");
          throw new Error("No hay suficientes productos con variantes en la base de datos para generar ejemplos realistas");
        }
        
        // Preparar contexto para la IA
        realDataContext = `
CLIENTES REALES (usar exactamente estos nombres):
${clientsToUse.map(c => `- ${c.name} (ID: ${c.id})`).join('\n')}

PRODUCTOS REALES (usar exactamente estos nombres y variantes):
${products.map(p => {
  const variantsText = p.variants && p.variants.length > 0
    ? `\n  Variantes: ${p.variants.map(v => `${v.name}`).join(', ')}`
    : '';
  return `- ${p.name} (ID: ${p.id})${variantsText}`;
}).join('\n')}
`;
        
        emitExampleGenerationEvent(true, "Datos obtenidos, generando mensajes...", 35);
        
        logDebug("AI-LABS", "Datos reales obtenidos para ejemplos", { 
          clientsCount: clientsToUse.length, 
          productsCount: products.length,
          productsWithVariantsCount: productsWithVariants.length
        });
      } catch (error) {
        logError("AI-LABS", "Error al obtener datos reales:", error);
        emitExampleGenerationEvent(true, "Error al obtener datos reales, usando datos ficticios...", 30);
        useRealData = false;
      }
    }
    
    emitExampleGenerationEvent(true, "Consultando a la IA...", 40);
    
    // Prompt optimizado para la generación
    const systemMessage = useRealData
      ? `Eres un asistente que ayuda a generar ejemplos realistas de mensajes de clientes para probar un sistema de procesamiento de pedidos.
        Debes generar exactamente ${numOrders} mensajes diferentes, uno por cada cliente, usando ÚNICAMENTE los datos reales proporcionados.
        
        INSTRUCCIONES ESPECÍFICAS:
        1. Genera exactamente ${numOrders} mensajes de clientes diferentes (uno por mensaje).
        2. Cada cliente debe pedir exactamente 2 productos reales del catálogo proporcionado.
        3. Para productos que tienen variantes, SIEMPRE incluye una variante específica en el pedido (por ejemplo: "quiero 2 pañales talla M").
        4. Alrededor del ${accuracy * 100}% de los pedidos deben estar claramente especificados, mientras que el ${confusionPercent}% deben incluir algún error leve como:
           - Errores ortográficos en nombres de productos (como "pañal" en lugar de "pañales")
           - Cantidades expresadas de forma ambigua (como "un par" en vez de "2")
           - Abreviaciones de nombres de productos o variantes
        5. El mensaje debe simular un mensaje real de WhatsApp o chat con lenguaje natural y coloquial.
        6. IMPORTANTE: Solo usa nombres de clientes, productos y variantes de la lista proporcionada, no inventes nuevos.
        
        DATOS REALES A UTILIZAR:
        ${realDataContext}
        
        IMPORTANTE: Devuelve SOLO el texto simulado de los mensajes, sin explicaciones ni encabezados adicionales.`
      
      : `Eres un asistente que ayuda a los desarrolladores a generar ejemplos de mensajes de clientes para probar un sistema de procesamiento de pedidos. 
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
    
    const userMessage = useRealData
      ? `Genera ${numOrders} mensajes simulados de WhatsApp, uno por cada cliente de la lista proporcionada, usando EXCLUSIVAMENTE los datos reales. Cada cliente debe pedir exactamente 2 productos, y si tienen variantes, especifica qué variante quieren.`
      
      : `Genera un ejemplo de mensaje de WhatsApp con exactamente ${numOrders} pedidos de clientes diferentes. 
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
          accuracy: accuracy * 100,
          useRealData
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
