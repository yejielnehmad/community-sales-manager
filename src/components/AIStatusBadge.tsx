
import { Badge } from "@/components/ui/badge";
import { useEffect, useState, useRef } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AIStatusBadgeProps {
  initialStatus?: "connected" | "disconnected" | "analyzing";
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
  const navigate = useNavigate();

  // Si el estado cambia, emitimos un evento para notificar a otros componentes
  const statusRef = useRef(status);
  useEffect(() => {
    statusRef.current = status;
    
    // Crear un evento personalizado para notificar el cambio de estado
    const event = new CustomEvent('aiStatusChange', {
      detail: { status, message, detailedInfo }
    });
    window.dispatchEvent(event);
    
    // Guardamos el estado actual en sessionStorage para mantenerlo entre navegaciones
    if (status === "analyzing") {
      sessionStorage.setItem('aiStatus', status);
      sessionStorage.setItem('aiMessage', message);
      sessionStorage.setItem('aiDetailedInfo', detailedInfo);
    } else {
      sessionStorage.removeItem('aiStatus');
      sessionStorage.removeItem('aiMessage');
      sessionStorage.removeItem('aiDetailedInfo');
    }
  }, [status, message, detailedInfo]);

  useEffect(() => {
    // Restaurar el estado desde sessionStorage si existe
    const savedStatus = sessionStorage.getItem('aiStatus');
    const savedMessage = sessionStorage.getItem('aiMessage');
    const savedDetailedInfo = sessionStorage.getItem('aiDetailedInfo');
    
    if (savedStatus === "analyzing") {
      setStatus("analyzing");
      if (savedMessage) setMessage(savedMessage);
      if (savedDetailedInfo) setDetailedInfo(savedDetailedInfo);
    }
    
    // Evento para escuchar análisis de mensajes en proceso
    const handleAnalysisStateChange = (event: CustomEvent) => {
      const { isAnalyzing, stage, ordersCount } = event.detail;
      
      console.log("Evento de análisis detectado:", isAnalyzing ? "Analizando" : "Finalizado", stage || "");
      
      if (isAnalyzing) {
        setStatus("analyzing");
        setMessage("IA");
        setDetailedInfo(`Análisis en proceso: ${stage || "Procesando mensaje"}`);
        
        // Guardar también en sessionStorage para persistir entre navegaciones
        sessionStorage.setItem('aiStatus', "analyzing");
        sessionStorage.setItem('aiMessage', "IA");
        sessionStorage.setItem('aiDetailedInfo', `Análisis en proceso: ${stage || "Procesando mensaje"}`);
      } else if (statusRef.current === "analyzing") {
        // Si hay órdenes detectadas, incluirlas en el mensaje
        if (ordersCount > 0) {
          setStatus("connected");
          setMessage("IA");
          setDetailedInfo(`¡Análisis completado! Se detectaron ${ordersCount} pedido(s)`);
          
          // Limpiar sessionStorage
          sessionStorage.removeItem('aiStatus');
          sessionStorage.removeItem('aiMessage');
          sessionStorage.removeItem('aiDetailedInfo');
          
          // Después de 5 segundos, volver al estado normal
          setTimeout(() => {
            setStatus("connected");
            setMessage("IA");
            setDetailedInfo("Conexión exitosa con Gemini API");
          }, 5000);
        } else {
          setStatus("connected");
          setMessage("IA");
          setDetailedInfo("Conexión exitosa con Gemini API");
          
          // Limpiar sessionStorage
          sessionStorage.removeItem('aiStatus');
          sessionStorage.removeItem('aiMessage');
          sessionStorage.removeItem('aiDetailedInfo');
        }
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

  // Manejador para el clic en la insignia
  const handleBadgeClick = () => {
    if (status === "analyzing") {
      // Solo navegar a la página de Magic Order si está analizando
      navigate("/magic-order");
    }
  };

  // Aplicamos las clases según el estado actual
  const badgeClasses = "cursor-pointer rounded-full px-4 shadow-sm transition-all hover:shadow-md flex items-center gap-1.5" + 
    (status === "analyzing" ? " bg-blue-500 hover:bg-blue-600 text-white" : " bg-yellow-400 hover:bg-yellow-500 text-black");

  return (
    <Badge 
      variant={status === "analyzing" ? "analyzing" : "custom"} 
      className={badgeClasses}
      onClick={handleBadgeClick}
      title={detailedInfo}
    >
      {status === "analyzing" ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
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
