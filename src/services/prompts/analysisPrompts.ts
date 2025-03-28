
/**
 * Prompts para análisis de mensajes
 * v1.0.0
 */

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

// Valor por defecto
let currentAnalysisPrompt = DEFAULT_ANALYSIS_PROMPT;

// Usar análisis en dos fases por defecto
let useNewTwoPhasesAnalysis = true;

/**
 * Establece un prompt personalizado para el análisis
 */
export const setCustomAnalysisPrompt = (prompt: string): void => {
  if (!prompt || prompt.trim() === '') {
    currentAnalysisPrompt = DEFAULT_ANALYSIS_PROMPT;
    return;
  }
  currentAnalysisPrompt = prompt;
};

/**
 * Obtiene el prompt de análisis actual
 */
export const getCurrentAnalysisPrompt = (): string => {
  return currentAnalysisPrompt;
};

/**
 * Restablece el prompt de análisis al valor por defecto
 */
export const resetAnalysisPrompt = (): void => {
  currentAnalysisPrompt = DEFAULT_ANALYSIS_PROMPT;
};

/**
 * Configura si se debe usar el análisis en dos fases
 */
export const setUseTwoPhasesAnalysis = (useIt: boolean): void => {
  useNewTwoPhasesAnalysis = useIt;
};

/**
 * Obtiene si se está usando el análisis en dos fases
 */
export const getUseTwoPhasesAnalysis = (): boolean => {
  return useNewTwoPhasesAnalysis;
};
