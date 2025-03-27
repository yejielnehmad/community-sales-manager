
import { Badge } from "@/components/ui/badge";
import { useEffect, useState, useRef } from "react";

interface AIStatusBadgeProps {
  initialStatus?: "connected" | "disconnected" | "analyzing";
  initialMessage?: string;
  initialDetailedInfo?: string;
}

const AIStatusBadge = ({
  initialStatus = "connected",
  initialMessage = "Cohere conectado correctamente",
  initialDetailedInfo = "Conexión exitosa con Cohere API\nModelo: command-r-plus",
}: AIStatusBadgeProps) => {
  const [status, setStatus] = useState(initialStatus);
  const [message, setMessage] = useState(initialMessage);
  const [detailedInfo, setDetailedInfo] = useState(initialDetailedInfo);

  // Si el estado cambia, emitimos un evento para notificar a otros componentes
  const statusRef = useRef(status);
  useEffect(() => {
    statusRef.current = status;
    
    // Crear un evento personalizado para notificar el cambio de estado
    const event = new CustomEvent('aiStatusChange', {
      detail: { status, message, detailedInfo }
    });
    window.dispatchEvent(event);
  }, [status, message, detailedInfo]);

  useEffect(() => {
    // Evento para escuchar análisis de mensajes en proceso
    const handleAnalysisStateChange = (event: CustomEvent) => {
      const { isAnalyzing, stage } = event.detail;
      
      console.log("Evento de análisis detectado:", isAnalyzing ? "Analizando" : "Finalizado", stage || "");
      
      if (isAnalyzing) {
        setStatus("analyzing");
        setMessage(stage || "Analizando mensaje...");
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

  return (
    <Badge variant={status === "analyzing" ? "analyzing" : "default"} className="cursor-help">
      {message}
    </Badge>
  );
};

// Exportamos tanto por defecto como un named export para flexibilidad
export { AIStatusBadge };
export default AIStatusBadge;
