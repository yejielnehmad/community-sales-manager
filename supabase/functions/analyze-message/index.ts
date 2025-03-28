
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// Configuración del cliente de Supabase para Edge Function
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY") || "AIzaSyC7sqxUAfCig8IuAxdNxALbAXZVGHAriik";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messageId } = await req.json();

    if (!messageId) {
      return new Response(
        JSON.stringify({ error: "Se requiere un ID de mensaje" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Iniciar el cliente de Supabase
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar el mensaje a analizar
    const { data: messageData, error: messageError } = await supabase
      .from("magic_orders")
      .select("*")
      .eq("id", messageId)
      .single();

    if (messageError || !messageData) {
      console.error("Error al buscar el mensaje:", messageError);
      return new Response(
        JSON.stringify({ error: "Mensaje no encontrado", details: messageError }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Actualizar estado a 'processing'
    const { error: updateStatusError } = await supabase
      .from("magic_orders")
      .update({ status: "processing" })
      .eq("id", messageId);
      
    if (updateStatusError) {
      console.error("Error al actualizar estado a 'processing':", updateStatusError);
    }

    try {
      // Analizar mensaje usando la API de Google Gemini
      console.log(`Iniciando análisis para mensaje ID: ${messageId}`);
      const startTime = Date.now();
      const analysisResult = await analyzeMessage(messageData.message);
      const endTime = Date.now();
      const analysisTime = endTime - startTime;
      console.log(`Análisis completado en ${analysisTime}ms`);

      // Guardar resultado del análisis
      const { error: updateError } = await supabase
        .from("magic_orders")
        .update({
          status: "done",
          result: analysisResult.result,
          phase1_response: analysisResult.phase1Response || null,
          phase2_response: analysisResult.phase2Response || null,
          phase3_response: analysisResult.phase3Response || null,
          analysis_time: analysisTime,
          api_provider: "google-gemini",
          model: "gemini-2.0-flash"
        })
        .eq("id", messageId);

      if (updateError) {
        console.error("Error al actualizar resultado:", updateError);
        return new Response(
          JSON.stringify({ error: "Error al guardar resultado", details: updateError }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ 
          message: "Análisis completado con éxito", 
          ordersCount: analysisResult.result.length,
          analysisTime 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (analysisError) {
      console.error("Error durante el análisis:", analysisError);
      
      // Actualizar el estado a error y guardar detalles del error
      await supabase
        .from("magic_orders")
        .update({
          status: "error",
          error_details: analysisError.message || "Error desconocido durante el análisis"
        })
        .eq("id", messageId);
        
      return new Response(
        JSON.stringify({ 
          error: "Error durante el análisis", 
          details: analysisError.message,
          stack: analysisError.stack
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Error general en el procesamiento:", error);
    return new Response(
      JSON.stringify({ error: "Error durante el procesamiento", details: error.message, stack: error.stack }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Función para analizar el mensaje usando Google Gemini
async function analyzeMessage(message: string) {
  try {
    const GEMINI_MODEL = "gemini-2.0-flash";
    const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GOOGLE_API_KEY}`;

    console.log(`Analizando mensaje con ${GEMINI_MODEL}...`);

    // Fase 1: Análisis detallado del mensaje
    console.log("Iniciando Fase 1: Análisis del mensaje");
    const phase1Response = await executePhase1(message, GEMINI_ENDPOINT);
    
    // Fase 2: Estructuración JSON del resultado
    console.log("Iniciando Fase 2: Estructuración JSON");
    const phase2Response = await executePhase2(message, phase1Response, GEMINI_ENDPOINT);
    
    // Parsear el resultado
    let result;
    try {
      result = JSON.parse(phase2Response);
      console.log(`JSON parseado con éxito. Cantidad de resultados: ${result.length}`);
    } catch (parseError) {
      console.error("Error al parsear JSON:", parseError);
      console.error("Texto JSON recibido:", phase2Response);
      
      // Intento de recuperación - Fase 3
      console.log("Iniciando Fase 3: Corrección de formato JSON");
      const phase3Response = await executePhase3(phase2Response, GEMINI_ENDPOINT);
      
      try {
        result = JSON.parse(phase3Response);
        console.log("JSON corregido y parseado con éxito en Fase 3");
        
        return {
          result,
          phase1Response,
          phase2Response,
          phase3Response
        };
      } catch (phase3Error) {
        console.error("Error persistente al parsear JSON después de Fase 3:", phase3Error);
        throw new Error(`Formato de respuesta inválido después de corrección: ${phase3Error.message}`);
      }
    }

    return {
      result,
      phase1Response,
      phase2Response
    };
  } catch (error) {
    console.error("Error en analyzeMessage:", error);
    throw error;
  }
}

// Fase 1: Análisis detallado del mensaje
async function executePhase1(message: string, endpoint: string) {
  try {
    console.log("Ejecutando Fase 1 con mensaje:", message.substring(0, 100) + "...");
    
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "system",
            parts: [{ text: `Eres un asistente especializado en analizar pedidos de clientes. 
Tu tarea es analizar un mensaje recibido e identificar:
1. Cliente: Quién realiza el pedido. No inventes clientes, solo identifica los que estén claramente mencionados.
2. Productos: Qué productos está pidiendo, con sus cantidades y variantes si se especifican.

Analiza el mensaje paso a paso, identifica el probable cliente, los productos mencionados y sus cantidades.
Si hay ambigüedades o datos no reconocidos, indícalos explícitamente.` }]
          },
          {
            role: "user",
            parts: [{ text: message }]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 4000,
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error en respuesta de API (Fase 1): ${response.status} ${response.statusText}`, errorText);
      throw new Error(`Error en la API (Fase 1): ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    console.log("Fase 1 completada. Longitud de respuesta:", resultText.length);
    
    return resultText;
  } catch (error) {
    console.error("Error detallado en executePhase1:", error);
    if (error.message.includes("403")) {
      throw new Error("Error de autenticación con la API de Google Gemini. Revise la API key y los permisos.");
    }
    throw error;
  }
}

// Fase 2: Estructuración JSON del resultado
async function executePhase2(message: string, phase1Analysis: string, endpoint: string) {
  try {
    console.log("Ejecutando Fase 2 con análisis previo de longitud:", phase1Analysis.length);
    
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "system",
            parts: [{ text: `Eres un asistente especializado en convertir análisis de pedidos a formato JSON estructurado.
Basado en un análisis previo de un mensaje, genera un JSON que represente el pedido con esta estructura:

[{
  "client": {
    "name": "Nombre del cliente",
    "id": null,
    "matchConfidence": "alto|medio|bajo"
  },
  "items": [
    {
      "product": {
        "name": "Nombre del producto",
        "id": null
      },
      "quantity": número,
      "variant": {
        "name": "Nombre de la variante (si aplica)",
        "id": null
      } o null,
      "status": "confirmado" o "duda",
      "notes": "Notas o comentarios sobre el pedido"
    }
  ]
}]

Si no hay pedidos identificados, devuelve un array vacío [].
Responde ÚNICAMENTE con el JSON, sin texto adicional.` }]
          },
          {
            role: "user", 
            parts: [{ text: `Mensaje original: "${message}"

Análisis previo:
${phase1Analysis}

Convierte este análisis a JSON estructurado:` }]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 4000,
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error en respuesta de API (Fase 2): ${response.status} ${response.statusText}`, errorText);
      throw new Error(`Error en la API (Fase 2): ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
    
    // Limpiar el resultado para asegurar que es un JSON válido
    const cleanedJson = cleanJsonResponse(resultText);
    console.log("Fase 2 completada. JSON limpiado y listo para parsing.");
    
    return cleanedJson;
  } catch (error) {
    console.error("Error detallado en executePhase2:", error);
    if (error.message.includes("403")) {
      throw new Error("Error de autenticación con la API de Google Gemini. Revise la API key y los permisos.");
    }
    throw error;
  }
}

// Fase 3: Corrección de formato JSON (nueva)
async function executePhase3(invalidJson: string, endpoint: string) {
  try {
    console.log("Ejecutando Fase 3: Corrección de formato JSON");
    
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "system",
            parts: [{ text: `Eres un asistente especializado en corregir y validar JSON.
Tu tarea es tomar un texto que debería ser JSON pero puede tener errores de formato,
y convertirlo en un JSON válido. Elimina cualquier texto adicional que no sea parte del JSON.

Responde ÚNICAMENTE con el JSON corregido, sin explicaciones ni comentarios.` }]
          },
          {
            role: "user", 
            parts: [{ text: `Corrige este JSON para que sea válido:
${invalidJson}

Reglas:
1. El resultado debe ser un array de objetos
2. Elimina cualquier texto o markdown que no sea parte del JSON
3. Asegúrate de que todas las comillas estén correctas
4. Arregla cualquier error de sintaxis JSON` }]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 4000,
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error en respuesta de API (Fase 3): ${response.status} ${response.statusText}`, errorText);
      throw new Error(`Error en la API (Fase 3): ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
    
    // Limpiar el resultado para asegurar que es un JSON válido
    const cleanedJson = cleanJsonResponse(resultText);
    console.log("Fase 3 completada. JSON corregido y limpiado.");
    
    return cleanedJson;
  } catch (error) {
    console.error("Error detallado en executePhase3:", error);
    throw error;
  }
}

// Función para limpiar respuestas JSON
function cleanJsonResponse(jsonText: string): string {
  // Eliminar marcas de markdown si existen
  let cleaned = jsonText.trim();
  
  // Eliminar bloques de código markdown
  if (cleaned.includes("```")) {
    const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
      cleaned = match[1].trim();
    } else {
      cleaned = cleaned.replace(/```(?:json)?|```/g, "").trim();
    }
  }
  
  // Normalizar comillas especiales
  cleaned = cleaned
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\n+/g, ' ')
    .trim();
  
  // Asegurarse de que el texto comienza con [ y termina con ]
  if (!cleaned.startsWith('[') || !cleaned.endsWith(']')) {
    const arrayMatch = cleaned.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (arrayMatch) {
      cleaned = arrayMatch[0];
    } else if (!cleaned.startsWith('[')) {
      cleaned = '[' + cleaned;
    }
    
    if (!cleaned.endsWith(']')) {
      cleaned = cleaned + ']';
    }
  }
  
  return cleaned;
}
