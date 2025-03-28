
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
import { Sparkles } from "lucide-react";

const App = () => {
  const { toast } = useToast();
  const [isAnalyzingGlobally, setIsAnalyzingGlobally] = useState(false);
  const [analysisStage, setAnalysisStage] = useState("");
  
  // Escuchar cambios en el estado del análisis en cualquier parte de la aplicación
  useEffect(() => {
    // Función para manejar el cambio de estado del análisis
    const handleAnalysisStateChange = (event: CustomEvent) => {
      const { isAnalyzing, stage, ordersCount } = event.detail;
      console.log("App: Evento de análisis recibido", { isAnalyzing, stage, ordersCount });
      
      // Actualizamos el estado global
      setIsAnalyzingGlobally(isAnalyzing);
      if (stage) setAnalysisStage(stage);
      
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
    
    // Para conservar el estado entre navegaciones
    const handleBeforeUnload = () => {
      // Guardamos el estado actual en sessionStorage
      if (isAnalyzingGlobally) {
        sessionStorage.setItem('magicOrder_isAnalyzing', 'true');
        sessionStorage.setItem('magicOrder_analysisStage', analysisStage);
      } else {
        sessionStorage.removeItem('magicOrder_isAnalyzing');
        sessionStorage.removeItem('magicOrder_analysisStage');
      }
    };
    
    // Comprobamos si había un análisis en curso
    const savedIsAnalyzing = sessionStorage.getItem('magicOrder_isAnalyzing');
    const savedAnalysisStage = sessionStorage.getItem('magicOrder_analysisStage');
    
    if (savedIsAnalyzing === 'true') {
      setIsAnalyzingGlobally(true);
      if (savedAnalysisStage) setAnalysisStage(savedAnalysisStage);
      
      // Notificamos del estado recuperado
      const event = new CustomEvent('analysisStateChange', {
        detail: { 
          isAnalyzing: true,
          stage: savedAnalysisStage || "Procesando mensaje" 
        }
      });
      window.dispatchEvent(event);
    }
    
    // Añadir listener para el evento de análisis
    window.addEventListener('analysisStateChange', handleAnalysisStateChange as EventListener);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('analysisStateChange', handleAnalysisStateChange as EventListener);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [toast, isAnalyzingGlobally, analysisStage]);
  
  return (
    <ThemeProvider defaultTheme="light" storageKey="app-theme">
      <TooltipProvider>
        <SidebarProvider>
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
