
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// Configuración del cliente de Supabase para Edge Function
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY") || "";

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
      return new Response(
        JSON.stringify({ error: "Mensaje no encontrado", details: messageError }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Actualizar estado a 'processing'
    await supabase
      .from("magic_orders")
      .update({ status: "processing" })
      .eq("id", messageId);

    // Analizar mensaje usando la API de Google Gemini
    const startTime = Date.now();
    const analysisResult = await analyzeMessage(messageData.message);
    const endTime = Date.now();
    const analysisTime = endTime - startTime;

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
  } catch (error) {
    console.error("Error en el análisis:", error);
    return new Response(
      JSON.stringify({ error: "Error durante el procesamiento", details: error.message }),
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
    } catch (parseError) {
      console.error("Error al parsear JSON:", parseError);
      throw new Error("Formato de respuesta inválido: " + parseError.message);
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
      throw new Error(`Error en la API (Fase 1): ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  } catch (error) {
    console.error("Error en executePhase1:", error);
    throw error;
  }
}

// Fase 2: Estructuración JSON del resultado
async function executePhase2(message: string, phase1Analysis: string, endpoint: string) {
  try {
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
      throw new Error(`Error en la API (Fase 2): ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
  } catch (error) {
    console.error("Error en executePhase2:", error);
    throw error;
  }
}
