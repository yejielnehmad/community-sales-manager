
import { supabase } from "@/lib/supabase";
import { 
  GOOGLE_GEMINI_MODELS,
  GOOGLE_GEMINI_ENDPOINT,
  GOOGLE_API_KEY,
  GEMINI_MAX_OUTPUT_TOKENS
} from "@/lib/api-config";
import { setApiProvider, setGeminiModel } from "@/services/geminiService";

// Función para generar ejemplos basados en la base de datos
export const generateMessageExample = async (): Promise<string> => {
  try {
    // Fetch clients from database
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('*');
    
    if (clientsError) throw clientsError;
    
    // Fetch products from database
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*');
    
    if (productsError) throw productsError;
    
    // Fetch product variants from database
    const { data: variants, error: variantsError } = await supabase
      .from('product_variants')
      .select('*');
    
    if (variantsError) throw variantsError;
    
    if (!clients || clients.length === 0 || !products || products.length === 0) {
      return "moshe 3 pañales m, 4 g y cinco latas atún, graciasss";
    }
    
    // Elegir un cliente aleatorio para el mensaje
    const randomClient = clients[Math.floor(Math.random() * clients.length)];
    const clientName = randomClient.name.split(' ')[0].toLowerCase(); // Usar solo el primer nombre en minúsculas
    
    // Construir mensaje con formato informal
    let message = clientName;
    
    // Añadir entre 1 y 6 productos al pedido
    const numProducts = Math.floor(Math.random() * 6) + 1;
    const productsArray = [...products];
    const selectedProducts = [];
    
    for (let i = 0; i < numProducts && productsArray.length > 0; i++) {
      const randomProductIndex = Math.floor(Math.random() * productsArray.length);
      const product = productsArray[randomProductIndex];
      productsArray.splice(randomProductIndex, 1); // Eliminar para evitar duplicados
      
      // Cantidad como número o texto aleatorio
      const quantity = Math.floor(Math.random() * 5) + 1;
      let quantityText = quantity.toString();
      
      // A veces usar texto para las cantidades
      if (Math.random() > 0.7) {
        const textNumbers = ['uno', 'dos', 'tres', 'cuatro', 'cinco'];
        if (quantity <= textNumbers.length) {
          quantityText = textNumbers[quantity - 1];
        }
      }

      // Buscar variantes para este producto
      const productVariants = variants.filter(v => v.product_id === product.id);
      const hasVariant = productVariants.length > 0 && Math.random() > 0.3;
      
      let variant = null;
      if (hasVariant) {
        variant = productVariants[Math.floor(Math.random() * productVariants.length)];
      }
      
      // Determinar tipo de pedido (solo producto, solo variante, o ambos)
      const pedidoType = Math.floor(Math.random() * 3);
      
      let pedidoText = '';
      switch (pedidoType) {
        case 0: // Solo producto
          if (Math.random() > 0.5) {
            pedidoText = `${quantityText} ${product.name.toLowerCase()}`;
          } else {
            pedidoText = `${product.name.toLowerCase()} ${quantityText}`;
          }
          break;
        case 1: // Solo variante (si tiene variante, sino producto)
          if (hasVariant) {
            if (Math.random() > 0.5) {
              pedidoText = `${quantityText} ${variant.name.toLowerCase()}`;
            } else {
              pedidoText = `${variant.name.toLowerCase()} ${quantityText}`;
            }
          } else {
            pedidoText = `${quantityText} ${product.name.toLowerCase()}`;
          }
          break;
        case 2: // Producto y variante
          if (hasVariant) {
            if (Math.random() > 0.5) {
              pedidoText = `${quantityText} ${product.name.toLowerCase()} ${variant.name.toLowerCase()}`;
            } else {
              pedidoText = `${quantityText} ${variant.name.toLowerCase()} de ${product.name.toLowerCase()}`;
            }
            // A veces invertir el orden
            if (Math.random() > 0.7) {
              const parts = pedidoText.split(' ');
              const reordered = [parts[0], ...parts.slice(2), parts[1]].join(' ');
              pedidoText = reordered;
            }
          } else {
            pedidoText = `${quantityText} ${product.name.toLowerCase()}`;
          }
          break;
      }
      
      selectedProducts.push(pedidoText);
    }
    
    // Unir productos con separadores aleatorios
    for (let i = 0; i < selectedProducts.length; i++) {
      if (i > 0) {
        const separators = [', ', ' y ', ' también ', ' + ', ' '];
        message += separators[Math.floor(Math.random() * separators.length)];
      } else {
        message += ' ';
      }
      message += selectedProducts[i];
    }
    
    // A veces añadir "gracias" al final
    if (Math.random() > 0.7) {
      const gracias = [' gracias', ' graciasss', ' xfa', ' por favor', ''];
      message += gracias[Math.floor(Math.random() * gracias.length)];
    }
    
    return message;
  } catch (error) {
    console.error("Error al generar ejemplo:", error);
    return "moshe 3 pañales m, 4 g y cinco latas atún, graciasss";
  }
};

