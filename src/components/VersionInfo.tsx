
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { APP_VERSION } from "@/App";
import { useState } from "react";
import { Info, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface VersionChanges {
  version: string;
  changes: string[];
}

// Historial completo de versiones
const versionHistory: VersionChanges[] = [
  {
    version: "1.2.0",
    changes: [
      "Corrección de problemas de scroll en diálogos de información",
      "Mejora visual en tarjetas de pedidos y productos",
      "Implementación de búsqueda en clientes, productos y pedidos",
      "Optimización de rendimiento general de la aplicación",
      "Interfaz más moderna con menos bordes y marcos",
      "Tarjetas más anchas y con mejor organización visual"
    ]
  },
  {
    version: "1.1.0",
    changes: [
      "Mejora del diseño de tarjetas de pedidos con estilo más moderno",
      "Nuevo sistema de búsqueda en pedidos, clientes y productos",
      "Solución al problema de scroll en diálogos informativos",
      "Eliminación de bordes y marcos en tarjetas para diseño más limpio",
      "Corrección de error en el análisis de mensajes en Mensaje Mágico"
    ]
  },
  {
    version: "1.0.12",
    changes: [
      "Mejora en la visualización de tarjetas de productos en Dashboard",
      "Rediseño de tarjetas en la sección de pedidos con mejor organización",
      "Solución al problema de desplazamiento en diálogos informativos",
      "Optimización general del rendimiento de la aplicación",
      "Corrección de errores de renderizado en distintas vistas"
    ]
  }
];

export const VersionInfo = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showAllVersions, setShowAllVersions] = useState(false);

  // Obtener la versión actual y su información
  const currentVersion = versionHistory.find(v => v.version === APP_VERSION) || versionHistory[0];
  
  // Versiones a mostrar basadas en la selección
  const versionsToShow = showAllVersions ? versionHistory : [currentVersion];

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="text-xs text-muted-foreground hover:text-primary transition-colors focus:outline-none py-1 px-2 rounded-md hover:bg-muted/20"
        aria-label="Ver información de versión"
      >
        v{APP_VERSION}
      </button>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              Novedades en la versión {currentVersion.version}
            </DialogTitle>
            <DialogDescription>
              {showAllVersions ? "Historial completo de actualizaciones" : "Últimas actualizaciones y mejoras implementadas"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="overflow-hidden" style={{ maxHeight: "60vh" }}>
            <ScrollArea className="h-full max-h-[50vh] pr-3">
              <div className="space-y-6 py-3">
                {versionsToShow.map((version, versionIndex) => (
                  <div key={versionIndex} className="space-y-3">
                    {showAllVersions && versionIndex > 0 && (
                      <div className="flex items-center gap-2 pt-1">
                        <div className="text-sm font-medium">Versión {version.version}</div>
                        <div className="h-px flex-1 bg-border"></div>
                      </div>
                    )}
                    <ul className="space-y-2.5">
                      {version.changes.map((change, index) => (
                        <li key={index} className="flex items-start gap-2.5">
                          <div className="bg-primary/10 p-1 rounded-full mt-0.5 flex-shrink-0">
                            <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                          </div>
                          <span className="text-sm">{change}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowAllVersions(!showAllVersions)}
              className="w-full sm:w-auto"
            >
              {showAllVersions ? "Ver sólo versión actual" : "Ver historial completo"}
            </Button>
            <DialogClose asChild>
              <Button variant="outline" size="sm" className="w-full sm:w-auto">
                <X className="h-4 w-4 mr-1" />
                Cerrar
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
