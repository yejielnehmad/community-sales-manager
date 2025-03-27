
import { useEffect, useState, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { OPENROUTER_API_KEY } from "@/lib/api-config";
import { 
  CheckCircle, 
  AlertTriangle, 
  Loader2, 
  Brain, 
  Info,
  X
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// Clave para localStorage para evitar verificaciones repetidas
const API_CHECK_STORAGE_KEY = "openrouter_api_checked";

export const AIStatusBadge = () => {
  const [status, setStatus] = useState<"checking" | "connected" | "error">("checking");
  const [message, setMessage] = useState<string>("Verificando conexión...");
  const [detailedInfo, setDetailedInfo] = useState<string>("Iniciando verificación de conexión con OpenRouter");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isManualCheck, setIsManualCheck] = useState(false);
  const statusRef = useRef(status);
  const checkPerformedRef = useRef(false);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const checkConnection = async (forceCheck = false) => {
    // Si ya se ha verificado y no es una verificación forzada, usamos el estado guardado
    if (checkPerformedRef.current && !forceCheck) {
      console.log("Omitiendo verificación de API, ya se realizó previamente");
      return;
    }
    
    // Si no hay API key configurada
    if (!OPENROUTER_API_KEY) {
      setStatus("error");
      setMessage("API Key de OpenRouter no configurada");
      setDetailedInfo("No se ha configurado una API Key para OpenRouter. Por favor, configura una clave válida.");
      checkPerformedRef.current = true;
      return;
    }

    try {
      console.log("Verificando conexión con OpenRouter API...");
      setDetailedInfo("Enviando solicitud de prueba a la API de OpenRouter...");
      
      const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
            "HTTP-Referer": window.location.origin || "https://app.example.com",
            "X-Title": "VentasCom App"
          },
          body: JSON.stringify({
            model: "anthropic/claude-3-haiku",
            messages: [
              {
                role: "user",
                content: "Responde solamente con la palabra 'conectado' sin explicaciones adicionales."
              }
            ],
            temperature: 0.1,
            max_tokens: 10
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
        checkPerformedRef.current = true;
        return;
      }

      const data = await response.json();
      console.log("Respuesta de verificación de OpenRouter:", data);

      if (data.error) {
        setStatus("error");
        setMessage(`Error: ${data.error.message || "Error de conexión"}`);
        setDetailedInfo(`Error reportado por la API de OpenRouter:\n${JSON.stringify(data.error, null, 2)}`);
        console.error("Error de la API de OpenRouter:", data.error);
      } else if (
        data.choices && 
        data.choices[0] && 
        data.choices[0].message && 
        data.choices[0].message.content.toLowerCase().includes("conectado")
      ) {
        setStatus("connected");
        setMessage("OpenRouter conectado correctamente");
        setDetailedInfo(`Conexión exitosa con OpenRouter API (Claude 3 Haiku)\nModelo: anthropic/claude-3-haiku\nRespuesta: "${data.choices[0].message.content}"`);
      } else {
        setStatus("error");
        setMessage("Respuesta inesperada de OpenRouter");
        setDetailedInfo(`Respuesta inesperada de la API. Respuesta completa:\n${JSON.stringify(data, null, 2)}`);
        console.log("Respuesta completa:", JSON.stringify(data, null, 2));
      }
      
      // Marcar que la verificación se ha realizado
      checkPerformedRef.current = true;
      
      // Guardar el estado en localStorage para persistir entre páginas
      try {
        localStorage.setItem(API_CHECK_STORAGE_KEY, JSON.stringify({
          status,
          message,
          detailedInfo,
          timestamp: Date.now()
        }));
      } catch (e) {
        console.warn("No se pudo guardar el estado en localStorage:", e);
      }
      
    } catch (error: any) {
      console.error("Error al verificar conexión con OpenRouter:", error);
      setStatus("error");
      setMessage(`Error al conectar con OpenRouter API: ${error.name === 'TimeoutError' ? 'Timeout' : error.message}`);
      setDetailedInfo(`Error durante la verificación de la conexión:\n${error.name} - ${error.message}\n${error.stack || ''}`);
      checkPerformedRef.current = true;
    }
  };

  // Verificar la conexión solo al cargar el componente por primera vez
  useEffect(() => {
    // Intentar recuperar el estado guardado en localStorage
    try {
      const savedCheck = localStorage.getItem(API_CHECK_STORAGE_KEY);
      if (savedCheck) {
        const parsedCheck = JSON.parse(savedCheck);
        const checkTime = new Date(parsedCheck.timestamp);
        const now = new Date();
        const hoursSinceLastCheck = (now.getTime() - checkTime.getTime()) / (1000 * 60 * 60);
        
        // Si la verificación tiene menos de 1 hora, usamos el estado guardado
        if (hoursSinceLastCheck < 1) {
          console.log("Usando estado de API guardado, verificación reciente");
          setStatus(parsedCheck.status);
          setMessage(parsedCheck.message);
          setDetailedInfo(parsedCheck.detailedInfo);
          checkPerformedRef.current = true;
          return;
        }
      }
    } catch (e) {
      console.warn("Error al recuperar estado guardado:", e);
    }
    
    // Solo verificamos inicialmente y no reintentamos automáticamente
    checkConnection();
  }, []);

  const handleOpenDialog = () => {
    // Si se hace clic en la insignia, verificamos solo si es una verificación manual
    setIsDialogOpen(true);
    
    if (!isManualCheck) {
      setIsManualCheck(true);
      checkConnection(true); // Forzar verificación cuando el usuario hace clic
      setTimeout(() => setIsManualCheck(false), 5000); // Prevenir múltiples verificaciones rápidas
    }
  };

  return (
    <>
      <Badge 
        variant="outline" 
        onClick={handleOpenDialog}
        className={`
          ${status === "connected" ? "bg-green-100 text-green-800 border-green-300" : 
            status === "error" ? "bg-red-100 text-red-800 border-red-300" : 
            "bg-yellow-100 text-yellow-800 border-yellow-300"} 
          flex items-center gap-1 cursor-pointer hover:opacity-80 transition-all hover:scale-105 duration-300
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
      </Badge>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Inteligencia Artificial en tu Aplicación
            </DialogTitle>
            <DialogDescription>
              Potencia tus ventas con tecnología de Claude 3 Haiku
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-5">
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-4 rounded-xl border border-purple-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-primary/20 p-2 rounded-full">
                  <Brain className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-medium text-lg">¿Qué puede hacer la IA por ti?</h3>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <div className="bg-green-100 p-1 rounded-full mt-1">
                    <CheckCircle className="h-3 w-3 text-green-600" />
                  </div>
                  <p className="text-sm">Analizar mensajes de clientes para identificar productos y cantidades automáticamente</p>
                </div>
                
                <div className="flex items-start gap-2">
                  <div className="bg-green-100 p-1 rounded-full mt-1">
                    <CheckCircle className="h-3 w-3 text-green-600" />
                  </div>
                  <p className="text-sm">Reconocer datos de clientes y detalles de sus pedidos</p>
                </div>
                
                <div className="flex items-start gap-2">
                  <div className="bg-green-100 p-1 rounded-full mt-1">
                    <CheckCircle className="h-3 w-3 text-green-600" />
                  </div>
                  <p className="text-sm">Generar ejemplos de mensajes para probar y entrenar la función de análisis</p>
                </div>
              </div>
            </div>
            
            <div className="border p-3 rounded-lg bg-muted/5">
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-500" />
                Estado actual de la conexión
              </h4>
              <div className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
                {detailedInfo}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" size="sm" className="w-full sm:w-auto">
                <X className="h-4 w-4 mr-1" />
                Cerrar
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
