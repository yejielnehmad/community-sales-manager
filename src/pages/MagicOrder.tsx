import { useState, useEffect, useMemo, useRef } from 'react';
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { TextareaWithHighlight } from "@/components/TextareaWithHighlight";
import { Progress } from "@/components/ui/progress";
import { 
  Loader2, 
  Wand, 
  Sparkles, 
  ChevronDown,
  ChevronUp,
  Clipboard,
  AlertCircle,
  RefreshCcw,
  FileText,
  Clock,
  Pause
} from 'lucide-react';
import { supabase } from "@/lib/supabase";
import { 
  analyzeCustomerMessage, 
  GeminiError,
  setApiProvider,
  setGeminiModel,
  ApiProvider
} from "@/services/geminiService";
import { MessageExampleGenerator } from "@/components/MessageExampleGenerator";
import { OrderCard as OrderCardType, MessageAnalysis } from "@/types";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GOOGLE_GEMINI_MODELS } from "@/lib/api-config";
import { MessagesProducts } from "@/components/messages/MessagesProducts";
import { MessagesClient } from "@/components/messages/MessagesClient";
import { MessagesSummary } from "@/components/messages/MessagesSummary";
import { logDebug } from '@/lib/debug-utils';

/**
 * Página Mensaje Mágico
 * v1.0.72
 */
