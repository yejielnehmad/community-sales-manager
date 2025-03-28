
/**
 * Componente para mostrar información de depuración de las fases de análisis
 * v1.0.1
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Copy } from "lucide-react";

interface MessagesDebugProps {
  phase1Response: string | null;
  phase2Response: string | null;
  phase3Response?: string | null;
}

export const MessagesDebug = ({ phase1Response, phase2Response, phase3Response }: MessagesDebugProps) => {
  const { toast } = useToast();
  const [expandedPhases, setExpandedPhases] = useState<Record<string, boolean>>({});

  const copyToClipboard = (text: string, phase: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado",
      description: `Texto de la fase ${phase} copiado al portapapeles`,
    });
  };

  const togglePhase = (phase: string) => {
    setExpandedPhases(prev => ({
      ...prev,
      [phase]: !prev[phase]
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fases de Análisis</CardTitle>
        <CardDescription>
          Detalles del proceso de análisis en diferentes fases
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {phase1Response && (
            <Collapsible 
              open={expandedPhases['phase1']} 
              onOpenChange={() => togglePhase('phase1')}
              className="border rounded-md overflow-hidden"
            >
              <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-2 text-sm font-medium bg-gray-50 hover:bg-gray-100">
                <span className="flex items-center">
                  {expandedPhases['phase1'] ? <ChevronDown className="h-4 w-4 mr-2" /> : <ChevronRight className="h-4 w-4 mr-2" />}
                  Fase 1: Análisis de mensaje
                </span>
                <Button
                  variant="ghost" 
                  size="sm"
                  className="h-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    copyToClipboard(phase1Response, "1");
                  }}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copiar
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="bg-gray-100 p-3 max-h-60 overflow-auto whitespace-pre-wrap text-sm">
                  {phase1Response}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
          
          {phase2Response && (
            <Collapsible 
              open={expandedPhases['phase2']} 
              onOpenChange={() => togglePhase('phase2')}
              className="border rounded-md overflow-hidden"
            >
              <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-2 text-sm font-medium bg-gray-50 hover:bg-gray-100">
                <span className="flex items-center">
                  {expandedPhases['phase2'] ? <ChevronDown className="h-4 w-4 mr-2" /> : <ChevronRight className="h-4 w-4 mr-2" />}
                  Fase 2: Estructuración JSON
                </span>
                <Button
                  variant="ghost" 
                  size="sm"
                  className="h-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    copyToClipboard(phase2Response, "2");
                  }}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copiar
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="bg-gray-100 p-3 max-h-60 overflow-auto whitespace-pre-wrap text-sm">
                  {phase2Response}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {phase3Response && (
            <Collapsible 
              open={expandedPhases['phase3']} 
              onOpenChange={() => togglePhase('phase3')}
              className="border rounded-md overflow-hidden"
            >
              <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-2 text-sm font-medium bg-gray-50 hover:bg-gray-100">
                <span className="flex items-center">
                  {expandedPhases['phase3'] ? <ChevronDown className="h-4 w-4 mr-2" /> : <ChevronRight className="h-4 w-4 mr-2" />}
                  Fase 3: Corrección de JSON
                </span>
                <Button
                  variant="ghost" 
                  size="sm"
                  className="h-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    copyToClipboard(phase3Response, "3");
                  }}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copiar
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="bg-gray-100 p-3 max-h-60 overflow-auto whitespace-pre-wrap text-sm">
                  {phase3Response}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
