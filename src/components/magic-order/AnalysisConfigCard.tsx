
import { Clock, Sparkles } from 'lucide-react';
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { APP_VERSION } from "@/lib/app-config";

interface AnalysisConfigCardProps {
  analysisTime: number | null;
}

export const AnalysisConfigCard = ({ analysisTime }: AnalysisConfigCardProps) => {
  // Función para formatear el tiempo en una manera legible
  const formatAnalysisTime = (timeInMs: number | null): string => {
    if (timeInMs === null) return "N/A";
    if (timeInMs < 1000) return `${Math.round(timeInMs)}ms`;
    return `${(timeInMs / 1000).toFixed(2)}s`;
  };

  return (
    <Card className="rounded-xl shadow-sm overflow-hidden">
      <CardHeader className="py-3">
        <CardTitle className="text-base">Configuración de la IA</CardTitle>
      </CardHeader>
      <CardContent className="pb-3 pt-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Proveedor de IA</label>
            <div className="rounded px-3 py-2 border bg-muted/50">
              Google Gemini 
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium mb-1 block">Modelo</label>
            <div className="rounded px-3 py-2 border bg-muted/50 flex items-center gap-2">
              <Sparkles size={14} className="text-amber-500" />
              Gemini 2.0 Flash
            </div>
          </div>
        </div>
        
        {/* Tiempo de análisis - siempre visible */}
        <div className="mt-3 text-sm flex items-center gap-1 text-muted-foreground">
          <Clock size={14} className="mr-1" />
          <span>Tiempo de análisis: <span className="font-medium">{formatAnalysisTime(analysisTime || 0)}</span></span>
        </div>
        
        {/* Versión de la aplicación */}
        <div className="mt-1 text-xs text-muted-foreground/70">
          Versión: {APP_VERSION} • Procesamiento en segundo plano activado
        </div>
      </CardContent>
    </Card>
  );
};
