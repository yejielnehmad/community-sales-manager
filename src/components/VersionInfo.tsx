
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

export const VersionInfo = () => {
  const [isOpen, setIsOpen] = useState(false);

  // Información de la versión actual
  const versionInfo = {
    version: APP_VERSION,
    changes: [
      "Rediseño de tarjetas en la sección de pedidos",
      "Nuevas tarjetas de productos pendientes de cobro en el dashboard",
      "Mejora en la interfaz para agregar variantes de productos",
      "Actualización de la insignia IA con infografía explicativa",
      "Optimizaciones para experiencia móvil"
    ],
  };

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
              Novedades en la versión {versionInfo.version}
            </DialogTitle>
            <DialogDescription>
              Últimas actualizaciones y mejoras implementadas
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-3">
            <ul className="space-y-2">
              {versionInfo.changes.map((change, index) => (
                <li key={index} className="flex items-start gap-2">
                  <div className="bg-primary/10 p-1 rounded-full mt-0.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                  </div>
                  <span>{change}</span>
                </li>
              ))}
            </ul>
          </div>
          
          <DialogFooter>
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
