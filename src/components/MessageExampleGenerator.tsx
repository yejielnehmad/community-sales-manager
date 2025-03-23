
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, Copy, Check } from "lucide-react";
import { generateMultipleExamples } from "@/services/aiLabsService";
import { useToast } from "@/hooks/use-toast";

interface MessageExampleGeneratorProps {
  onSelectExample: (text: string) => void;
}

export const MessageExampleGenerator = ({ onSelectExample }: MessageExampleGeneratorProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [examples, setExamples] = useState<string>("");
  const [isCopied, setIsCopied] = useState(false);
  const { toast } = useToast();

  const handleGenerateExamples = async () => {
    setIsGenerating(true);
    try {
      const generatedExamples = await generateMultipleExamples(5);
      setExamples(generatedExamples);
    } catch (error) {
      console.error("Error al generar ejemplos:", error);
      toast({
        title: "Error",
        description: "No se pudieron generar los ejemplos",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(examples);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
    
    toast({
      title: "Copiado",
      description: "Ejemplos copiados al portapapeles",
    });
  };

  const handleUseExample = (example: string) => {
    onSelectExample(example);
    
    toast({
      title: "Ejemplo seleccionado",
      description: "El ejemplo ha sido cargado en el campo de mensaje",
    });
  };

  // Dividir los ejemplos en un array
  const examplesList = examples ? examples.split("\n\n---\n\n") : [];

  return (
    <Card className="w-full mb-4">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-500" />
          Generador de Ejemplos (IA Labs)
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
                Generando...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generar 5 ejemplos
              </>
            )}
          </Button>
          
          {examples && (
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
                  Copiar todo
                </>
              )}
            </Button>
          )}
        </div>
        
        {examplesList.length > 0 && (
          <div className="space-y-3">
            {examplesList.map((example, index) => (
              <div key={index} className="p-3 border rounded-md hover:bg-muted/30 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-medium">Ejemplo {index + 1}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6"
                    onClick={() => handleUseExample(example)}
                  >
                    Usar este
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">{example}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
