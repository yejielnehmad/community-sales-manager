import { useState, useEffect, useMemo } from 'react';
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { 
  Loader2, 
  MessageSquareText, 
  Wand, 
  Sparkles, 
  ChevronDown,
  ChevronUp,
  Clipboard,
  Trash2,
  X,
  Check,
  AlertCircle,
  RefreshCcw,
  User,
  Package,
  HelpCircle,
  InfoIcon
} from 'lucide-react';
import { supabase } from "@/lib/supabase";
import { analyzeCustomerMessage, AIServiceError } from "@/services/geminiService";
import { OrderCard } from "@/components/OrderCard";
import { MessageExampleGenerator } from "@/components/MessageExampleGenerator";
import { OrderCard as OrderCardType, MessageAnalysis, MessageItem, MessageClient } from "@/types";
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { SimpleOrderCardNew } from "@/components/SimpleOrderCardNew";
import { Badge } from "@/components/ui/badge";

/**
 * Página Mensaje Mágico
 * v1.0.9
 */
const MagicOrder = () => {
  const [message, setMessage] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [orders, setOrders] = useState<OrderCardType[]>([]);
  const [showGenerator, setShowGenerator] = useState(false);
  const [showOrderSummary, setShowOrderSummary] = useState(true);
  const [alertMessage, setAlertMessage] = useState<{ title: string; message: string } | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<{index: number, name: string} | null>(null);
  const [isSavingAllOrders, setIsSavingAllOrders] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [unmatchedNames, setUnmatchedNames] = useState<string[]>([]);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [rawJsonResponse, setRawJsonResponse] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const loadContextData = async () => {
      try {
        const { data: clientsData, error: clientsError } = await supabase
          .from('clients')
          .select('id, name, phone');
        
        if (clientsError) throw new Error(clientsError.message);
        if (clientsData) setClients(clientsData);
        
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('id, name, price, description');
        
        if (productsError) throw new Error(productsError.message);
        
        if (productsData) {
          const { data: variantsData, error: variantsError } = await supabase
            .from('product_variants')
            .select('id, product_id, name, price');
          
          if (variantsError) throw new Error(variantsError.message);
          
          const productsWithVariants = productsData.map(product => {
            const productVariants = variantsData ? variantsData.filter(v => v.product_id === product.id) : [];
            return {
              ...product,
              variants: productVariants
            };
          });
          
          setProducts(productsWithVariants);
        }
      } catch (error) {
        console.error("Error al cargar datos de contexto:", error);
      }
    };
    
    loadContextData();
  }, []);
  
  const simulateProgress = () => {
    setProgress(0);
    const duration = 8000;
    const interval = 20;
    const totalSteps = duration / interval;
    let currentStep = 0;
    
    const timer = setInterval(() => {
      currentStep++;
      const progressValue = 100 / (1 + Math.exp(-0.07 * (currentStep - totalSteps/2)));
      setProgress(progressValue);
      
      if (currentStep >= totalSteps) {
        clearInterval(timer);
      }
    }, interval);
    
    return () => clearInterval(timer);
  };

  const handleAnalyzeMessage = async () => {
    if (!message.trim()) {
      setAlertMessage({
        title: "Campo vacío",
        message: "Por favor, ingresa un mensaje para analizar"
      });
      return;
    }

    setIsAnalyzing(true);
    setUnmatchedNames([]);
    setAnalysisError(null);
    setRawJsonResponse(null);
    const stopSimulation = simulateProgress();

    try {
      const results = await analyzeCustomerMessage(message);
      
      setProgress(100);
      
      const namesNotInDB: string[] = [];
      
      const messageWords = message.toLowerCase().split(/\s+/);
      const clientNamesLower = clients.map(c => c.name.toLowerCase());
      
      const potentialNames = messageWords.filter(word => 
        word.length > 2 && 
        !word.match(/^\d+$/) && 
        !clientNamesLower.some(name => name.includes(word)) && 
        !products.some(p => p.name.toLowerCase().includes(word))
      );
      
      if (potentialNames.length > 0) {
        const resultsNames = results.map(r => r.client.name.toLowerCase());
        const possibleMissedNames = potentialNames.filter(name => 
          !resultsNames.some(resultName => resultName.includes(name))
        );
        
        if (possibleMissedNames.length > 0) {
          setUnmatchedNames(possibleMissedNames);
          
          toast({
            title: "Nombres no reconocidos",
            description: `Estos nombres no fueron identificados como clientes: ${possibleMissedNames.join(", ")}`,
            variant: "warning"
          });
        }
      }
      
      const newOrders = results.map(result => ({
        client: {
          ...result.client,
          matchConfidence: (result.client.matchConfidence as 'alto' | 'medio' | 'bajo') || 'bajo'
        },
        items: result.items.map(item => ({
          ...item,
          status: (item.status as 'duda' | 'confirmado') || 'duda'
        })) || [],
        isPaid: false,
        status: 'pending' as const
      }));
      
      if (newOrders.length === 0) {
        setAlertMessage({
          title: "No se encontraron pedidos",
          message: "No se pudo identificar ningún pedido en el mensaje. Intenta con un formato más claro, por ejemplo: 'nombre 2 producto'"
        });
      } else {
        setOrders(prevOrders => [...prevOrders, ...newOrders]);
        setMessage("");
        setShowOrderSummary(true);
      }
      
    } catch (error) {
      console.error("Error al analizar el mensaje:", error);
      
      let errorTitle = "Error de análisis";
      let errorMessage = "Error al analizar el mensaje";
      
      if (error instanceof AIServiceError) {
        if (error.status) {
          errorMessage = `Error HTTP ${error.status}: ${error.message}`;
        } else if (error.apiResponse) {
          errorMessage = `Error en la respuesta de la API: ${error.message}`;
        } else {
          errorMessage = error.message;
        }
        
        setRawJsonResponse(error.rawJsonResponse || "No disponible");
      } else {
        errorMessage = (error as Error).message || "Error desconocido al analizar el mensaje";
      }
      
      setAnalysisError(errorMessage);
      setAlertMessage({
        title: errorTitle,
        message: errorMessage
      });
    } finally {
      setTimeout(() => {
        setIsAnalyzing(false);
        setProgress(0);
      }, 500);
      stopSimulation();
    }
  };

  // ... rest of the component remains unchanged
};
