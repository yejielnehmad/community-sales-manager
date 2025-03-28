
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import Products from "./pages/Products";
import Orders from "./pages/Orders";
import MagicOrder from "./pages/MagicOrder";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import { TooltipProvider } from "@/components/ui/tooltip";
import Messages from "./pages/Messages";
import { SidebarProvider } from "@/components/ui/sidebar";
import ProductDetails from "./pages/ProductDetails";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Clock } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const App = () => {
  const { toast } = useToast();
  const [isAnalyzingGlobally, setIsAnalyzingGlobally] = useState(false);
  const [analysisStage, setAnalysisStage] = useState("");
  const [analysisProgress, setAnalysisProgress] = useState(0);
  
  // Escuchar cambios en el estado del análisis en cualquier parte de la aplicación
  useEffect(() => {
    // Primero, intentamos restaurar el estado desde sessionStorage
    const savedIsAnalyzing = sessionStorage.getItem('magicOrder_isAnalyzing');
    const savedAnalysisStage = sessionStorage.getItem('magicOrder_analysisStage');
    const savedAnalysisProgress = sessionStorage.getItem('magicOrder_analysisProgress');
    
    if (savedIsAnalyzing === 'true') {
      setIsAnalyzingGlobally(true);
      if (savedAnalysisStage) setAnalysisStage(savedAnalysisStage);
      if (savedAnalysisProgress) setAnalysisProgress(parseInt(savedAnalysisProgress));
      
      // Notificamos del estado recuperado
      const event = new CustomEvent('analysisStateChange', {
        detail: { 
          isAnalyzing: true,
          stage: savedAnalysisStage || "Procesando mensaje",
          progress: parseInt(savedAnalysisProgress || "0")
        }
      });
      window.dispatchEvent(event);
    }
    
    // Función para manejar el cambio de estado del análisis
    const handleAnalysisStateChange = (event: CustomEvent) => {
      const { isAnalyzing, stage, ordersCount, progress } = event.detail;
      console.log("App: Evento de análisis recibido", { isAnalyzing, stage, ordersCount, progress });
      
      // Actualizamos el estado global
      setIsAnalyzingGlobally(isAnalyzing);
      if (stage) setAnalysisStage(stage);
      if (typeof progress === 'number') setAnalysisProgress(progress);
      
      // Guardamos el estado actual en sessionStorage para mantenerlo entre navegaciones
      if (isAnalyzing) {
        sessionStorage.setItem('magicOrder_isAnalyzing', 'true');
        if (stage) sessionStorage.setItem('magicOrder_analysisStage', stage);
        if (typeof progress === 'number') sessionStorage.setItem('magicOrder_analysisProgress', progress.toString());
      } else {
        sessionStorage.removeItem('magicOrder_isAnalyzing');
        sessionStorage.removeItem('magicOrder_analysisStage');
        sessionStorage.removeItem('magicOrder_analysisProgress');
      }
      
      // Cuando el análisis termina y hay órdenes detectadas
      if (!isAnalyzing && typeof ordersCount === 'number' && ordersCount > 0) {
        // Mostrar un toast para notificar que se han detectado órdenes
        toast({
          title: "Análisis completado",
          description: `Se ${ordersCount === 1 ? 'ha' : 'han'} detectado ${ordersCount} pedido${ordersCount === 1 ? '' : 's'}`,
          variant: "success",
        });
      }
    };
    
    // Añadir listener para el evento de análisis
    window.addEventListener('analysisStateChange', handleAnalysisStateChange as EventListener);
    
    // Añadir listener para visibilidad de página
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        // Al volver a la página, verificamos si hay análisis en curso desde sessionStorage
        const storedIsAnalyzing = sessionStorage.getItem('magicOrder_isAnalyzing');
        if (storedIsAnalyzing === 'true' && !isAnalyzingGlobally) {
          const storedStage = sessionStorage.getItem('magicOrder_analysisStage');
          const storedProgress = sessionStorage.getItem('magicOrder_analysisProgress');
          // Re-emitir el evento con los datos almacenados
          const event = new CustomEvent('analysisStateChange', {
            detail: { 
              isAnalyzing: true,
              stage: storedStage || "Procesando mensaje",
              progress: parseInt(storedProgress || "0")
            }
          });
          window.dispatchEvent(event);
        }
      }
    });
    
    return () => {
      window.removeEventListener('analysisStateChange', handleAnalysisStateChange as EventListener);
    };
  }, [toast, isAnalyzingGlobally]);
  
  return (
    <ThemeProvider defaultTheme="light" storageKey="app-theme">
      <TooltipProvider>
        <SidebarProvider>
          {/* Barra de progreso global para el análisis de IA */}
          {isAnalyzingGlobally && (
            <div className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 shadow-md">
              <div className="container mx-auto p-2">
                <div className="flex items-center justify-between mb-1 text-sm">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                    <span className="font-medium">{analysisStage || "Procesando..."}</span>
                  </div>
                  <div className="font-medium flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {Math.round(analysisProgress)}%
                  </div>
                </div>
                <Progress value={analysisProgress} className="h-2 w-full" />
              </div>
            </div>
          )}
          
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/clients" element={<Clients />} />
              <Route path="/products" element={<Products />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/magic-order" element={<MagicOrder />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/product-details/:productId" element={<ProductDetails />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
          <Toaster />
        </SidebarProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
};

export default App;
