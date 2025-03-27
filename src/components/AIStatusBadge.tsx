
import { useEffect, useState, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { OPENROUTER_API_KEY, OPENROUTER_ENDPOINT, API_CONFIG_UPDATED } from "@/lib/api-config";
import { 
  CheckCircle, 
  AlertTriangle, 
  Loader2, 
  Brain, 
  Info,
  X,
  ExternalLink
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
import { logDebug, logError } from "@/lib/debug-utils";

// Clave para localStorage para evitar verificaciones repetidas
const API_CHECK_STORAGE_KEY = "claude_api_checked";

export const AIStatusBadge = () => {
  const [status, setStatus] = useState<"checking" | "connected" | "error">("checking");
  const [message, setMessage] = useState<string>("Verificando conexión...");
  const [detailedInfo, setDetailedInfo] = useState<string>("Iniciando verificación de conexión con Claude 3 Haiku");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isManualCheck, setIsManualCheck] = useState(false);
  const [apiResponse, setApiResponse] = useState<string | null>(null);
  const statusRef = useRef(status);
  const checkPerformedRef = useRef(false);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const checkConnection = async (forceCheck = false) => {
    // Si ya se ha verificado y no es una verificación forzada, usamos el estado guardado
    if (checkPerformedRef.current && !forceCheck) {
      logDebug("AIStatus", "Omitiendo verificación de API, ya se realizó previamente");
      return;
    }
    
    // Si no hay API key configurada
    if (!OPENROUTER_API_KEY) {
      setStatus("error");
      setMessage("API Key de OpenRouter no configurada");
      setDetailedInfo("No se ha configurado una API Key para OpenRouter (Claude 3 Haiku). Por favor, configura una clave válida.");
      checkPerformedRef.current = true;
      return;
    }

    try {
      logDebug("AIStatus", "Verificando conexión con OpenRouter API (Claude 3 Haiku)...");
      setDetailedInfo("Enviando solicitud de prueba a la API de OpenRouter (Claude 3 Haiku)...");
      
      const endpoint = OPENROUTER_ENDPOINT || "https://openrouter.ai/api/v1/chat/completions";
      logDebug("AIStatus", `Usando endpoint: ${endpoint}`);
      logDebug("AIStatus", `API Key (primeros 10 caracteres): ${OPENROUTER_API_KEY.substring(0, 10)}...`);
      
      const response = await fetch(
        endpoint,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
            "HTTP-Referer": window.location.origin, // Requerido por OpenRouter
            "X-Title": "VentasCom" // Nombre de la aplicación
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
          signal: AbortSignal.timeout(15000) // Aumentamos el timeout a 15 segundos
        }
      );

      const responseText = await response.text();
      setApiResponse(responseText);
      
      if (!response.ok) {
        logError("AIStatus", `Error en la respuesta HTTP: ${response.status} ${response.statusText}`, responseText);
        setStatus("error");
        setMessage(`Error HTTP: ${response.status} ${response.statusText}`);
        
        // Mejorar mensaje de error basado en código de respuesta
        if (response.status === 401) {
          setDetailedInfo(`Error de autenticación: La clave API no es válida o ha expirado.\n\nRespuesta del servidor: ${responseText}`);
        } else if (response.status === 429) {
          setDetailedInfo(`Error de límite: Has excedido el límite de peticiones permitidas. Espera unos minutos o actualiza tu plan.\n\nRespuesta del servidor: ${responseText}`);
        } else {
          setDetailedInfo(`Error en la respuesta del servidor: ${response.status} ${response.statusText}\n${responseText}`);
        }
        
        checkPerformedRef.current = true;
        return;
      }

      let data;
      try {
        data = JSON.parse(responseText);
        logDebug("AIStatus", "Respuesta de verificación de Claude:", data);
      } catch (parseError) {
        logError("AIStatus", "Error al parsear respuesta JSON:", parseError);
        setStatus("error");
        setMessage("Error al procesar respuesta");
        setDetailedInfo(`Error al parsear la respuesta JSON: ${(parseError as Error).message}\n\nRespuesta recibida: ${responseText}`);
        checkPerformedRef.current = true;
        return;
      }

      if (data.error) {
        setStatus("error");
        setMessage(`Error: ${data.error.message || "Error de conexión"}`);
        setDetailedInfo(`Error reportado por la API de OpenRouter:\n${JSON.stringify(data.error, null, 2)}`);
        logError("AIStatus", "Error de la API de OpenRouter:", data.error);
      } else if (
        data.choices && 
        data.choices[0] && 
        data.choices[0].message && 
        data.choices[0].message.content && 
        data.choices[0].message.content.toLowerCase().includes("conectado")
      ) {
        setStatus("connected");
        setMessage("Claude 3 Haiku conectado correctamente");
        setDetailedInfo(`Conexión exitosa con OpenRouter API (Claude 3 Haiku)\nModelo: anthropic/claude-3-haiku\nRespuesta: "${data.choices[0].message.content}"\nFecha de verificación: ${new Date().toLocaleString()}`);
      } else {
        setStatus("error");
        setMessage("Respuesta inesperada de Claude 3 Haiku");
        setDetailedInfo(`Respuesta inesperada de la API. Respuesta completa:\n${JSON.stringify(data, null, 2)}`);
        logDebug("AIStatus", "Respuesta completa:", JSON.stringify(data, null, 2));
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
      logError("AIStatus", "Error al verificar conexión con Claude 3 Haiku:", error);
      setStatus("error");
      let errorMessage = "Error de conexión";
      
      if (error.name === 'TimeoutError' || error.name === 'AbortError') {
        errorMessage = "Timeout al conectar con la API";
        setDetailedInfo(`La conexión con OpenRouter API ha tardado demasiado tiempo. Esto puede indicar problemas con la API o con tu conexión a Internet.\n\nDetalle del error: ${error.message}`);
      } else {
        setDetailedInfo(`Error durante la verificación de la conexión:\n${error.name} - ${error.message}\n${error.stack || ''}`);
      }
      
      setMessage(`Error al conectar con OpenRouter API: ${errorMessage}`);
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
        
        // Si la verificación tiene menos de 30 minutos, usamos el estado guardado (reducido a 30 minutos en lugar de 1 hora)
        if (hoursSinceLastCheck < 0.5) {
          logDebug("AIStatus", "Usando estado de API guardado, verificación reciente");
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
              
              {status === "error" && (
                <div className="mt-4 space-y-2">
                  <h5 className="text-sm font-medium text-red-600">Soluciones posibles:</h5>
                  <ul className="text-xs space-y-1 text-red-600">
                    <li>• Verifica que tu clave API de OpenRouter sea válida y esté activa</li>
                    <li>• Asegúrate de tener saldo suficiente en tu cuenta de OpenRouter</li>
                    <li>• Configura correctamente la API key en la aplicación</li>
                    <li>• Verifica tu conexión a internet</li>
                  </ul>
                  
                  <div className="flex items-center justify-between pt-2">
                    <a 
                      href="https://openrouter.ai/keys" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs flex items-center gap-1 text-blue-600 hover:underline"
                    >
                      Verificar mi clave API
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => checkConnection(true)}
                      className="text-xs"
                    >
                      Reintentar conexión
                    </Button>
                  </div>
                </div>
              )}
              
              {apiResponse && status === "error" && (
                <div className="mt-3">
                  <details className="text-xs">
                    <summary className="cursor-pointer hover:text-blue-600 transition-colors">
                      Ver respuesta completa de la API (para depuración)
                    </summary>
                    <div className="mt-2 p-2 bg-gray-50 border rounded overflow-x-auto">
                      <pre className="text-xs whitespace-pre-wrap break-words">{apiResponse}</pre>
                    </div>
                  </details>
                </div>
              )}
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
