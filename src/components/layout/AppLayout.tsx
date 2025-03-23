
import { Sidebar } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileAppLayout } from "@/components/layout/MobileAppLayout";
import { APP_VERSION } from "@/App";
import { IAInfoPopover } from "@/components/IAInfoPopover";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { useState } from "react";

export interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  const isMobile = useIsMobile();
  const [showVersionInfo, setShowVersionInfo] = useState(false);

  if (isMobile) {
    return <MobileAppLayout>{children}</MobileAppLayout>;
  }

  return (
    <div className="h-screen flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <div className="p-4 h-14 border-b flex items-center justify-between">
          <div className="text-sm font-medium flex items-center gap-2">
            <button 
              onClick={() => setShowVersionInfo(true)}
              className="text-primary hover:underline cursor-pointer flex items-center"
            >
              Versión <span className="ml-1 font-bold">{APP_VERSION}</span>
            </button>
          </div>
          <IAInfoPopover />
        </div>
        <div className="flex-1 p-6 overflow-auto">{children}</div>
      </div>
      
      <Dialog open={showVersionInfo} onOpenChange={setShowVersionInfo}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novedades de la versión {APP_VERSION}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="border-l-4 border-primary pl-4 py-2">
              <h3 className="font-medium">Versión 1.0.5</h3>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc pl-5">
                <li>Mejoras en interfaz de usuario de productos</li>
                <li>Nueva funcionalidad para eliminar pedidos</li>
                <li>Barra de progreso animada al procesar mensajes</li>
                <li>Información detallada sobre capacidades de IA</li>
                <li>Mejor integración con API de Google Gemini</li>
              </ul>
            </div>
            
            <div className="border-l-4 border-muted pl-4 py-2">
              <h3 className="font-medium">Versión 1.0.4</h3>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc pl-5">
                <li>Corrección de errores de estabilidad</li>
                <li>Mejoras en la visualización de datos</li>
                <li>Optimización de rendimiento general</li>
              </ul>
            </div>
            
            <div className="border-l-4 border-muted pl-4 py-2">
              <h3 className="font-medium">Versión 1.0.3</h3>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc pl-5">
                <li>Corrección de errores de estabilidad y rendimiento</li>
                <li>Información detallada sobre capacidades de IA</li>
                <li>Mejora en visualización de productos</li>
                <li>Eliminación de pedidos</li>
                <li>Optimización de la experiencia de usuario</li>
              </ul>
            </div>
            
            <div className="border-l-4 border-muted pl-4 py-2">
              <h3 className="font-medium">Versión 1.0.2</h3>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc pl-5">
                <li>Generación de iconos para productos</li>
                <li>Mejoras en el análisis de mensajes</li>
                <li>Ejemplos de pedidos basados en datos reales</li>
                <li>Barra de progreso para análisis de mensajes</li>
              </ul>
            </div>
            
            <div className="border-l-4 border-muted pl-4 py-2">
              <h3 className="font-medium">Versión 1.0.1</h3>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc pl-5">
                <li>Lanzamiento inicial de la aplicación</li>
                <li>Funcionalidades básicas de gestión</li>
                <li>Integración con IA para procesamiento de mensajes</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
