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
  InfoIcon,
  FileText,
  Code,
  Timer,
  Clock
} from 'lucide-react';
import { supabase } from "@/lib/supabase";
import { 
  analyzeCustomerMessage, 
  GeminiError,
  setApiProvider,
  getCurrentApiProvider,
  setGeminiModel,
  getCurrentGeminiModel,
  ApiProvider
} from "@/services/geminiService";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GOOGLE_GEMINI_MODELS } from "@/lib/api-config";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Página Mensaje Mágico
 * v1.0.47
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
  
  // Nuevo estado para el API Provider y modelo
  const [apiProvider, setApiProviderState] = useState<ApiProvider>(() => {
    const savedProvider = localStorage.getItem('magicOrder_apiProvider');
    return (savedProvider as ApiProvider) || "cohere";
  });
  
  const [geminiModel, setGeminiModelState] = useState<string>(() => {
    const savedModel = localStorage.getItem('magicOrder_geminiModel');
    return savedModel || GOOGLE_GEMINI_MODELS.GEMINI_PRO;
  });
  
  // Estado para el tiempo de análisis
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

  const handleAnalyzeMessage = async () => {
    if (!message.trim()) {
      setAlertMessage({
        title: "Campo vacío",
        message: "Por favor, ingresa un mensaje para analizar"
      });
      return;
    }

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
    
    // Disparamos un evento para actualizar la insignia AI
    const event = new CustomEvent('analysisStateChange', {
      detail: { 
        isAnalyzing: true,
        stage: "Preparando análisis..." 
      }
    });
    window.dispatchEvent(event);

    try {
      // Procesamos el mensaje en segundo plano
      const result = await analyzeCustomerMessage(messageToAnalyze, updateProgress);
      
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
        setOrders(prevOrders => [...prevOrders, ...newOrders]);
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
      // Notificamos que el análisis ha terminado
      window.dispatchEvent(new CustomEvent('analysisStateChange', {
        detail: { isAnalyzing: false }
      }));
      
      setTimeout(() => {
        setIsAnalyzing(false);
        setProgress(0);
        setProgressStage("");
      }, 1000);
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

        {/* Selector de API y modelo */}
        <Card className="rounded-xl shadow-sm overflow-hidden">
          <CardHeader className="py-3">
            <CardTitle className="text-base">Configuración de la IA</CardTitle>
          </CardHeader>
          <CardContent className="pb-3 pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Proveedor de IA</label>
                <Select 
                  value={apiProvider} 
                  onValueChange={(value) => setApiProviderState(value as ApiProvider)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar proveedor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cohere">Cohere (Command R+)</SelectItem>
                    <SelectItem value="google-gemini">Google Gemini</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {apiProvider === "google-gemini" && (
                <div>
                  <label className="text-sm font-medium mb-1 block">Modelo de Gemini</label>
                  <Select 
                    value={geminiModel} 
                    onValueChange={(value) => setGeminiModelState(value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleccionar modelo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={GOOGLE_GEMINI_MODELS.GEMINI_PRO}>Gemini Pro</SelectItem>
                      <SelectItem value={GOOGLE_GEMINI_MODELS.GEMINI_PRO_VISION}>Gemini Pro Vision</SelectItem>
                      <SelectItem value={GOOGLE_GEMINI_MODELS.GEMINI_FLASH}>Gemini 1.5 Flash</SelectItem>
                      <SelectItem value={GOOGLE_GEMINI_MODELS.GEMINI_FLASH_2}>Gemini 1.5 Flash 2.0</SelectItem>
                      <SelectItem value={GOOGLE_GEMINI_MODELS.GEMINI_PRO_LATEST}>Gemini 1.5 Pro (Latest)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            
            {/* Tiempo de análisis */}
            {analysisTime !== null && (
              <div className="mt-3 text-sm flex items-center gap-1 text-muted-foreground">
                <Clock size={14} className="mr-1" />
                <span>Tiempo de análisis: <span className="font-medium">{formatAnalysisTime(analysisTime)}</span></span>
              </div>
            )}
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
            <Textarea
              placeholder="Por ejemplo: 'Hola, soy María López y quiero 2 paquetes de pañales talla 1 y 1.5 kg de queso fresco'"
              className="min-h-32"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              clearable={true}
              onClear={handleClearMessage}
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
                disabled={isAnalyzing}
              >
                <Clipboard className="h-4 w-4 mr-2" />
                Pegar
              </Button>
              
              <Button 
                onClick={handleAnalyzeMessage}
                disabled={isAnalyzing || !message.trim() || isLoadingData}
              >
                <div className="flex items-center gap-2">
                  {isAnalyzing ? (
                    <>
                      <Sparkles className="h-4 w-4 animate-pulse" />
                      Haciendo magia...
                    </>
                  ) : (
                    <>
                      <Wand className="h-4 w-4" />
                      Analizar Mensaje
                    </>
                  )}
                </div>
              </Button>
            </div>
          </CardFooter>
        </Card>

        {orders.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <MessageSquareText className="h-5 w-5 text-primary" />
                  Pedidos Detectados ({orders.length})
                </h2>
                
                <div className="flex gap-3 mt-1">
                  {incompleteOrders.length > 0 && (
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                      <AlertCircle size={12} className="mr-1" />
                      {incompleteOrders.length} requiere{incompleteOrders.length !== 1 ? 'n' : ''} atención
                    </Badge>
                  )}
                  
                  {completeOrders.length > 0 && (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      <Check size={12} className="mr-1" />
                      {completeOrders.length} confirmado{completeOrders.length !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="flex gap-2">
                {orders.length > 0 && (
                  <Button 
                    onClick={handleSaveAllOrders}
                    disabled={isSavingAllOrders || orders.length === 0 || !allOrdersComplete}
                    className="flex items-center gap-1"
                  >
                    {isSavingAllOrders ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        Guardar pedidos
                      </>
                    )}
                  </Button>
                )}
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowOrderSummary(!showOrderSummary)}
                >
                  {showOrderSummary ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-1" />
                      Ocultar
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-1" />
                      Mostrar
                    </>
                  )}
                </Button>
              </div>
            </div>
            
            <Separator />
            
            {isSavingAllOrders && progress > 0 && (
              <div className="w-full my-2">
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
            
            <Collapsible open={showOrderSummary} onOpenChange={setShowOrderSummary}>
              <CollapsibleContent>
                <div className="space-y-6">
                  {incompleteOrders.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-md font-semibold mb-3 flex items-center gap-2">
                        <AlertCircle size={16} className="text-amber-600" />
                        Pedidos que Requieren Atención ({incompleteOrders.length})
                      </h3>
                      
                      {Object.entries(ordersByClient)
                        .filter(([_, group]) => 
                          group.orders.some(order => 
                            !order.client.id || 
                            order.client.matchConfidence !== 'alto' || 
                            order.items.some(item => item.status === 'duda' || !item.product.id || !item.quantity)
                          )
                        )
                        .map(([clientId, group]) => (
                          <div key={clientId} className="mb-4">
                            {group.orders
                              .filter(order => 
                                !order.client.id || 
                                order.client.matchConfidence !== 'alto' || 
                                order.items.some(item => item.status === 'duda' || !item.product.id || !item.quantity)
                              )
                              .map((order, groupIndex) => {
                                const orderIndex = group.indices[group.orders.indexOf(order)];
                                return (
                                  <SimpleOrderCardNew
                                    key={`${clientId}-${groupIndex}`}
                                    order={order}
                                    clients={clients}
                                    products={products}
                                    onUpdate={(updatedOrder) => handleUpdateOrder(orderIndex, updatedOrder)}
                                    index={orderIndex}
                                    onDelete={() => handleDeleteOrder(orderIndex)}
                                  />
                                );
                              })
                            }
                          </div>
                        ))
                      }
                    </div>
                  )}
                  
                  {completeOrders.length > 0 && (
                    <div>
                      <h3 className="text-md font-semibold mb-3 flex items-center gap-2">
                        <Check size={16} className="text-green-600" />
                        Pedidos Confirmados ({completeOrders.length})
                      </h3>
                      
                      {Object.entries(ordersByClient)
                        .filter(([_, group]) => 
                          group.orders.some(order => 
                            order.client.id && 
                            order.client.matchConfidence === 'alto' && 
                            !order.items.some(item => item.status === 'duda' || !item.product.id || !item.quantity)
                          )
                        )
                        .map(([clientId, group]) => (
                          <div key={clientId} className="mb-4">
                            {group.orders
                              .filter(order => 
                                order.client.id && 
                                order.client.matchConfidence === 'alto' && 
                                !order.items.some(item => item.status === 'duda' || !item.product.id || !item.quantity)
                              )
                              .map((order, groupIndex) => {
                                const orderIndex = group.indices[group.orders.indexOf(order)];
                                return (
                                  <SimpleOrderCardNew
                                    key={`${clientId}-${groupIndex}`}
                                    order={order}
                                    clients={clients}
                                    products={products}
                                    onUpdate={(updatedOrder) => handleUpdateOrder(orderIndex, updatedOrder)}
                                    index={orderIndex}
                                    onDelete={() => handleDeleteOrder(orderIndex)}
                                  />
                                );
                              })
                            }
                          </div>
                        ))
                      }
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}
      </div>

      <Dialog open={showAnalysisDialog} onOpenChange={setShowAnalysisDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Detalle del análisis completo
            </DialogTitle>
            <DialogDescription>
              Visualiza los resultados de cada paso del análisis para entender mejor cómo se procesó el mensaje.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs value={analysisDialogTab} onValueChange={setAnalysisDialogTab} className="w-full overflow-hidden flex-1 flex flex-col">
            <TabsList className="grid grid-cols-3 mb-2">
              <TabsTrigger value="phase1" className="flex items-center gap-1">
                <FileText size={14} />
                Fase 1: Análisis
              </TabsTrigger>
              <TabsTrigger value="phase2" className="flex items-center gap-1">
                <Code size={14} />
                Fase 2: JSON Inicial
              </TabsTrigger>
              <TabsTrigger value="phase3" className="flex items-center gap-1">
                <Check size={14} />
                Fase 3: JSON Corregido
              </TabsTrigger>
            </TabsList>
            
            <div className="overflow-auto flex-1">
              <TabsContent value="phase1" className="h-full">
                {phase1Response ? (
                  <div className="bg-slate-50 p-4 rounded-md border border-slate-200 overflow-auto h-full">
                    <pre className="whitespace-pre-wrap text-sm text-slate-800 break-words">{phase1Response}</pre>
                  </div>
                ) : (
                  <div className="text-center p-8 text-muted-foreground">
                    No hay respuesta disponible para la primera fase.
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="phase2" className="h-full">
                {phase2Response ? (
                  <div className="bg-slate-50 p-4 rounded-md border border-slate-200 overflow-auto h-full">
                    <pre className="whitespace-pre-wrap text-sm font-mono text-slate-800 break-words">{phase2Response}</pre>
                  </div>
                ) : (
                  <div className="text-center p-8 text-muted-foreground">
                    No hay respuesta disponible para la segunda fase.
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="phase3" className="h-full">
                {phase3Response ? (
                  <div className="bg-slate-50 p-4 rounded-md border border-slate-200 overflow-auto h-full">
                    <pre className="whitespace-pre-wrap text-sm font-mono text-slate-800 break-words">{phase3Response}</pre>
                  </div>
                ) : (
                  <div className="text-center p-8 text-muted-foreground">
                    No hay respuesta disponible para la tercera fase. Se usó un proceso optimizado de dos fases.
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>
          
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowAnalysisDialog(false)}>
              Cerrar
            </Button>
            <Button 
              variant="default"
              onClick={() => {
                let textToCopy = "";
                if (analysisDialogTab === 'phase1') textToCopy = phase1Response || "";
                else if (analysisDialogTab === 'phase2') textToCopy = phase2Response || "";
                else if (analysisDialogTab === 'phase3') textToCopy = phase3Response || "";
                
                if (textToCopy) {
                  navigator.clipboard.writeText(textToCopy)
                    .then(() => toast({
                      title: "Copiado al portapapeles",
                      description: "El texto ha sido copiado correctamente",
                      variant: "default"
                    }))
                    .catch(() => toast({
                      title: "Error al copiar",
                      description: "No se pudo copiar el texto al portapapeles",
                      variant: "destructive"
                    }));
                }
              }}
            >
              <Clipboard className="h-4 w-4 mr-2" />
              Copiar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={orderToDelete !== null} onOpenChange={(open) => !open && setOrderToDelete(null)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este pedido?</AlertDialogTitle>
            <AlertDialogDescription>
              {orderToDelete && `El pedido preliminar para ${orderToDelete.name} será eliminado permanentemente. Esta acción no se puede deshacer.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteOrder}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog 
        open={alertMessage !== null}
        onOpenChange={(open) => !open && setAlertMessage(null)}
      >
        <AlertDialogContent className="max-w-md">
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
    </AppLayout>
  );
};

export default MagicOrder;
