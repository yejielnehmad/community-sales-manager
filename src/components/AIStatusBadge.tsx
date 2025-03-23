
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { GOOGLE_API_KEY } from "@/lib/api-config";
import { CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export const AIStatusBadge = () => {
  const [status, setStatus] = useState<"checking" | "connected" | "error">("checking");
  const [message, setMessage] = useState<string>("Verificando conexión...");

  useEffect(() => {
    const checkConnection = async () => {
      if (!GOOGLE_API_KEY) {
        setStatus("error");
        setMessage("API Key de Google Gemini no configurada");
        return;
      }

      try {
        console.log("Verificando conexión con Gemini API...");
        
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
            // Agregar un timeout para evitar que se quede colgado
            signal: AbortSignal.timeout(10000)
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Error en la respuesta HTTP:", response.status, response.statusText, errorText);
          setStatus("error");
          setMessage(`Error HTTP: ${response.status} ${response.statusText}`);
          return;
        }

        const data = await response.json();
        console.log("Respuesta de verificación de Gemini:", data);

        if (data.error) {
          setStatus("error");
          setMessage(`Error: ${data.error.message || "Error de conexión"}`);
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
        } else {
          setStatus("error");
          setMessage("Respuesta inesperada de Gemini");
          console.log("Respuesta completa:", JSON.stringify(data, null, 2));
        }
      } catch (error: any) {
        console.error("Error al verificar conexión con Gemini:", error);
        setStatus("error");
        setMessage(`Error al conectar con Gemini API: ${error.name === 'TimeoutError' ? 'Timeout' : error.message}`);
      }
    };

    // Intentar reconectar cada 30 segundos si hay error
    const checkWithRetry = async () => {
      await checkConnection();
      
      if (status === "error") {
        const intervalId = setInterval(async () => {
          console.log("Reintentando conexión con Gemini API...");
          await checkConnection();
          if (status === "connected") {
            clearInterval(intervalId);
          }
        }, 30000);
        
        return () => clearInterval(intervalId);
      }
    };

    checkWithRetry();
  }, [status]);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={`
              ${status === "connected" ? "bg-green-100 text-green-800 border-green-300" : 
                status === "error" ? "bg-red-100 text-red-800 border-red-300" : 
                "bg-yellow-100 text-yellow-800 border-yellow-300"} 
              flex items-center gap-1 cursor-help
            `}
          >
            {status === "connected" ? (
              <CheckCircle className="h-3 w-3" />
            ) : status === "error" ? (
              <AlertTriangle className="h-3 w-3" />
            ) : (
              <Loader2 className="h-3 w-3 animate-spin" />
            )}
            <span>IA</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{message}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
