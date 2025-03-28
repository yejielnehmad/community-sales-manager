
/**
 * Componente para mostrar información de depuración de las fases de análisis
 * v1.0.0
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface MessagesDebugProps {
  phase1Response: string | null;
  phase2Response: string | null;
  phase3Response?: string | null;
}

export const MessagesDebug = ({ phase1Response, phase2Response, phase3Response }: MessagesDebugProps) => {
  const { toast } = useToast();

  const copyToClipboard = (text: string, phase: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado",
      description: `Texto de la fase ${phase} copiado al portapapeles`,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fases de Análisis</CardTitle>
        <CardDescription>
          Detalles del proceso de análisis en dos fases
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {phase1Response && (
            <div>
              <div className="font-medium mb-2">Fase 1: Análisis de mensaje</div>
              <div className="bg-gray-100 p-3 rounded-md overflow-auto max-h-60 whitespace-pre-wrap text-sm">
                {phase1Response}
              </div>
              <Button
                variant="outline" 
                size="sm"
                className="mt-2"
                onClick={() => copyToClipboard(phase1Response, "1")}
              >
                Copiar
              </Button>
            </div>
          )}
          
          {phase2Response && (
            <div>
              <div className="font-medium mb-2">Fase 2: Estructuración JSON</div>
              <div className="bg-gray-100 p-3 rounded-md overflow-auto max-h-60 whitespace-pre-wrap text-sm">
                {phase2Response}
              </div>
              <Button
                variant="outline" 
                size="sm"
                className="mt-2"
                onClick={() => copyToClipboard(phase2Response, "2")}
              >
                Copiar
              </Button>
            </div>
          )}

          {phase3Response && (
            <div>
              <div className="font-medium mb-2">Fase 3: Corrección de JSON</div>
              <div className="bg-gray-100 p-3 rounded-md overflow-auto max-h-60 whitespace-pre-wrap text-sm">
                {phase3Response}
              </div>
              <Button
                variant="outline" 
                size="sm"
                className="mt-2"
                onClick={() => copyToClipboard(phase3Response, "3")}
              >
                Copiar
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
