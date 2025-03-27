
import { useEffect, useState, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { COHERE_API_KEY, COHERE_ENDPOINT, API_CONFIG_UPDATED } from "@/lib/api-config";
import { 
  CheckCircle, 
  AlertTriangle, 
  Loader2, 
  Brain, 
  Info,
  X,
  ExternalLink,
  Sparkles
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
const API_CHECK_STORAGE_KEY = "cohere_api_checked";

export const AIStatusBadge = () => {
  const [status, setStatus] = useState<"checking" | "connected" | "error" | "analyzing">("checking");
  const [message, setMessage] = useState<string>("Verificando conexión...");
  const [detailedInfo, setDetailedInfo] = useState<string>("Iniciando verificación de conexión con Cohere");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isManualCheck, setIsManualCheck] = useState(false);
  const [apiResponse, setApiResponse] = useState<string | null>(null);
  const statusRef = useRef(status);
  const checkPerformedRef = useRef(false);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // Escuchar eventos de análisis desde Mensaje Mágico
  useEffect(() => {
    const handleAnalysisStateChange = (event: CustomEvent) => {
      const { isAnalyzing } = event.detail;
      
      console.log("Evento de análisis detectado:", isAnalyzing ? "Analizando" : "Finalizado");
      
      if (isAnalyzing) {
        setStatus("analyzing");
        setMessage("Analizando mensaje...");
        setDetailedInfo("El módulo de Mensaje Mágico está procesando un mensaje. La IA está analizando el contenido para detectar pedidos.");
      } else if (statusRef.current === "analyzing") {
        setStatus("connected");
        setMessage("Cohere conectado correctamente");
        setDetailedInfo("Conexión exitosa con Cohere API\nModelo: command-r-plus");
      }
    };

    // Añadir el listener para el evento personalizado
    window.addEventListener('analysisStateChange', handleAnalysisStateChange as EventListener);
    
    // Debug para verificar que el listener se ha registrado
    console.log("AIStatusBadge: Registrado listener para evento analysisStateChange");
    
    return () => {
      window.removeEventListener('analysisStateChange', handleAnalysisStateChange as EventListener);
      console.log("AIStatusBadge: Eliminado listener para evento analysisStateChange");
    };
  }, []);

  const checkConnection = async (forceCheck = false) => {
    // Si ya se ha verificado y no es una verificación forzada, usamos el estado guardado
    if (checkPerformedRef.current && !forceCheck) {
      logDebug("AIStatus", "Omitiendo verificación de API, ya se realizó previamente");
      return;
    }
    
    // Si no hay API key configurada
    if (!COHERE_API_KEY) {
      setStatus("error");
      setMessage("API Key de Cohere no configurada");
      setDetailedInfo("No se ha configurado una API Key para Cohere. Por favor, configura una clave válida.");
      checkPerformedRef.current = true;
      return;
    }

    try {
      logDebug("AIStatus", "Verificando conexión con Cohere API...");
      setDetailedInfo("Enviando solicitud de prueba a la API de Cohere...");
      
      const endpoint = COHERE_ENDPOINT || "https://api.cohere.ai/v1/chat";
      logDebug("AIStatus", `Usando endpoint: ${endpoint}`);
      
      // Solo mostramos la parte inicial de la API key si está configurada
      if (COHERE_API_KEY && COHERE_API_KEY.length > 10) {
        logDebug("AIStatus", `API Key (primeros 10 caracteres): ${COHERE_API_KEY.substring(0, 10)}...`);
      } else {
        logDebug("AIStatus", "API Key configurada pero es demasiado corta");
      }
      
      const response = await fetch(
        endpoint,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${COHERE_API_KEY}`
          },
          body: JSON.stringify({
            model: "command-r-plus",
            message: "Responde solamente con la palabra 'conectado' sin explicaciones adicionales.",
            temperature: 0.1,
            max_tokens: 10,
            chat_history: []
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
        logDebug("AIStatus", "Respuesta de verificación de Cohere:", data);
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
        setDetailedInfo(`Error reportado por la API de Cohere:\n${JSON.stringify(data.error, null, 2)}`);
        logError("AIStatus", "Error de la API de Cohere:", data.error);
      } else if (
        data.text && 
        data.text.toLowerCase().includes("conectado")
      ) {
        setStatus("connected");
        setMessage("Cohere conectado correctamente");
        setDetailedInfo(`Conexión exitosa con Cohere API\nModelo: command-r-plus\nRespuesta: "${data.text}"\nFecha de verificación: ${new Date().toLocaleString()}`);
      } else {
        setStatus("error");
        setMessage("Respuesta inesperada de Cohere");
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
      logError("AIStatus", "Error al verificar conexión con Cohere:", error);
      setStatus("error");
      let errorMessage = "Error de conexión";
      
      if (error.name === 'TimeoutError' || error.name === 'AbortError') {
        errorMessage = "Timeout al conectar con la API";
        setDetailedInfo(`La conexión con Cohere API ha tardado demasiado tiempo. Esto puede indicar problemas con la API o con tu conexión a Internet.\n\nDetalle del error: ${error.message}`);
      } else {
        setDetailedInfo(`Error durante la verificación de la conexión:\n${error.name} - ${error.message}\n${error.stack || ''}`);
      }
      
      setMessage(`Error al conectar con Cohere API: ${errorMessage}`);
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
            status === "analyzing" ? "bg-blue-100 text-blue-800 border-blue-300" :
            "bg-yellow-100 text-yellow-800 border-yellow-300"} 
          flex items-center gap-1 cursor-pointer hover:opacity-80 transition-all hover:scale-105 duration-300
          active:bg-muted active:scale-95 touch-manipulation
        `}
      >
        {status === "connected" ? (
          <CheckCircle className="h-3 w-3 animate-pulse" />
        ) : status === "error" ? (
          <AlertTriangle className="h-3 w-3" />
        ) : status === "analyzing" ? (
          <Sparkles className="h-3 w-3 animate-spin" />
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
              {status === "analyzing" ? "IA Analizando Mensaje" : "Inteligencia Artificial en tu Aplicación"}
            </DialogTitle>
            <DialogDescription>
              {status === "analyzing" 
                ? "La IA está procesando un mensaje en Mensaje Mágico" 
                : "Potencia tus ventas con tecnología de Cohere AI"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-5">
            {status === "analyzing" ? (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-blue-100 p-2 rounded-full">
                    <Sparkles className="h-5 w-5 text-blue-600 animate-pulse" />
                  </div>
                  <h3 className="font-medium text-lg text-blue-800">Análisis en progreso</h3>
                </div>
                <p className="text-sm text-blue-700">
                  La IA está procesando un mensaje en el módulo de Mensaje Mágico. Este proceso puede tardar unos segundos dependiendo de la complejidad del mensaje.
                </p>
                <div className="mt-3 bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <h4 className="text-sm font-medium text-blue-800 mb-1">¿Qué está haciendo la IA?</h4>
                  <ul className="text-xs space-y-1 text-blue-700">
                    <li>• Identificando al cliente en el mensaje</li>
                    <li>• Detectando productos mencionados</li>
                    <li>• Determinando cantidades solicitadas</li>
                    <li>• Estructurando la información en un pedido</li>
                  </ul>
                </div>
              </div>
            ) : (
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
            )}
            
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
                    <li>• Verifica que tu clave API de Cohere sea válida y esté activa</li>
                    <li>• Asegúrate de tener saldo suficiente en tu cuenta de Cohere</li>
                    <li>• Configura correctamente la API key en la aplicación</li>
                    <li>• Verifica tu conexión a internet</li>
                  </ul>
                  
                  <div className="flex items-center justify-between pt-2">
                    <a 
                      href="https://dashboard.cohere.com/api-keys" 
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
