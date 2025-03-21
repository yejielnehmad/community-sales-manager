
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
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GOOGLE_API_KEY}`,
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
          }
        );

        const data = await response.json();

        if (data.error) {
          setStatus("error");
          setMessage(`Error: ${data.error.message || "Error de conexión"}`);
        } else {
          setStatus("connected");
          setMessage("Gemini conectado correctamente");
        }
      } catch (error) {
        setStatus("error");
        setMessage("Error al conectar con Gemini API");
      }
    };

    checkConnection();
  }, []);

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
