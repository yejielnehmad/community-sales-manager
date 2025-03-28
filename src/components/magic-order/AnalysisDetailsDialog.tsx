
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AnalysisDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phase1Response: string | null;
  phase2Response: string | null;
  phase3Response: string | null;
  rawJsonResponse: string | null;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const AnalysisDetailsDialog = ({
  open,
  onOpenChange,
  phase1Response,
  phase2Response,
  phase3Response,
  rawJsonResponse,
  activeTab,
  onTabChange
}: AnalysisDetailsDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Análisis en detalle</DialogTitle>
          <DialogDescription>
            Revisa cómo se procesó el mensaje del cliente
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue={activeTab} onValueChange={onTabChange}>
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="phase1">Fase 1: Preprocesamiento</TabsTrigger>
            <TabsTrigger value="phase2">Fase 2: Análisis de intenciones</TabsTrigger>
            <TabsTrigger value="phase3">Fase 3: Estructuración</TabsTrigger>
          </TabsList>
          
          <TabsContent value="phase1" className="space-y-4 mt-4">
            <div className="border rounded-md p-4 text-sm font-mono whitespace-pre-wrap text-muted-foreground">
              {phase1Response || "No hay datos disponibles para esta fase."}
            </div>
          </TabsContent>
          
          <TabsContent value="phase2" className="space-y-4 mt-4">
            <div className="border rounded-md p-4 text-sm font-mono whitespace-pre-wrap text-muted-foreground">
              {phase2Response || "No hay datos disponibles para esta fase."}
            </div>
          </TabsContent>
          
          <TabsContent value="phase3" className="space-y-4 mt-4">
            <div className="border rounded-md p-4 text-sm font-mono whitespace-pre-wrap text-muted-foreground">
              {phase3Response || "No hay datos disponibles para esta fase."}
            </div>
            {rawJsonResponse && (
              <div className="mt-4">
                <h3 className="text-sm font-medium mb-2">Respuesta JSON cruda:</h3>
                <pre className="border rounded-md p-4 text-xs overflow-auto max-h-64">
                  {rawJsonResponse}
                </pre>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
