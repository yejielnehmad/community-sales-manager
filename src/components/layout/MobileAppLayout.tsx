
import { useState, useCallback, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Home, 
  Users, 
  ShoppingBag, 
  ClipboardList,
  Menu,
  MessageCircle,
  Database,
  Wand,
  Info
} from "lucide-react";
import { AIStatusBadge } from "@/components/AIStatusBadge";
import { APP_VERSION } from "@/lib/app-config";
import { ChatAssistant } from "@/components/ChatAssistant";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";

interface MobileAppLayoutProps {
  children: React.ReactNode;
}

export function MobileAppLayout({ children }: MobileAppLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [showVersionInfo, setShowVersionInfo] = useState(false);
  
  const menuItems = [
    { path: "/", label: "Inicio", icon: <Home className="h-5 w-5" /> },
    { path: "/clients", label: "Clientes", icon: <Users className="h-5 w-5" /> },
    { path: "/products", label: "Catálogo", icon: <ShoppingBag className="h-5 w-5" /> },
    { path: "/orders", label: "Pedidos", icon: <ClipboardList className="h-5 w-5" /> },
    { path: "/magic-order", label: "Mensaje Mágico", icon: <Wand className="h-5 w-5" /> },
  ];

  // Asegurar que se restaure la capacidad de interacción después de cerrar componentes de UI
  useEffect(() => {
    const restoreInteraction = () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
      
      // Limpiar modales o drawers que pudieran haber quedado abiertos
      const openElements = document.querySelectorAll('[data-state="open"]');
      openElements.forEach((el) => {
        if (el.tagName !== 'DIALOG' && !el.closest('dialog')) {
          el.setAttribute('data-state', 'closed');
        }
      });
    };
    
    // Ejecutar la limpieza cuando cambiamos de ruta
    restoreInteraction();
    
    return () => {
      restoreInteraction();
    };
  }, [location.pathname]);

  const navigateTo = useCallback((path: string) => {
    navigate(path);
    setOpen(false);
    
    // Asegurar que la interfaz sea interactiva después de navegar
    setTimeout(() => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }, 100);
  }, [navigate]);

  const openChat = useCallback(() => {
    setChatOpen(true);
    setOpen(false);
  }, []);

  const closeChat = useCallback(() => {
    setChatOpen(false);
    
    // Restaurar funcionalidad de interacción después de cerrar el chat
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
    
    // Limpiar cualquier modal o drawer que pudiera haber quedado abierto
    const openElements = document.querySelectorAll('[data-state="open"]');
    openElements.forEach((el) => {
      if (el.tagName !== 'DIALOG' && !el.closest('dialog')) {
        el.setAttribute('data-state', 'closed');
      }
    });
  }, []);

  const openVersionInfo = useCallback(() => {
    setShowVersionInfo(true);
    setOpen(false);
  }, []);

  return (
    <div className="flex flex-col min-h-screen w-full bg-background">
      {/* Header móvil */}
      <header className="sticky top-0 z-10 border-b bg-background p-3 flex items-center justify-between shadow-sm">
        <h1 
          className="text-lg font-bold text-primary cursor-pointer" 
          onClick={() => navigateTo("/")}
        >
          VentasCom
        </h1>
        
        <div className="flex items-center gap-2">
          <div className="pr-2 touch-manipulation">
            <AIStatusBadge />
          </div>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="focus:outline-none touch-manipulation">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Menú</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[80vw] max-w-xs p-0">
              <div className="h-full flex flex-col">
                <div className="py-4 border-b px-4 flex justify-between items-center">
                  <h1 className="text-xl font-bold text-primary">VentasCom</h1>
                </div>
                <ScrollArea className="flex-1">
                  <div className="py-2">
                    {menuItems.map((item) => (
                      <button
                        key={item.path}
                        onClick={() => navigateTo(item.path)}
                        className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left focus:outline-none ${
                          location.pathname === item.path ? "bg-muted font-medium" : ""
                        }`}
                      >
                        {item.icon}
                        <span>{item.label}</span>
                      </button>
                    ))}
                    
                    <button
                      onClick={openChat}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left focus:outline-none"
                    >
                      <MessageCircle className="h-5 w-5" />
                      <span>Asistente</span>
                    </button>
                    
                    <button
                      onClick={openVersionInfo}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left focus:outline-none"
                    >
                      <Info className="h-5 w-5" />
                      <span>Información de Versión</span>
                    </button>
                    
                    <button
                      onClick={() => window.open("https://supabase.com/dashboard/project/frezmwtubianybvrkxmv", "_blank")}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left focus:outline-none"
                    >
                      <Database className="h-5 w-5" />
                      <span>Supabase</span>
                    </button>
                  </div>
                </ScrollArea>
                <div className="p-4 border-t text-center">
                  <Button variant="ghost" className="text-xs text-muted-foreground" onClick={openVersionInfo}>
                    v{APP_VERSION}
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>
      
      {/* Contenido principal */}
      <main className="flex-1 p-4">
        {children}
      </main>
      
      {/* Dialog de información de versión */}
      <Dialog open={showVersionInfo} onOpenChange={setShowVersionInfo}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novedades de la versión {APP_VERSION}</DialogTitle>
            <DialogDescription>
              Descubre todas las mejoras y actualizaciones recientes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="border-l-4 border-primary pl-4 py-2">
              <h3 className="font-medium">Versión 1.1.0</h3>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc pl-5">
                <li>Solución a problemas de interacción con botones tras cerrar el asistente</li>
                <li>Mejora en la eliminación de productos con verificación de dependencias</li>
                <li>Implementación de mensajes informativos al intentar eliminar productos en uso</li>
                <li>Optimización del rendimiento y estabilidad general de la aplicación</li>
              </ul>
            </div>
            
            <div className="border-l-4 border-muted pl-4 py-2">
              <h3 className="font-medium">Versión 1.0.9</h3>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc pl-5">
                <li>Solución a problemas de interacción tras cerrar el asistente de IA</li>
                <li>Mejora en la usabilidad de botones y elementos táctiles</li>
                <li>Optimización del rendimiento en dispositivos móviles</li>
                <li>Corrección de errores en diálogos modales y navegación</li>
              </ul>
            </div>
            
            <div className="border-l-4 border-muted pl-4 py-2">
              <h3 className="font-medium">Versión 1.0.8</h3>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc pl-5">
                <li>Mejora de accesibilidad en dispositivos móviles</li>
                <li>Solución a problemas de interacción en pantallas táctiles</li>
                <li>Optimización de diálogos informativos</li>
                <li>Corrección de errores de visualización</li>
              </ul>
            </div>
            
            <div className="border-l-4 border-muted pl-4 py-2">
              <h3 className="font-medium">Versión 1.0.7</h3>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc pl-5">
                <li>Corrección de error en el asistente de IA</li>
                <li>Mejora en la integración con la base de datos</li>
                <li>Optimización del rendimiento del asistente</li>
                <li>Estabilización de la aplicación</li>
              </ul>
            </div>
            
            <div className="border-l-4 border-muted pl-4 py-2">
              <h3 className="font-medium">Versión 1.0.6</h3>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc pl-5">
                <li>Mejora en el acceso a las capacidades de IA desde el ícono del indicador</li>
                <li>Eliminación de mensajes predefinidos en favor de generación por IA</li>
                <li>Asistente de IA con acceso completo a datos de la aplicación</li>
                <li>Panel detallado de información de la IA</li>
                <li>Corrección de visualización de información de versiones</li>
                <li>Mejoras en la interfaz de usuario</li>
              </ul>
            </div>
            
            <div className="border-l-4 border-muted pl-4 py-2">
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
          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button>Cerrar</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {chatOpen && <ChatAssistant onClose={closeChat} />}
    </div>
  );
}
