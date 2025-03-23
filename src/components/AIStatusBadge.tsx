
import { useEffect, useState, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { GOOGLE_API_KEY } from "@/lib/api-config";
import { CheckCircle, AlertTriangle, Loader2, Brain, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export const AIStatusBadge = () => {
  const [status, setStatus] = useState<"checking" | "connected" | "error">("checking");
  const [message, setMessage] = useState<string>("Verificando conexión...");
  const [detailedInfo, setDetailedInfo] = useState<string>("Iniciando verificación de conexión con Google Gemini");
  const statusRef = useRef(status);

  // Actualizamos la referencia cuando cambia el estado
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    const checkConnection = async () => {
      if (!GOOGLE_API_KEY) {
        setStatus("error");
        setMessage("API Key de Google Gemini no configurada");
        setDetailedInfo("No se ha configurado una API Key para Google Gemini. Por favor, configura una clave válida.");
        return;
      }

      try {
        console.log("Verificando conexión con Gemini API...");
        setDetailedInfo("Enviando solicitud de prueba a la API de Google Gemini...");
        
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
                  text: "Responde solamente con la palabra 'conectado' sin explicaciones adicionales."
                }]
              }],
              generationConfig: {
                temperature: 0.1,
                topP: 0.8,
                maxOutputTokens: 10,
              }
            }),
            signal: AbortSignal.timeout(10000)
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Error en la respuesta HTTP:", response.status, response.statusText, errorText);
          setStatus("error");
          setMessage(`Error HTTP: ${response.status} ${response.statusText}`);
          setDetailedInfo(`Error en la respuesta del servidor: ${response.status} ${response.statusText}\n${errorText}`);
          return;
        }

        const data = await response.json();
        console.log("Respuesta de verificación de Gemini:", data);

        if (data.error) {
          setStatus("error");
          setMessage(`Error: ${data.error.message || "Error de conexión"}`);
          setDetailedInfo(`Error reportado por la API de Gemini:\n${JSON.stringify(data.error, null, 2)}`);
          console.error("Error de la API de Gemini:", data.error);
        } else if (
          data.candidates && 
          data.candidates[0] && 
          data.candidates[0].content && 
          data.candidates[0].content.parts && 
          data.candidates[0].content.parts[0].text.toLowerCase().includes("conectado")
        ) {
          setStatus("connected");
          setMessage("Gemini conectado correctamente");
          setDetailedInfo(`Conexión exitosa con Gemini API (gemini-2.0-flash)\nModelo: ${data.candidates[0].safetyRatings ? 'Con filtros de seguridad' : 'Sin filtros de seguridad'}\nRespuesta: "${data.candidates[0].content.parts[0].text}"`);
        } else {
          setStatus("error");
          setMessage("Respuesta inesperada de Gemini");
          setDetailedInfo(`Respuesta inesperada de la API. Respuesta completa:\n${JSON.stringify(data, null, 2)}`);
          console.log("Respuesta completa:", JSON.stringify(data, null, 2));
        }
      } catch (error: any) {
        console.error("Error al verificar conexión con Gemini:", error);
        setStatus("error");
        setMessage(`Error al conectar con Gemini API: ${error.name === 'TimeoutError' ? 'Timeout' : error.message}`);
        setDetailedInfo(`Error durante la verificación de la conexión:\n${error.name} - ${error.message}\n${error.stack || ''}`);
      }
    };

    // Intentar reconectar cada 30 segundos si hay error
    const checkWithRetry = async () => {
      await checkConnection();
      
      if (statusRef.current === "error") {
        const intervalId = setInterval(async () => {
          console.log("Reintentando conexión con Gemini API...");
          await checkConnection();
          // Usamos statusRef.current para acceder al valor actualizado
          if (statusRef.current === "connected") {
            clearInterval(intervalId);
          }
        }, 30000);
        
        return () => clearInterval(intervalId);
      }
    };

    checkWithRetry();
  }, []);

  return (
    <Badge 
      variant="outline" 
      className={`
        ${status === "connected" ? "bg-green-100 text-green-800 border-green-300" : 
          status === "error" ? "bg-red-100 text-red-800 border-red-300" : 
          "bg-yellow-100 text-yellow-800 border-yellow-300"} 
        flex items-center gap-1 cursor-help hover:opacity-80 transition-all hover:scale-105 duration-300
        active:bg-muted active:scale-95 touch-manipulation
      `}
    >
      {status === "connected" ? (
        <CheckCircle className="h-3 w-3 animate-pulse" />
      ) : status === "error" ? (
        <AlertTriangle className="h-3 w-3" />
      ) : (
        <Loader2 className="h-3 w-3 animate-spin" />
      )}
      <span>IA</span>
      <Sparkles className="h-2 w-2 ml-1 text-amber-500" />
    </Badge>
  );
};