// Función para generar múltiples mensajes de ejemplo con diferentes clientes y productos
export const generateMultipleExamples = async (orderCount: number = 15, precisionRate: number = 0.85): Promise<string> => {
  // Generar ejemplos de mensajes con IA usando el servicio gemini
  try {
    // Configuramos el proveedor y modelo antes de usar el servicio
    setApiProvider("google-gemini");
    const geminiModel = GOOGLE_GEMINI_MODELS.GEMINI_FLASH_2;
    setGeminiModel(geminiModel);
    
    console.log(`Generando ejemplos con ${orderCount} pedidos usando ${geminiModel} (precisión: ${precisionRate * 100}%)`);
    
    // Notificamos que estamos generando ejemplos mediante un evento personalizado
    const startEvent = new CustomEvent('exampleGenerationStateChange', {
      detail: { 
        isGenerating: true,
        stage: "Generando ejemplos...",
        progress: 10
      }
    });
    window.dispatchEvent(startEvent);
    
    // Usamos el servicio predeterminado de gemini para la generación
    const messages = [
      {
        role: "system",
        content: `Eres un asistente que ayuda a los desarrolladores a generar ejemplos de mensajes de clientes para probar un sistema de procesamiento de pedidos. 
        Debes generar mensajes que parezcan reales con las siguientes características:
        
        1. Incluye aproximadamente ${orderCount} pedidos diferentes.
        2. Alrededor del ${precisionRate * 100}% de los pedidos deben estar claramente especificados (nombre del cliente y productos con cantidades), mientras que el ${(1 - precisionRate) * 100}% deben ser ambiguos o confusos (faltar datos, expresiones poco claras, errores).
        3. Los pedidos deben ser variados, pueden repetirse algunos clientes.
        4. Incluye variaciones en la forma de expresar cantidades (números, texto).
        5. El mensaje debe simularse como si fuera un mensaje de WhatsApp o chat normal.
        
        Solo genera el texto del mensaje, sin ninguna explicación adicional ni formato.`
      },
      {
        role: "user",
        content: "Genera un ejemplo de mensaje de WhatsApp con pedidos de clientes."
      }
    ];
    
    // Notificamos el progreso
    const processingEvent = new CustomEvent('exampleGenerationStateChange', {
      detail: { 
        isGenerating: true,
        stage: "Consultando a la IA...",
        progress: 30
      }
    });
    window.dispatchEvent(processingEvent);
    
    // Hacemos la llamada a la API utilizando tokens máximos
    const response = await fetch(`${GOOGLE_GEMINI_ENDPOINT}/${geminiModel}:generateContent?key=${GOOGLE_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: messages,
        generationConfig: {
          temperature: 0.7, // Reducimos un poco la temperatura para más precisión
          maxOutputTokens: GEMINI_MAX_OUTPUT_TOKENS, // Utilizamos el máximo de tokens disponible
        },
      }),
    });
    
    // Notificamos que estamos procesando la respuesta
    const processingResponseEvent = new CustomEvent('exampleGenerationStateChange', {
      detail: { 
        isGenerating: true,
        stage: "Procesando respuesta...",
        progress: 70
      }
    });
    window.dispatchEvent(processingResponseEvent);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error de API:", errorText);
      
      // Notificamos el error
      const errorEvent = new CustomEvent('exampleGenerationStateChange', {
        detail: { 
          isGenerating: false,
          stage: "Error al generar ejemplos",
          progress: 0,
          error: `Error ${response.status}: ${response.statusText}`
        }
      });
      window.dispatchEvent(errorEvent);
      
      throw new Error(`Error al generar ejemplos: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.candidates || result.candidates.length === 0) {
      console.error("No se recibieron candidatos de respuesta:", result);
      
      // Notificamos el error
      const errorEvent = new CustomEvent('exampleGenerationStateChange', {
        detail: { 
          isGenerating: false,
          stage: "Error: sin respuesta válida",
          progress: 0,
          error: "No se recibieron candidatos de respuesta"
        }
      });
      window.dispatchEvent(errorEvent);
      
      throw new Error("No se recibieron candidatos de respuesta");
    }
    
    const generatedText = result.candidates[0]?.content?.parts?.[0]?.text;
    
    if (!generatedText) {
      console.error("Respuesta sin texto:", result);
      
      // Notificamos el error
      const errorEvent = new CustomEvent('exampleGenerationStateChange', {
        detail: { 
          isGenerating: false,
          stage: "Error: respuesta vacía",
          progress: 0,
          error: "No se pudo generar el ejemplo"
        }
      });
      window.dispatchEvent(errorEvent);
      
      throw new Error("No se pudo generar el ejemplo");
    }
    
    console.log("Ejemplo generado con éxito, longitud:", generatedText.length);
    
    // Notificamos que hemos completado la generación
    const completedEvent = new CustomEvent('exampleGenerationStateChange', {
      detail: { 
        isGenerating: false,
        stage: "¡Ejemplos generados!",
        progress: 100,
        exampleCount: orderCount
      }
    });
    window.dispatchEvent(completedEvent);
    
    return generatedText;
  } catch (error) {
    console.error("Error al generar ejemplos:", error);
    
    // Si aún no hemos notificado el error, lo hacemos ahora
    const errorEvent = new CustomEvent('exampleGenerationStateChange', {
      detail: { 
        isGenerating: false,
        stage: "Error inesperado",
        progress: 0,
        error: error instanceof Error ? error.message : "Error desconocido"
      }
    });
    window.dispatchEvent(errorEvent);
    
    return "Error al generar ejemplos. Por favor, intenta nuevamente.";
  }
};
