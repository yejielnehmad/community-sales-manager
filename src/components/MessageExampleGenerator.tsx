
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  // Ejemplos predefinidos más naturales y variados
  const predefinedExamples = [
    "Hola buenas tardes, soy Carolina Gómez. Te escribo para hacer un pedido. Necesito 2 kg de carne molida, 1.5 kg de milanesas, un paquete grande de fideos tirabuzón y tres paquetes de arroz. ¿Podrías confirmarme si tiene todo eso disponible? Gracias!",
    
    "Buenas! Juan Martínez acá. Quiero pedir: 2 jabones de glicerina, 3 paquetes de pañales Pampers talle 3 (los amarillos), 4 rollos de papel higiénico y si tienen, un champú para pelo rizado. Lo necesito para mañana si es posible. Un abrazo",
    
    "Hola soy Marta del 3B. Te hago el pedido mensual: 5 botellas de jugo de naranja, 2kg de naranjas, 1kg de manzanas rojas y 3 lechugas. Si tienen las frutillas frescas que me comentaste la otra vez, sumame un kilo también. Avísame cuánto sería todo.",
    
    "Qué tal? Te habla Luis Fernández. Para mañana necesitaría 2 bolsas de leche en polvo (las de 800g), 1 caja de cereales de chocolate y 3 yogures enteros sabor frutilla. También si tenés queso cremoso, cortame 250g. Después paso a buscar el pedido a eso de las 5, te sirve?",
    
    "Buen día! Daniela Suárez te escribe. Quería saber si podés apartarme: 2 paquetes de café molido, una crema de leche, 500g de queso rallado y un aceite de oliva extra virgen. También me gustaría un kilo de tomates si tienen frescos. ¡Gracias por tu atención!"
  ];

  return (
    <Card className="w-full mb-4">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-500" />
          Ejemplos de mensajes
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
        
        <div className="space-y-3">
          {(examplesList.length > 0 ? examplesList : predefinedExamples).map((example, index) => (
            <div 
              key={index} 
              className="p-3 border rounded-md transition-all duration-200 hover:bg-muted/30 hover:shadow-sm"
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-medium flex items-center gap-1">
                  <span className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-xs">
                    {index + 1}
                  </span>
                  Ejemplo 
                </span>
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
      </CardContent>
    </Card>
  );
};
