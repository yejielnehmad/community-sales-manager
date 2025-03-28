
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Sparkles, Copy, Check, Timer, Clock } from "lucide-react";
import { generateMultipleExamples } from "@/services/aiLabsService";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface MessageExampleGeneratorProps {
  onSelectExample: (text: string) => void;
}

export const MessageExampleGenerator = ({ onSelectExample }: MessageExampleGeneratorProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [example, setExample] = useState<string>("");
  const [isCopied, setIsCopied] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStage, setGenerationStage] = useState<string>("");
  const [elapsedTime, setElapsedTime] = useState(0);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null);
  
  // Referencia para el intervalo del cronómetro
  const timerIntervalRef = useRef<number | null>(null);
  // Referencia para el tiempo de inicio
  const startTimeRef = useRef<number | null>(null);
  
  // Función para formatear el tiempo en formato mm:ss
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Iniciamos el cronómetro
  const startTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    
    setElapsedTime(0);
    startTimeRef.current = Date.now();
    
    timerIntervalRef.current = window.setInterval(() => {
      const now = Date.now();
      const startTime = startTimeRef.current || now;
      const elapsed = Math.floor((now - startTime) / 1000);
      setElapsedTime(elapsed);
      
      // Calculamos el tiempo estimado restante basándonos en el progreso
      if (generationProgress > 10 && generationProgress < 95) {
        const percentComplete = generationProgress / 100;
        if (percentComplete > 0) {
          const totalEstimatedTime = elapsed / percentComplete;
          const remaining = totalEstimatedTime - elapsed;
          setEstimatedTimeRemaining(Math.max(0, Math.round(remaining)));
        }
      } else if (generationProgress >= 95) {
        setEstimatedTimeRemaining(0);
      }
    }, 1000);
  };
  
  // Detenemos el cronómetro
  const stopTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  // Escuchamos el evento de generación para actualizar el estado
  useEffect(() => {
    const handleExampleGenerationEvent = (event: CustomEvent) => {
      const { isGenerating, stage, progress, error } = event.detail;
      
      console.log(`Evento de generación recibido: ${isGenerating ? 'Generando' : 'Completado'}, Etapa: ${stage}, Progreso: ${progress}`);
      
      if (progress !== undefined) {
        setGenerationProgress(progress);
      }
      
      if (stage) {
        setGenerationStage(stage);
      }
      
      if (!isGenerating && progress === 100) {
        // Completado exitosamente
        stopTimer();
        setTimeout(() => setIsGenerating(false), 500);
      } else if (!isGenerating && error) {
        // Error en la generación
        stopTimer();
        setAlertMessage(`Error: ${error}`);
        setIsGenerating(false);
        setGenerationProgress(0);
      }
    };
    
    window.addEventListener('exampleGenerationStateChange', handleExampleGenerationEvent as EventListener);
    
    return () => {
      window.removeEventListener('exampleGenerationStateChange', handleExampleGenerationEvent as EventListener);
      stopTimer();
    };
  }, []);

  const handleGenerateExamples = async () => {
    setIsGenerating(true);
    setGenerationProgress(5);
    setGenerationStage("Iniciando generación...");
    setExample("");
    
    // Iniciamos el cronómetro
    startTimer();
    
    try {
      // Generamos un mensaje de ejemplo basado en los clientes y productos reales
      // Ahora configurado para generar 15 pedidos con 85% precisión
      const generatedExample = await generateMultipleExamples(15, 0.85);
      
      // La actualización de progreso ahora se maneja a través de eventos
      // que emite la función generateMultipleExamples
      
      setExample(generatedExample);
    } catch (error) {
      console.error("Error al generar ejemplo:", error);
      setAlertMessage("No se pudo generar el ejemplo. Por favor, intenta nuevamente.");
      setIsGenerating(false);
      setGenerationProgress(0);
      stopTimer();
    }
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(example);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
    
    setAlertMessage("Ejemplo copiado al portapapeles");
  };

  const handleUseExample = () => {
    onSelectExample(example);
    
    setAlertMessage("El ejemplo ha sido cargado en el campo de mensaje");
  };

  return (
    <Card className="w-full mb-4">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-500" />
          Ejemplo de mensaje (15 pedidos)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between">
          <Button 
            onClick={handleGenerateExamples}
            disabled={isGenerating}
            className="flex items-center gap-2"
            variant="outline"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generando con IA...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generar con IA
              </>
            )}
          </Button>
          
          {example && (
            <Button 
              onClick={handleCopyToClipboard}
              variant="ghost"
              size="sm"
              className="flex items-center gap-2"
            >
              {isCopied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copiar
                </>
              )}
            </Button>
          )}
        </div>
        
        {isGenerating && (
          <div className="w-full mb-4">
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {generationStage || (
                    generationProgress < 50 ? "Preparando ejemplos (15 pedidos)..." : 
                    generationProgress < 75 ? "Procesando datos..." : 
                    generationProgress < 95 ? "Finalizando..." : 
                    "¡Completado!"
                  )}
                </span>
                
                <Badge variant="custom" className="bg-amber-500 text-white flex items-center gap-1">
                  <Timer className="h-3 w-3" />
                  <span>{formatTime(elapsedTime)}</span>
                </Badge>
                
                {estimatedTimeRemaining !== null && (
                  <Badge variant="custom" className="bg-blue-500 text-white flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>Restante: ~{formatTime(estimatedTimeRemaining)}</span>
                  </Badge>
                )}
              </div>
              <span className="text-sm font-medium">{Math.round(generationProgress)}%</span>
            </div>
            <Progress value={generationProgress} className="h-2" />
          </div>
        )}
        
        {!example && !isGenerating && (
          <div className="text-center p-6 border border-dashed rounded-md">
            <Sparkles className="h-8 w-8 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">
              Haz clic en "Generar con IA" para crear un ejemplo de mensaje con 15 pedidos de clientes (85% de precisión, 15% confuso).
            </p>
          </div>
        )}
        
        {isGenerating && !example && generationProgress < 100 && (
          <div className="text-center p-6 border border-dashed rounded-md animate-pulse">
            <Loader2 className="h-8 w-8 mx-auto mb-3 text-primary/50 animate-spin" />
            <p className="text-sm text-muted-foreground">
              Generando mensaje de ejemplo con 15 pedidos...
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Tiempo transcurrido: {formatTime(elapsedTime)}
              {estimatedTimeRemaining !== null && ` • Tiempo restante estimado: ~${formatTime(estimatedTimeRemaining)}`}
            </p>
          </div>
        )}
        
        {example && (
          <div 
            className="p-3 border rounded-md transition-all duration-200 hover:bg-muted/30 hover:shadow-sm"
          >
            <div className="flex justify-between items-start mb-2">
              <span className="text-sm font-medium flex items-center gap-1">
                <span className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-xs">
                  1
                </span>
                Ejemplo (15 pedidos - 85% precisión) 
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="h-6"
                onClick={() => handleUseExample()}
              >
                Usar este
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">{example}</p>
          </div>
        )}
      </CardContent>

      {/* Diálogo para mensajes de alerta */}
      <AlertDialog 
        open={alertMessage !== null}
        onOpenChange={(open) => !open && setAlertMessage(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Información</AlertDialogTitle>
            <AlertDialogDescription>
              {alertMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>Aceptar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
