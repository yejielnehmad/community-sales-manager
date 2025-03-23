
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

export const VersionInfo = () => {
  const [isOpen, setIsOpen] = useState(false);

  // Información de la versión actual
  const versionInfo = {
    version: APP_VERSION,
    changes: [
      "Mejora en la visualización de tarjetas de productos en Dashboard",
      "Rediseño de tarjetas en la sección de pedidos con mejor organización",
      "Solución al problema de desplazamiento en diálogos informativos",
      "Optimización general del rendimiento de la aplicación",
      "Corrección de errores de renderizado en distintas vistas"
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
        <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              Novedades en la versión {versionInfo.version}
            </DialogTitle>
            <DialogDescription>
              Últimas actualizaciones y mejoras implementadas
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="flex-1 my-3 pr-3 max-h-[50vh]">
            <div className="space-y-4 py-3">
              <ul className="space-y-2">
                {versionInfo.changes.map((change, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <div className="bg-primary/10 p-1 rounded-full mt-0.5 flex-shrink-0">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                    </div>
                    <span>{change}</span>
                  </li>
                ))}
              </ul>
            </div>
          </ScrollArea>
          
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
