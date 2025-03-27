
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Sparkles, Copy, Check } from "lucide-react";
import { generateMultipleExamples } from "@/services/aiLabsService";
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

  const handleGenerateExamples = async () => {
    setIsGenerating(true);
    try {
      // Generamos un mensaje de ejemplo basado en los clientes reales
      const generatedExample = await generateMultipleExamples();
      setExample(generatedExample);
    } catch (error) {
      console.error("Error al generar ejemplo:", error);
      setAlertMessage("No se pudo generar el ejemplo. Por favor, intenta nuevamente.");
    } finally {
      setIsGenerating(false);
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
          Ejemplo de mensaje
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
        
        {!example && !isGenerating && (
          <div className="text-center p-6 border border-dashed rounded-md">
            <Sparkles className="h-8 w-8 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">
              Haz clic en "Generar con IA" para crear un ejemplo de mensaje de cliente basado en clientes reales.
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
                Ejemplo 
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

