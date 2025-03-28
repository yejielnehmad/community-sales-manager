
import { Badge } from "@/components/ui/badge";
import { useEffect, useState, useRef } from "react";
import { Sparkles, Loader2, AlertCircle, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { logDebug } from "@/lib/debug-utils";

interface AIStatusBadgeProps {
  initialStatus?: "connected" | "disconnected" | "analyzing" | "completed" | "error";
  initialMessage?: string;
  initialDetailedInfo?: string;
}

const AIStatusBadge = ({
  initialStatus = "connected",
  initialMessage = "IA",
  initialDetailedInfo = "Conexión exitosa con Gemini API",
}: AIStatusBadgeProps) => {
  const [status, setStatus] = useState(initialStatus);
  const [message, setMessage] = useState(initialMessage);
  const [detailedInfo, setDetailedInfo] = useState(initialDetailedInfo);
  const [tokenId, setTokenId] = useState<string | null>(null);
  const [activeSubscription, setActiveSubscription] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Si el estado cambia, emitimos un evento para notificar a otros componentes
  const statusRef = useRef(status);
  
  useEffect(() => {
    statusRef.current = status;
    
    // Crear un evento personalizado para notificar el cambio de estado
    const event = new CustomEvent('aiStatusChange', {
      detail: { status, message, detailedInfo, tokenId }
    });
    window.dispatchEvent(event);
    
    // Guardamos el estado actual en sessionStorage para mantenerlo entre navegaciones
    if (status === "analyzing") {
      sessionStorage.setItem('aiStatus', status);
      sessionStorage.setItem('aiMessage', message);
      sessionStorage.setItem('aiDetailedInfo', detailedInfo);
      if (tokenId) {
        sessionStorage.setItem('aiTokenId', tokenId);
      }
    } else if (status === "completed" || status === "error") {
      // No eliminar los datos de la sesión inmediatamente para permitir navegar a los resultados
      sessionStorage.setItem('aiStatus', status);
      sessionStorage.setItem('aiMessage', message);
      sessionStorage.setItem('aiDetailedInfo', detailedInfo);
      if (tokenId) {
        sessionStorage.setItem('aiTokenId', tokenId);
      }
    } else {
      sessionStorage.removeItem('aiStatus');
      sessionStorage.removeItem('aiMessage');
      sessionStorage.removeItem('aiDetailedInfo');
      sessionStorage.removeItem('aiTokenId');
    }
  }, [status, message, detailedInfo, tokenId]);

  // Suscribirse a cambios en el estado del análisis en la base de datos
  useEffect(() => {
    // Restaurar el estado desde sessionStorage si existe
    const savedStatus = sessionStorage.getItem('aiStatus');
    const savedMessage = sessionStorage.getItem('aiMessage');
    const savedDetailedInfo = sessionStorage.getItem('aiDetailedInfo');
    const savedTokenId = sessionStorage.getItem('aiTokenId');
    
    if (savedStatus) {
      setStatus(savedStatus as any);
      if (savedMessage) setMessage(savedMessage);
      if (savedDetailedInfo) setDetailedInfo(savedDetailedInfo);
      if (savedTokenId) setTokenId(savedTokenId);
      
      // Si hay un análisis en curso, suscribirse a sus actualizaciones
      if (savedStatus === "analyzing" && savedTokenId) {
        subscribeToAnalysis(savedTokenId);
      }
    }
    
    // Evento para escuchar análisis de mensajes en proceso
    const handleAnalysisStateChange = (event: CustomEvent) => {
      const { isAnalyzing, stage, ordersCount, status: eventStatus, tokenId: eventTokenId, error } = event.detail;
      
      logDebug("AIStatusBadge", `Evento de análisis detectado: ${isAnalyzing ? "Analizando" : "Finalizado"}, ${stage || ""}`);
      
      if (eventStatus === "error") {
        setStatus("error");
        setMessage("Error");
        setDetailedInfo(error || "Error en el análisis");
        if (eventTokenId) {
          setTokenId(eventTokenId);
        }
        return;
      }
      
      if (isAnalyzing) {
        setStatus("analyzing");
        setMessage("IA");
        setDetailedInfo(`Análisis en proceso: ${stage || "Procesando mensaje"}`);
        
        // Si se proporciona un tokenId, suscribirse a sus actualizaciones
        if (eventTokenId && eventTokenId !== tokenId) {
          setTokenId(eventTokenId);
          subscribeToAnalysis(eventTokenId);
        }
      } else if (statusRef.current === "analyzing") {
        // Si hay órdenes detectadas, incluirlas en el mensaje
        if (ordersCount > 0) {
          setStatus("completed");
          setMessage("IA");
          setDetailedInfo(`¡Análisis completado! Se detectaron ${ordersCount} pedido(s)`);
          
          // Después de 30 segundos, volver al estado normal si no se ha navegado a la página de resultados
          setTimeout(() => {
            if (statusRef.current === "completed") {
              setStatus("connected");
              setMessage("IA");
              setDetailedInfo("Conexión exitosa con Gemini API");
              sessionStorage.removeItem('aiStatus');
              sessionStorage.removeItem('aiMessage');
              sessionStorage.removeItem('aiDetailedInfo');
              sessionStorage.removeItem('aiTokenId');
            }
          }, 30000);
        } else {
          setStatus("connected");
          setMessage("IA");
          setDetailedInfo("Conexión exitosa con Gemini API");
        }
      }
    };

    // Suscribirse a los cambios de estado del análisis en la base de datos
    const subscribeToAnalysis = (analysisTokenId: string) => {
      if (activeSubscription) {
        return; // Evitar múltiples suscripciones
      }
      
      logDebug("AIStatusBadge", `Suscribiéndose a actualizaciones del análisis con token: ${analysisTokenId}`);
      
      const channel = supabase
        .channel(`analysis-status-${analysisTokenId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'analysis_status',
            filter: `token_id=eq.${analysisTokenId}`,
          },
          (payload) => {
            const { new: newData } = payload;
            logDebug("AIStatusBadge", `Actualización recibida para análisis: ${newData.status}, progreso: ${newData.progress}%, etapa: ${newData.stage || "N/A"}`);
            
            if (newData.status === "analyzing") {
              setStatus("analyzing");
              setMessage("IA");
              setDetailedInfo(`Análisis en proceso: ${newData.stage || "Procesando"} (${newData.progress}%)`);
            } else if (newData.status === "completed") {
              setStatus("completed");
              setMessage("IA");
              setDetailedInfo(`¡Análisis completado!`);
              
              // Notificar al usuario
              toast({
                title: "Análisis completado",
                description: "El análisis de mensaje mágico ha finalizado. Haz clic para ver los resultados.",
                variant: "success",
                onClick: () => navigate("/magic-order")
              });
              
              // Cancelar la suscripción después de completado
              supabase.removeChannel(channel);
              setActiveSubscription(false);
            } else if (newData.status === "error") {
              setStatus("error");
              setMessage("Error");
              setDetailedInfo(newData.error_message || "Error en el análisis");
              
              // Notificar al usuario
              toast({
                title: "Error en el análisis",
                description: newData.error_message || "Ocurrió un error durante el análisis del mensaje",
                variant: "destructive"
              });
              
              // Cancelar la suscripción después de error
              supabase.removeChannel(channel);
              setActiveSubscription(false);
            }
          }
        )
        .subscribe();
      
      setActiveSubscription(true);
      
      return () => {
        supabase.removeChannel(channel);
        setActiveSubscription(false);
      };
    };

    // Añadir el listener para el evento personalizado
    window.addEventListener('analysisStateChange', handleAnalysisStateChange as EventListener);
    
    // Debug para verificar que el listener se ha registrado
    logDebug("AIStatusBadge", "Registrado listener para evento analysisStateChange");
    
    return () => {
      window.removeEventListener('analysisStateChange', handleAnalysisStateChange as EventListener);
      logDebug("AIStatusBadge", "Eliminado listener para evento analysisStateChange");
    };
  }, [navigate, toast, activeSubscription]);

  // Manejador para el clic en la insignia
  const handleBadgeClick = () => {
    if (status === "analyzing" || status === "completed") {
      // Solo navegar a la página de Magic Order si está analizando o completado
      navigate("/magic-order");
    }
  };

  // Aplicamos las clases según el estado actual
  let badgeVariant: "default" | "analyzing" | "custom" = "default";
  let badgeClasses = "cursor-pointer rounded-full px-4 shadow-sm transition-all hover:shadow-md flex items-center gap-1.5";
  
  if (status === "analyzing") {
    badgeVariant = "analyzing";
    badgeClasses += " bg-blue-500 hover:bg-blue-600 text-white";
  } else if (status === "completed") {
    badgeVariant = "custom";
    badgeClasses += " bg-green-500 hover:bg-green-600 text-white";
  } else if (status === "error") {
    badgeVariant = "custom";
    badgeClasses += " bg-red-500 hover:bg-red-600 text-white";
  } else {
    badgeVariant = "custom";
    badgeClasses += " bg-yellow-400 hover:bg-yellow-500 text-black";
  }

  return (
    <Badge 
      variant={badgeVariant} 
      className={badgeClasses}
      onClick={handleBadgeClick}
      title={detailedInfo}
    >
      {status === "analyzing" ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : status === "completed" ? (
        <Check className="h-3.5 w-3.5" />
      ) : status === "error" ? (
        <AlertCircle className="h-3.5 w-3.5" />
      ) : (
        <Sparkles className="h-3.5 w-3.5" />
      )}
      {message}
    </Badge>
  );
};

// Exportamos tanto por defecto como un named export para flexibilidad
export { AIStatusBadge };
export default AIStatusBadge;
