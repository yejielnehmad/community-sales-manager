
import { Badge } from "@/components/ui/badge";
import { useEffect, useState, useRef } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AIStatusBadgeProps {
  initialStatus?: "connected" | "disconnected" | "analyzing" | "generating";
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
    if (status === "analyzing" || status === "generating") {
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
    
    if (savedStatus === "analyzing" || savedStatus === "generating") {
      setStatus(savedStatus as "analyzing" | "generating");
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
    
    // Evento para escuchar generación de ejemplos en proceso
    const handleExampleGenerationStateChange = (event: CustomEvent) => {
      const { isGenerating, stage, progress, error, exampleCount } = event.detail;
      
      console.log("Evento de generación de ejemplos detectado:", isGenerating ? "Generando" : "Finalizado", stage || "");
      
      if (isGenerating) {
        setStatus("generating");
        setMessage("IA");
        setDetailedInfo(`Generando ejemplos: ${stage || "Procesando..."}`);
        
        // Guardar también en sessionStorage para persistir entre navegaciones
        sessionStorage.setItem('aiStatus', "generating");
        sessionStorage.setItem('aiMessage', "IA");
        sessionStorage.setItem('aiDetailedInfo', `Generando ejemplos: ${stage || "Procesando..."}`);
      } else if (statusRef.current === "generating") {
        if (error) {
          // Si hay un error
          setStatus("connected");
          setMessage("IA");
          setDetailedInfo(`Error: ${error.substring(0, 30)}...`);
          
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
        } else if (exampleCount) {
          // Si la generación fue exitosa
          setStatus("connected");
          setMessage("IA");
          setDetailedInfo(`¡Ejemplos generados! ${exampleCount} pedidos`);
          
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
          // Generación finalizada sin información específica
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

    // Añadir los listeners para los eventos personalizados
    window.addEventListener('analysisStateChange', handleAnalysisStateChange as EventListener);
    window.addEventListener('exampleGenerationStateChange', handleExampleGenerationStateChange as EventListener);
    
    // Debug para verificar que los listeners se han registrado
    console.log("AIStatusBadge: Registrado listener para eventos analysisStateChange y exampleGenerationStateChange");
    
    return () => {
      window.removeEventListener('analysisStateChange', handleAnalysisStateChange as EventListener);
      window.removeEventListener('exampleGenerationStateChange', handleExampleGenerationStateChange as EventListener);
      console.log("AIStatusBadge: Eliminado listener para eventos analysisStateChange y exampleGenerationStateChange");
    };
  }, []);

  // Manejador para el clic en la insignia
  const handleBadgeClick = () => {
    if (status === "analyzing") {
      // Solo navegar a la página de Magic Order si está analizando
      navigate("/magic-order");
    } else if (status === "generating") {
      // Podemos enviar a la misma página porque ahí se muestra el generador
      navigate("/magic-order");
    }
  };

  // Aplicamos las clases según el estado actual
  const badgeClasses = "cursor-pointer rounded-full px-4 shadow-sm transition-all hover:shadow-md flex items-center gap-1.5" + 
    (status === "analyzing" ? " bg-blue-500 hover:bg-blue-600 text-white" : 
     status === "generating" ? " bg-amber-500 hover:bg-amber-600 text-white" : 
     " bg-yellow-400 hover:bg-yellow-500 text-black");

  return (
    <Badge 
      variant={status === "analyzing" ? "analyzing" : 
              status === "generating" ? "custom" : "custom"} 
      className={badgeClasses}
      onClick={handleBadgeClick}
      title={detailedInfo}
    >
      {status === "analyzing" || status === "generating" ? (
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
