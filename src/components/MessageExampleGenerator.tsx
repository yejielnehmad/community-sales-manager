
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Sparkles, Copy, Check, Timer, Clock, AlertCircle, Database } from "lucide-react";
import { generateMultipleExamples } from "@/services/aiLabsService";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { logCardGeneration, logStateOperation } from "@/lib/debug-utils";

interface MessageExampleGeneratorProps {
  onSelectExample: (text: string) => void;
}

// Clave para almacenar ejemplos en localStorage
const STORAGE_KEY_EXAMPLE = 'magicOrder_generatedExample';
const STORAGE_KEY_GENERATION_STATE = 'magicOrder_generationState';
const STORAGE_KEY_LAST_ERROR = 'magicOrder_lastGenerationError';
const STORAGE_KEY_ELAPSED_TIME = 'magicOrder_generationElapsedTime';
const STORAGE_KEY_REMAINING_TIME = 'magicOrder_generationRemainingTime';
const STORAGE_KEY_USE_REAL_DATA = 'magicOrder_useRealData';

// Identificador único para el seguimiento de la generación actual
const GENERATION_ID = `gen_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

export const MessageExampleGenerator = ({ onSelectExample }: MessageExampleGeneratorProps) => {
  // Cargar el estado desde localStorage al iniciar
  const [isGenerating, setIsGenerating] = useState<boolean>(() => {
    const savedState = localStorage.getItem(STORAGE_KEY_GENERATION_STATE);
    return savedState ? JSON.parse(savedState) : false;
  });
  
  const [example, setExample] = useState<string>(() => {
    const savedExample = localStorage.getItem(STORAGE_KEY_EXAMPLE);
    return savedExample || "";
  });
  
  const [isCopied, setIsCopied] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStage, setGenerationStage] = useState<string>("");
  
  const [elapsedTime, setElapsedTime] = useState<number>(() => {
    const savedTime = localStorage.getItem(STORAGE_KEY_ELAPSED_TIME);
    return savedTime ? parseInt(savedTime) : 0;
  });
  
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(() => {
    const savedTime = localStorage.getItem(STORAGE_KEY_REMAINING_TIME);
    return savedTime ? parseInt(savedTime) : null;
  });
  
  const [lastError, setLastError] = useState<string | null>(() => {
    const savedError = localStorage.getItem(STORAGE_KEY_LAST_ERROR);
    return savedError || null;
  });
  
  const [useRealData, setUseRealData] = useState<boolean>(() => {
    const savedSetting = localStorage.getItem(STORAGE_KEY_USE_REAL_DATA);
    return savedSetting ? JSON.parse(savedSetting) : true; // Por defecto, usamos datos reales
  });
  
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
  
  // Guardar el estado en localStorage cuando cambie
  useEffect(() => {
    if (example) {
      localStorage.setItem(STORAGE_KEY_EXAMPLE, example);
      logStateOperation('save', STORAGE_KEY_EXAMPLE, true, { length: example.length });
    }
  }, [example]);
  
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_GENERATION_STATE, JSON.stringify(isGenerating));
    logStateOperation('save', STORAGE_KEY_GENERATION_STATE, true, { isGenerating });
  }, [isGenerating]);
  
  useEffect(() => {
    if (lastError) {
      localStorage.setItem(STORAGE_KEY_LAST_ERROR, lastError);
      logStateOperation('save', STORAGE_KEY_LAST_ERROR, true, { hasError: true });
    } else if (localStorage.getItem(STORAGE_KEY_LAST_ERROR)) {
      localStorage.removeItem(STORAGE_KEY_LAST_ERROR);
      logStateOperation('save', STORAGE_KEY_LAST_ERROR, true, { hasError: false });
    }
  }, [lastError]);
  
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_ELAPSED_TIME, elapsedTime.toString());
  }, [elapsedTime]);
  
  useEffect(() => {
    if (estimatedTimeRemaining !== null) {
      localStorage.setItem(STORAGE_KEY_REMAINING_TIME, estimatedTimeRemaining.toString());
    } else if (localStorage.getItem(STORAGE_KEY_REMAINING_TIME)) {
      localStorage.removeItem(STORAGE_KEY_REMAINING_TIME);
    }
  }, [estimatedTimeRemaining]);
  
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_USE_REAL_DATA, JSON.stringify(useRealData));
  }, [useRealData]);
  
  // Iniciar el temporizador cuando el componente se monte si estaba generando
  useEffect(() => {
    if (isGenerating) {
      startTimer();
    }
    
    return () => {
      stopTimer();
    };
  }, []);
  
  // Iniciamos el cronómetro
  const startTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    
    // Si ya tenemos un tiempo guardado, lo usamos como base
    const startTime = Date.now() - (elapsedTime * 1000);
    startTimeRef.current = startTime;
    
    timerIntervalRef.current = window.setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - (startTimeRef.current || now)) / 1000);
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
      const { isGenerating: isGen, stage, progress, error } = event.detail;
      
      console.log(`Evento de generación recibido: ${isGen ? 'Generando' : 'Completado'}, Etapa: ${stage}, Progreso: ${progress}`);
      
      if (progress !== undefined) {
        setGenerationProgress(progress);
      }
      
      if (stage) {
        setGenerationStage(stage);
      }
      
      if (error) {
        setLastError(error);
        logCardGeneration(GENERATION_ID, 'error', { error, elapsedTime });
      }
      
      if (!isGen && progress === 100) {
        // Completado exitosamente
        stopTimer();
        setTimeout(() => {
          setIsGenerating(false);
          // Registrar la finalización exitosa
          logCardGeneration(GENERATION_ID, 'completed', { 
            processingTime: elapsedTime,
            elapsedTime,
            estimatedTimeRemaining
          });
        }, 500);
      } else if (!isGen && error) {
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
      // No detenemos el temporizador aquí, ya que queremos que siga funcionando
      // incluso si el usuario navega fuera de la página
    };
  }, [elapsedTime]);

  const handleGenerateExamples = async () => {
    setIsGenerating(true);
    setGenerationProgress(5);
    setGenerationStage("Iniciando generación...");
    setLastError(null);
    
    // Mantenemos el ejemplo anterior hasta que se genere uno nuevo
    // Así si hay un error, el usuario aún puede ver el ejemplo anterior
    
    // Registrar inicio de generación
    logCardGeneration(GENERATION_ID, 'started', { 
      timestamp: new Date().toISOString(),
      useRealData
    });
    
    // Iniciamos el cronómetro
    startTimer();
    
    try {
      // Generamos un mensaje de ejemplo basado en los clientes y productos reales
      // Ahora configurado para generar 7 pedidos si usamos datos reales, o 5 si no
      const generatedExample = await generateMultipleExamples(
        useRealData ? 7 : 5,  // 7 pedidos con datos reales, 5 con datos ficticios
        0.85,                 // 85% de precisión
        useRealData           // Indicamos si usamos datos reales
      );
      
      // La actualización de progreso ahora se maneja a través de eventos
      // que emite la función generateMultipleExamples
      
      // Verificamos si la respuesta contiene un mensaje de error
      if (generatedExample.startsWith("Error")) {
        console.error("Error devuelto por generateMultipleExamples:", generatedExample);
        setAlertMessage(generatedExample);
        // No limpiamos el ejemplo anterior si hay un error
      } else {
        setExample(generatedExample);
      }
    } catch (error) {
      console.error("Error al generar ejemplo:", error);
      setAlertMessage("No se pudo generar el ejemplo. Por favor, intenta nuevamente.");
      // No limpiamos el ejemplo anterior si hay un error
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
  
  const handleToggleDataSource = () => {
    setUseRealData(!useRealData);
  };

  return (
    <Card className="w-full mb-4">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-500" />
          Ejemplo de mensaje ({useRealData ? '7 pedidos reales' : '5 pedidos'})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center space-x-2">
            <Switch
              id="use-real-data"
              checked={useRealData}
              onCheckedChange={handleToggleDataSource}
              disabled={isGenerating}
            />
            <label
              htmlFor="use-real-data"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center"
            >
              <Database className="h-4 w-4 mr-1 text-primary" />
              Usar datos reales
            </label>
            
            {useRealData && (
              <Badge variant="outline" className="ml-2 text-xs">
                Clientes y productos de la base de datos
              </Badge>
            )}
          </div>
        </div>
      
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
                Generar {useRealData ? 'con datos reales' : 'con IA'}
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
                    generationProgress < 50 ? 
                      useRealData ? "Preparando ejemplos con datos reales..." : "Preparando ejemplos..." : 
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
        
        {lastError && !isGenerating && (
          <div className="text-center p-4 border border-red-200 bg-red-50 rounded-md text-red-800 flex flex-col items-center gap-2">
            <AlertCircle className="h-6 w-6 text-red-600" />
            <div>
              <p className="font-medium">Error al generar ejemplo</p>
              <p className="text-sm mt-1">{lastError}</p>
            </div>
            <p className="text-xs text-red-600 mt-2">
              Se mantiene el ejemplo anterior (si existe). Puedes intentar nuevamente o utilizar el ejemplo existente.
            </p>
          </div>
        )}
        
        {!example && !isGenerating && !lastError && (
          <div className="text-center p-6 border border-dashed rounded-md">
            <Sparkles className="h-8 w-8 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">
              Haz clic en "Generar {useRealData ? 'con datos reales' : 'con IA'}" para crear un ejemplo de mensaje con {useRealData ? '7 pedidos de clientes reales' : '5 pedidos de clientes'} (85% de precisión, 15% confuso).
            </p>
          </div>
        )}
        
        {isGenerating && !example && generationProgress < 100 && (
          <div className="text-center p-6 border border-dashed rounded-md animate-pulse">
            <Loader2 className="h-8 w-8 mx-auto mb-3 text-primary/50 animate-spin" />
            <p className="text-sm text-muted-foreground">
              Generando mensaje de ejemplo con {useRealData ? '7 pedidos de clientes reales' : '5 pedidos de clientes'}...
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
                Ejemplo ({useRealData ? '7 pedidos reales' : '5 pedidos'} - 85% precisión) 
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