const MagicOrder = () => {
  // Recuperar estado del localStorage al cargar la página
  const [message, setMessage] = useState(() => {
    const savedMessage = localStorage.getItem('magicOrder_message');
    return savedMessage || "";
  });
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const [orders, setOrders] = useState<OrderCardType[]>(() => {
    const savedOrders = localStorage.getItem('magicOrder_orders');
    return savedOrders ? JSON.parse(savedOrders) : [];
  });
  
  const [showGenerator, setShowGenerator] = useState(false);
  
  const [showOrderSummary, setShowOrderSummary] = useState(() => {
    const savedShowOrderSummary = localStorage.getItem('magicOrder_showOrderSummary');
    return savedShowOrderSummary ? JSON.parse(savedShowOrderSummary) : true;
  });
  
  const [alertMessage, setAlertMessage] = useState<{ title: string; message: string } | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<{index: number, name: string} | null>(null);
  const [isSavingAllOrders, setIsSavingAllOrders] = useState(false);
  
  const [clients, setClients] = useState<any[]>(() => {
    const savedClients = localStorage.getItem('magicOrder_clients');
    return savedClients ? JSON.parse(savedClients) : [];
  });
  
  const [products, setProducts] = useState<any[]>(() => {
    const savedProducts = localStorage.getItem('magicOrder_products');
    return savedProducts ? JSON.parse(savedProducts) : [];
  });
  
  const [analyzeError, setAnalysisError] = useState<string | null>(null);
  const [rawJsonResponse, setRawJsonResponse] = useState<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [progressStage, setProgressStage] = useState<string>("");
  
  const [phase1Response, setPhase1Response] = useState<string | null>(() => {
    const savedPhase1 = localStorage.getItem('magicOrder_phase1Response');
    return savedPhase1 || null;
  });
  
  const [phase2Response, setPhase2Response] = useState<string | null>(() => {
    const savedPhase2 = localStorage.getItem('magicOrder_phase2Response');
    return savedPhase2 || null;
  });
  
  const [phase3Response, setPhase3Response] = useState<string | null>(() => {
    const savedPhase3 = localStorage.getItem('magicOrder_phase3Response');
    return savedPhase3 || null;
  });
  
  const [showAnalysisDialog, setShowAnalysisDialog] = useState(false);
  const [analysisDialogTab, setAnalysisDialogTab] = useState('phase1');
  const { toast } = useToast();
  
  // Solo mantenemos Google Gemini como proveedor
  const [apiProvider, setApiProviderState] = useState<ApiProvider>("google-gemini");
  
  // Solo mantenemos el modelo Gemini 2.0 Flash
  const [geminiModel, setGeminiModelState] = useState<string>(GOOGLE_GEMINI_MODELS.GEMINI_FLASH_2);
  
  // Estado para el tiempo de análisis - ahora siempre visible
  const [analysisTime, setAnalysisTime] = useState<number | null>(null);
  
  // Efecto para sincronizar el estado con los servicios
  useEffect(() => {
    setApiProvider(apiProvider);
    localStorage.setItem('magicOrder_apiProvider', apiProvider);
  }, [apiProvider]);
  
  useEffect(() => {
    setGeminiModel(geminiModel);
    localStorage.setItem('magicOrder_geminiModel', geminiModel);
  }, [geminiModel]);
  
  // Guardar estado en localStorage cuando cambie
  useEffect(() => {
    localStorage.setItem('magicOrder_message', message);
  }, [message]);
  
  useEffect(() => {
    if (orders.length > 0) {
      localStorage.setItem('magicOrder_orders', JSON.stringify(orders));
    }
  }, [orders]);
  
  useEffect(() => {
    localStorage.setItem('magicOrder_showOrderSummary', JSON.stringify(showOrderSummary));
  }, [showOrderSummary]);
  
  useEffect(() => {
    if (clients.length > 0) {
      localStorage.setItem('magicOrder_clients', JSON.stringify(clients));
    }
  }, [clients]);
  
  useEffect(() => {
    if (products.length > 0) {
      localStorage.setItem('magicOrder_products', JSON.stringify(products));
    }
  }, [products]);
  
  useEffect(() => {
    if (phase1Response) {
      localStorage.setItem('magicOrder_phase1Response', phase1Response);
    }
  }, [phase1Response]);
  
  useEffect(() => {
    if (phase2Response) {
      localStorage.setItem('magicOrder_phase2Response', phase2Response);
    }
  }, [phase2Response]);
  
  useEffect(() => {
    if (phase3Response) {
      localStorage.setItem('magicOrder_phase3Response', phase3Response);
    }
  }, [phase3Response]);
  
  // Verificar si existen datos en local storage y cargar desde la base de datos solo si no hay datos locales
  useEffect(() => {
    const loadContextData = async () => {
      // Solo cargar datos si no hay ya datos en localStorage
      if (clients.length === 0 || products.length === 0) {
        setIsLoadingData(true);
        try {
          const { data: clientsData, error: clientsError } = await supabase
            .from('clients')
            .select('id, name, phone');
          
          if (clientsError) throw new Error(clientsError.message);
          if (clientsData && clientsData.length > 0) setClients(clientsData);
          
          const { data: productsData, error: productsError } = await supabase
            .from('products')
            .select('id, name, price, description');
          
          if (productsError) throw new Error(productsError.message);
          
          if (productsData && productsData.length > 0) {
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
          toast({
            title: "Error al cargar datos",
            description: "No se pudieron cargar todos los productos y clientes",
            variant: "destructive"
          });
        } finally {
          setIsLoadingData(false);
        }
      }
    };
    
    loadContextData();
  }, [toast, clients.length, products.length]);

  // Limpieza completa de estado cuando se inicia un nuevo mensaje
  useEffect(() => {
    if (message.trim().length > 0) {
      // Cuando el usuario empieza a escribir un nuevo mensaje, limpiamos todo el estado previo
      // para asegurar que no queden residuos de análisis anteriores
      if (orders.length > 0 || rawJsonResponse !== null || phase1Response !== null || phase2Response !== null || phase3Response !== null) {
        // Limpiar órdenes y estados relacionados con el análisis
        setOrders([]);
        setRawJsonResponse(null);
        setPhase1Response(null);
        setPhase2Response(null);
        setPhase3Response(null);
        setShowOrderSummary(false);
        setAnalysisError(null);
        setIsAnalyzing(false);
        setProgress(0);
        setProgressStage("");
        setAnalysisTime(null);
        
        // Limpiar localStorage para asegurar que no hay datos antiguos
        localStorage.removeItem('magicOrder_orders');
        localStorage.removeItem('magicOrder_analysisError');
        localStorage.removeItem('magicOrder_rawJsonResponse');
        localStorage.removeItem('magicOrder_phase1Response');
        localStorage.removeItem('magicOrder_phase2Response');
        localStorage.removeItem('magicOrder_phase3Response');
        
        console.log("Estado limpiado completamente al iniciar un nuevo mensaje");
      }
    }
  }, [message]);

  // Referencia para controlar la cancelación del análisis
  const analyzeAbortControllerRef = useRef<AbortController | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  
  // Función para actualizar el progreso del análisis
  const updateProgress = (value: number, stage?: string) => {
    setProgress(value);
    if (stage) setProgressStage(stage);
    
    // Disparamos un evento para actualizar la insignia AI
    const event = new CustomEvent('analysisStateChange', {
      detail: { 
        isAnalyzing: value > 0 && value < 100,
        stage: stage 
      }
    });
    window.dispatchEvent(event);
  };

  const handlePauseAnalysis = () => {
    if (analyzeAbortControllerRef.current) {
      setIsPaused(true);
      analyzeAbortControllerRef.current.abort();
      setProgressStage("Análisis pausado");
      
      toast({
        title: "Análisis pausado",
        description: "El análisis ha sido pausado. Puedes retomarlo o iniciar uno nuevo.",
        variant: "default"
      });
      
      // Notificamos mediante evento
      const event = new CustomEvent('analysisStateChange', {
        detail: { 
          isAnalyzing: false,
          isPaused: true
        }
      });
      window.dispatchEvent(event);
    }
  };

  const handleAnalyzeMessage = async () => {
    if (!message.trim()) {
      setAlertMessage({
        title: "Campo vacío",
        message: "Por favor, ingresa un mensaje para analizar"
      });
      return;
    }

    // Si hay un análisis pausado, lo reiniciamos
    if (isPaused) {
      setIsPaused(false);
    }

    // Limpiar pedidos anteriores
    setOrders([]);
    localStorage.removeItem('magicOrder_orders');
    
    setIsAnalyzing(true);
    setAnalysisError(null);
    setRawJsonResponse(null);
    setPhase1Response(null);
    setPhase2Response(null);
    setPhase3Response(null);
    setProgress(5);
    setProgressStage("Preparando análisis...");
    setAnalysisTime(null);
    
    // Guardamos el mensaje para procesarlo
    const messageToAnalyze = message;
    
    // Limpiamos el campo de mensaje para que el usuario pueda seguir trabajando
    setMessage("");
    
    // Creamos un nuevo AbortController para este análisis
    analyzeAbortControllerRef.current = new AbortController();
    
    // Disparamos un evento para actualizar la insignia AI
    const event = new CustomEvent('analysisStateChange', {
      detail: { 
        isAnalyzing: true,
        stage: "Preparando análisis..." 
      }
    });
    window.dispatchEvent(event);

    try {
      // Procesamos el mensaje en segundo plano con la señal de aborto
      const result = await analyzeCustomerMessage(
        messageToAnalyze, 
        updateProgress, 
        analyzeAbortControllerRef.current.signal
      );
      
      if (result.phase1Response) {
        setPhase1Response(result.phase1Response);
      }
      
      if (result.phase2Response) {
        setPhase2Response(result.phase2Response);
      }
      
      if (result.phase3Response) {
        setPhase3Response(result.phase3Response);
      }
      
      if (result.elapsedTime) {
        setAnalysisTime(result.elapsedTime);
      }
      
      setProgress(100);
      setProgressStage("¡Análisis completado!");
      
      // Construir los pedidos a partir del resultado del análisis
      const newOrders = result.result.map(result => {
        const processedItems = result.items.map(item => {
          let status: 'duda' | 'confirmado' = item.status as 'duda' | 'confirmado' || 'duda';
          let notes = item.notes || '';
          
          if (item.product?.id) {
            const productInfo = products.find(p => p.id === item.product.id);
            
            if (productInfo && productInfo.variants && productInfo.variants.length > 0) {
              if (!item.variant || !item.variant.id) {
                status = 'duda';
                notes = `No se especificó la variante de ${productInfo.name}`;
              }
            }
          }
          
          return {
            ...item,
            status,
            notes
          };
        });
        
        return {
          client: {
            ...result.client,
            matchConfidence: (result.client.matchConfidence as 'alto' | 'medio' | 'bajo') || 'bajo'
          },
          items: processedItems,
          isPaid: false,
          status: 'pending' as const
        };
      });
      
      if (newOrders.length === 0) {
        setAlertMessage({
          title: "No se encontraron pedidos",
          message: "No se pudo identificar ningún pedido en el mensaje. Intenta con un formato más claro, por ejemplo: 'nombre 2 producto'"
        });
      } else {
        logDebug('MagicOrder', `Se generaron ${newOrders.length} pedidos nuevos`);
        setOrders(newOrders);
        setShowOrderSummary(true);
        
        // Notificamos mediante evento para que se muestre incluso si el usuario no está en esta página
        const completionEvent = new CustomEvent('analysisStateChange', {
          detail: { 
            isAnalyzing: false,
            ordersCount: newOrders.length
          }
        });
        window.dispatchEvent(completionEvent);
      }
      
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        logDebug('MagicOrder', 'Análisis pausado por el usuario');
        return;
      }
      
      console.error("Error al analizar el mensaje:", error);
      
      let errorTitle = "Error de análisis";
      let errorMessage = "Error al analizar el mensaje";
      
      if (error instanceof GeminiError) {
        if (error.status) {
          errorMessage = `Error HTTP ${error.status}: ${error.message}`;
        } else if (error.apiResponse) {
          errorMessage = `Error en la respuesta de la API: ${error.message}`;
        } else {
          errorMessage = error.message;
        }
        
        setPhase1Response(error.phase1Response || null);
        setPhase2Response(error.rawJsonResponse || null);
        
        if (error.phase1Response || error.rawJsonResponse) {
          // No mostramos automáticamente el diálogo de análisis
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
      if (!isPaused) {
        setIsAnalyzing(false);
        analyzeAbortControllerRef.current = null;
      }
      
      // Notificamos que el análisis ha terminado
      const completionEvent = new CustomEvent('analysisStateChange', {
        detail: { 
          isAnalyzing: false,
          error: analyzeError ? analyzeError : null
        }
      });
      window.dispatchEvent(completionEvent);
    }
  };

  const handleUpdateOrder = (index: number, updatedOrder: OrderCardType) => {
    const updatedOrders = [...orders];
    updatedOrders[index] = updatedOrder;
    setOrders(updatedOrders);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setMessage(text);
    } catch (err) {
      setAlertMessage({
        title: "Error de acceso",
        message: "No se pudo acceder al portapapeles"
      });
    }
  };

  const handleSelectExample = (example: string) => {
    setMessage(example);
    setShowGenerator(false);
  };

  const handleSaveOrder = async (orderIndex: number, order: OrderCardType) => {
    try {
      console.log('Intentando guardar el pedido:', order);
      
      if (!order.client.id) {
        toast({
          title: "Error al guardar",
          description: "El cliente no está identificado correctamente",
          variant: "destructive"
        });
        return false;
      }

      const clientId = order.client.id;
      
      let hasInvalidItems = false;
      let total = 0;
      
      for (const item of order.items) {
        if (!item.product.id) {
          hasInvalidItems = true;
          break;
        }
        
        const itemPrice = item.variant?.price || products.find(p => p.id === item.product.id)?.price || 0;
        total += item.quantity * itemPrice;
      }
      
      if (hasInvalidItems) {
        toast({
          title: "Error al guardar",
          description: "Hay productos no identificados correctamente",
          variant: "destructive"
        });
        return false;
      }

      const metadata = order.pickupLocation ? { pickupLocation: order.pickupLocation } : undefined;

      const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert([
          {
            client_id: clientId,
            date: new Date().toISOString().split('T')[0],
            status: 'pending',
            total: total,
            amount_paid: order.isPaid ? total : 0,
            balance: order.isPaid ? 0 : total,
            metadata: metadata
          }
        ])
        .select('id')
        .single();

      if (orderError) {
        console.error("Error al crear pedido:", orderError);
        throw new Error(`Error al crear pedido: ${orderError.message}`);
      }

      if (!newOrder || !newOrder.id) {
        throw new Error("No se pudo obtener el ID del pedido creado");
      }

      const orderItems = order.items.map(item => {
        const productPrice = products.find(p => p.id === item.product.id)?.price || 0;
        const variantPrice = item.variant?.id ? 
          products.find(p => p.id === item.product.id)?.variants?.find(v => v.id === item.variant?.id)?.price || 0 : 0;
        
        const price = variantPrice > 0 ? variantPrice : productPrice;
        
        return {
          order_id: newOrder.id,
          product_id: item.product.id!,
          variant_id: item.variant?.id || null,
          quantity: item.quantity,
          price: price,
          total: item.quantity * price
        };
      });

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        console.error("Error al crear items del pedido:", itemsError);
        
        await supabase.from('orders').delete().eq('id', newOrder.id);
        
        throw new Error(`Error al crear items del pedido: ${itemsError.message}`);
      }

      const updatedOrders = [...orders];
      updatedOrders[orderIndex] = {
        ...order,
        id: newOrder.id,
        status: 'saved'
      };
      setOrders(updatedOrders);
      
      toast({
        title: "Pedido guardado",
        description: `El pedido de ${order.client.name} ha sido guardado correctamente`,
        variant: "success"
      });
      
      return true;
    } catch (error: any) {
      console.error("Error al guardar el pedido:", error);
      
      toast({
        title: "Error al guardar",
        description: error.message || "Error al guardar el pedido",
        variant: "destructive"
      });
      
      return false;
    }
  };

  const handleSaveAllOrders = async () => {
    setIsSavingAllOrders(true);
    
    try {
      const validOrders = orders.filter(order => 
        order.status !== 'saved' && 
        !order.items.some(item => item.status === 'duda') && 
        order.client.matchConfidence === 'alto' &&
        order.client.id && 
        order.items.every(item => item.product.id && item.quantity)
      );
      
      if (validOrders.length === 0) {
        setAlertMessage({
          title: "No hay pedidos para guardar",
          message: "No hay pedidos listos para guardar. Asegúrate de resolver todas las dudas pendientes."
        });
        return;
      }
      
      let successCount = 0;
      let errorCount = 0;
      
      for (let i = 0; i < validOrders.length; i++) {
        const orderIndex = orders.findIndex(o => o === validOrders[i]);
        if (orderIndex >= 0) {
          setProgressStage(`Guardando pedido ${i + 1} de ${validOrders.length}...`);
          setProgress(Math.round((i / validOrders.length) * 100));
          
          const success = await handleSaveOrder(orderIndex, validOrders[i]);
          if (success) {
            successCount++;
          } else {
            errorCount++;
          }
        }
      }
      
      setProgress(100);
      setProgressStage(`¡Pedidos guardados!`);
      
      if (successCount > 0) {
        setAlertMessage({
          title: "Pedidos guardados",
          message: `Se ${successCount === 1 ? 'ha' : 'han'} guardado ${successCount} pedido${successCount === 1 ? '' : 's'} correctamente${errorCount > 0 ? ` (${errorCount} con errores)` : ''}`
        });
        
        setOrders([]);
        
        setPhase1Response(null);
        setPhase2Response(null);
        setPhase3Response(null);
        
        localStorage.removeItem('magicOrder_orders');
        localStorage.removeItem('magicOrder_phase1Response');
        localStorage.removeItem('magicOrder_phase2Response');
        localStorage.removeItem('magicOrder_phase3Response');
      } else if (errorCount > 0) {
        setAlertMessage({
          title: "Error al guardar pedidos",
          message: `No se pudo guardar ningún pedido. Revisa los errores e intenta nuevamente.`
        });
      }
    } catch (error) {
      console.error("Error al guardar todos los pedidos:", error);
      setAlertMessage({
        title: "Error",
        message: "Ocurrió un error al intentar guardar los pedidos"
      });
    } finally {
      setTimeout(() => {
        setIsSavingAllOrders(false);
        setProgress(0);
        setProgressStage("");
      }, 1000);
    }
  };

  const handleConfirmDeleteOrder = () => {
    if (orderToDelete !== null) {
      const updatedOrders = [...orders];
      updatedOrders.splice(orderToDelete.index, 1);
      setOrders(updatedOrders);
      setOrderToDelete(null);
      
      toast({
        title: "Pedido eliminado",
        description: `El pedido de ${orderToDelete.name} ha sido eliminado`,
        variant: "default"
      });
    }
  };

  const handleDeleteOrder = (index: number) => {
    const order = orders[index];
    setOrderToDelete({
      index, 
      name: order.client.name
    });
  };
  
  const handleClearMessage = () => {
    setMessage("");
  };
  
  const handleResetAllOrders = () => {
    setOrders([]);
    toast({
      title: "Pedidos reiniciados",
      description: "Se han eliminado todos los pedidos en proceso",
      variant: "default"
    });
  };

  const incompleteOrders = orders.filter(order => 
    !order.client.id || 
    order.client.matchConfidence !== 'alto' || 
    order.items.some(item => item.status === 'duda' || !item.product.id || !item.quantity)
  );
  
  const completeOrders = orders.filter(order => 
    order.client.id && 
    order.client.matchConfidence === 'alto' && 
    !order.items.some(item => item.status === 'duda' || !item.product.id || !item.quantity)
  );
  
  const allOrdersComplete = orders.length > 0 && 
    orders.every(order => 
      order.client.id && 
      order.client.matchConfidence === 'alto' && 
      !order.items.some(item => item.status === 'duda' || !item.product.id || !item.quantity)
    );

  const ordersByClient = useMemo(() => {
    return orders.reduce((acc, order, index) => {
      const clientId = order.client.id || `unknown-${index}`;
      const clientName = order.client.name;
      
      if (!acc[clientId]) {
        acc[clientId] = {
          clientName,
          orders: [],
          indices: []
        };
      }
      
      acc[clientId].orders.push(order);
      acc[clientId].indices.push(index);
      
      return acc;
    }, {} as Record<string, { clientName: string, orders: OrderCardType[], indices: number[] }>);
  }, [orders]);

  // Función para formatear el tiempo en una manera legible
  const formatAnalysisTime = (timeInMs: number | null): string => {
    if (timeInMs === null) return "N/A";
    if (timeInMs < 1000) return `${Math.round(timeInMs)}ms`;
    return `${(timeInMs / 1000).toFixed(2)}s`;
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Wand className="h-7 w-7 text-primary" />
              Mensaje Mágico
            </h1>
            <p className="text-muted-foreground">Analiza mensajes de clientes y crea pedidos automáticamente</p>
          </div>
          
          <div className="flex gap-2">
            {(phase1Response || phase2Response || phase3Response) && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowAnalysisDialog(true)}
                className="flex items-center gap-1"
              >
                <FileText size={16} />
                Ver análisis en detalle
              </Button>
            )}
            
            {orders.length > 0 && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleResetAllOrders}
                className="flex items-center gap-1"
              >
                <RefreshCcw size={16} />
                Reiniciar pedidos mágicos
              </Button>
            )}
          </div>
        </div>

        {/* Información del tiempo de análisis - ahora siempre visible */}
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
          </CardContent>
        </Card>

        {analyzeError && (
          <Card className="bg-red-50 border-red-200">
            <CardHeader className="py-3">
              <CardTitle className="text-red-800 text-base flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Error en el análisis
              </CardTitle>
            </CardHeader>
            <CardContent className="py-2">
              <p className="text-red-700 text-sm">
                {analyzeError}
              </p>
              {rawJsonResponse && !phase2Response && (
                <div className="mt-3">
                  <p className="text-xs text-red-600 font-medium mb-1">Respuesta JSON recibida:</p>
                  <div className="bg-white border border-red-300 rounded p-2 max-h-40 overflow-auto">
                    <pre className="text-xs whitespace-pre-wrap break-words">{rawJsonResponse}</pre>
                  </div>
                </div>
              )}
              <p className="text-xs text-red-600 italic mt-2">
                Intenta con un mensaje más simple o contacta al soporte si el problema persiste.
              </p>
              {(phase1Response || phase2Response || phase3Response) && (
                <div className="mt-3">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowAnalysisDialog(true)}
                    className="text-xs"
                  >
                    <FileText size={12} className="mr-1" /> 
                    Ver detalles del análisis
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Collapsible
          open={showGenerator}
          onOpenChange={setShowGenerator}
        >
          <div className="flex justify-end">
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="mb-2">
                {showGenerator ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-1" />
                    Ocultar ejemplos
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-1" />
                    Ver ejemplos IA
                  </>
                )}
              </Button>
            </CollapsibleTrigger>
          </div>
          
          <CollapsibleContent>
            <MessageExampleGenerator onSelectExample={handleSelectExample} />
          </CollapsibleContent>
        </Collapsible>

        <Card className="rounded-xl shadow-sm overflow-hidden">
          <CardHeader>
            <CardTitle>Nuevo Mensaje</CardTitle>
            <CardDescription>
              Ingresa el mensaje del cliente para analizarlo con IA
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TextareaWithHighlight
              placeholder="Por ejemplo: 'Hola, soy María López y quiero 2 paquetes de pañales talla 1 y 1.5 kg de queso fresco'"
              className="min-h-32"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              clearable={true}
              onClear={handleClearMessage}
              clients={clients}
              products={products}
              highlightUnknownWords={false}
            />
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            {progress > 0 && (
              <div className="w-full mb-2">
                <div className="flex justify-between mb-1 text-sm">
                  <div className="text-muted-foreground">
                    {progressStage}
                  </div>
                  <div className="font-medium">
                    {Math.round(progress)}%
                  </div>
                </div>
                <Progress value={progress} className="h-2 w-full" />
              </div>
            )}
            <div className="w-full flex justify-between">
              <Button
                variant="outline"
                onClick={handlePaste}
                disabled={isAnalyzing && !isPaused}
              >
                <Clipboard size={16} />
                <span>Pegar</span>
              </Button>
              <div className="flex gap-2">
                {isAnalyzing && !isPaused && (
                  <Button
                    variant="outline"
                    onClick={handlePauseAnalysis}
                    className="flex items-center gap-1"
                  >
                    <Pause className="h-4 w-4" />
                    Pausar análisis
                  </Button>
                )}
                <Button
                  onClick={handleAnalyzeMessage}
                  disabled={isAnalyzing && !isPaused}
                >
                  {isAnalyzing && !isPaused ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analizando...
                    </>
                  ) : isPaused ? (
                    <>
                      <RefreshCcw className="h-4 w-4" />
                      Reiniciar análisis
                    </>
                  ) : (
                    <>
                      <Wand className="h-4 w-4" />
                      Analizar mensaje
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardFooter>
        </Card>

        {/* Resultados del análisis */}
        {orders.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Pedidos detectados</h2>
            {orders.map((order, index) => (
              <SimpleOrderCardNew
                key={index}
                order={order}
                clients={clients}
                products={products}
                onUpdate={(updatedOrder) => handleUpdateOrder(index, updatedOrder)}
                index={index}
                onDelete={() => handleDeleteOrder(index)}
              />
            ))}
          </div>
        )}

        {/* AlertDialog para mensajes */}
        <AlertDialog 
          open={alertMessage !== null}
          onOpenChange={(open) => !open && setAlertMessage(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{alertMessage?.title}</AlertDialogTitle>
              <AlertDialogDescription>
                {alertMessage?.message}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction>Aceptar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* AlertDialog para confirmar eliminación de pedido */}
        <AlertDialog
          open={orderToDelete !== null}
          onOpenChange={(open) => !open && setOrderToDelete(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar eliminación</AlertDialogTitle>
              <AlertDialogDescription>
                ¿Estás seguro de que deseas eliminar el pedido de {orderToDelete?.name}?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDeleteOrder}>Eliminar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Diálogo para ver detalles del análisis */}
        <Dialog open={showAnalysisDialog} onOpenChange={setShowAnalysisDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Detalles del análisis</DialogTitle>
              <DialogDescription>
                Aquí puedes ver el proceso detallado del análisis del mensaje
              </DialogDescription>
            </DialogHeader>
            
            <Tabs value={analysisDialogTab} onValueChange={setAnalysisDialogTab} className="flex-1 overflow-hidden flex flex-col">
              <TabsList className="grid grid-cols-3">
                <TabsTrigger value="phase1">1. Limpieza y análisis</TabsTrigger>
                <TabsTrigger value="phase2">2. Identificación JSON</TabsTrigger>
                <TabsTrigger value="phase3">3. Validación</TabsTrigger>
              </TabsList>
              
              <div className="flex-1 overflow-auto">
                <TabsContent value="phase1" className="mt-0 h-full overflow-auto">
                  <div className="p-4 border rounded-md h-full">
                    <h3 className="text-sm font-medium mb-2 flex items-center gap-1">
                      <FileText size={14} />
                      Fase 1: Limpieza y análisis de texto
                    </h3>
                    <pre className="text-xs whitespace-pre-wrap bg-muted p-4 rounded-md overflow-auto max-h-[60vh]">
                      {phase1Response || "No hay datos disponibles para esta fase"}
                    </pre>
                  </div>
                </TabsContent>
                
                <TabsContent value="phase2" className="mt-0 h-full overflow-auto">
                  <div className="p-4 border rounded-md h-full">
                    <h3 className="text-sm font-medium mb-2 flex items-center gap-1">
                      <FileText size={14} />
                      Fase 2: Identificación y estructura JSON
                    </h3>
                    <pre className="text-xs whitespace-pre-wrap bg-muted p-4 rounded-md overflow-auto max-h-[60vh]">
                      {phase2Response || "No hay datos disponibles para esta fase"}
                    </pre>
                  </div>
                </TabsContent>
                
                <TabsContent value="phase3" className="mt-0 h-full overflow-auto">
                  <div className="p-4 border rounded-md h-full">
                    <h3 className="text-sm font-medium mb-2 flex items-center gap-1">
                      <FileText size={14} />
                      Fase 3: Validación y corrección de resultados
                    </h3>
                    <pre className="text-xs whitespace-pre-wrap bg-muted p-4 rounded-md overflow-auto max-h-[60vh]">
                      {phase3Response || "No hay datos disponibles para esta fase"}
                    </pre>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default MagicOrder;
