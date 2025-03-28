
import { useState, useEffect, useMemo } from 'react';
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { TextareaWithHighlight } from "@/components/TextareaWithHighlight";
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
import { APP_VERSION } from "@/lib/app-config";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Página Mensaje Mágico
 * v1.0.56
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

  // Estado para rastrear el análisis en segundo plano
  const [currentAnalysisId, setCurrentAnalysisId] = useState<string | null>(() => {
    return localStorage.getItem('magicOrder_currentAnalysisId') || null;
  });
  
  // Guardar el ID de análisis actual en localStorage
  useEffect(() => {
    if (currentAnalysisId) {
      localStorage.setItem('magicOrder_currentAnalysisId', currentAnalysisId);
    } else {
      localStorage.removeItem('magicOrder_currentAnalysisId');
    }
  }, [currentAnalysisId]);
  
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

  // Verificar análisis pendientes al cargar la página
  useEffect(() => {
    const checkPendingAnalysis = async () => {
      if (currentAnalysisId) {
        setIsAnalyzing(true);
        updateProgress(30, "Recuperando análisis pendiente...");
        
        try {
          const { data, error } = await supabase
            .from('magic_orders')
            .select('*')
            .eq('id', currentAnalysisId)
            .single();
            
          if (error) throw error;
            
          if (data) {
            if (data.status === 'done') {
              // El análisis se completó mientras el usuario estaba ausente
              setIsAnalyzing(false);
              processCompletedAnalysis(data);
              setCurrentAnalysisId(null);
            } else if (data.status === 'processing' || data.status === 'pending') {
              // El análisis sigue en curso, configurar encuesta periódica
              setProgressStage(data.status === 'processing' ? "Procesando mensaje..." : "Esperando inicio del procesamiento...");
              pollAnalysisStatus(data.id);
            }
          }
        } catch (error) {
          console.error("Error al verificar análisis pendiente:", error);
          setIsAnalyzing(false);
          setCurrentAnalysisId(null);
          updateProgress(0);
        }
      }
    };
    
    checkPendingAnalysis();
  }, [currentAnalysisId]);

  // Configurar suscripción a cambios en tiempo real para la tabla magic_orders
  useEffect(() => {
    if (!currentAnalysisId) return;
    
    // Crear canal de suscripción para el análisis actual
    const channel = supabase
      .channel('magic_orders_changes')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'magic_orders',
        filter: `id=eq.${currentAnalysisId}`
      }, (payload) => {
        console.log('Actualización en tiempo real recibida:', payload);
        const updatedOrder = payload.new;
        
        if (updatedOrder.status === 'processing') {
          updateProgress(60, "Procesando mensaje...");
        } else if (updatedOrder.status === 'done') {
          processCompletedAnalysis(updatedOrder);
          setIsAnalyzing(false);
          setCurrentAnalysisId(null);
        }
      })
      .subscribe();
    
    // Limpieza al desmontar
    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentAnalysisId]);

  // Función para sondear periódicamente el estado del análisis
  const pollAnalysisStatus = async (analysisId: string) => {
    try {
      const { data, error } = await supabase
        .from('magic_orders')
        .select('*')
        .eq('id', analysisId)
        .single();
      
      if (error) throw error;
      
      if (data.status === 'done') {
        processCompletedAnalysis(data);
        setIsAnalyzing(false);
        setCurrentAnalysisId(null);
      } else if (data.status === 'processing') {
        updateProgress(60, "Procesando mensaje...");
        setTimeout(() => pollAnalysisStatus(analysisId), 3000);
      } else if (data.status === 'pending') {
        updateProgress(30, "Esperando inicio del procesamiento...");
        setTimeout(() => pollAnalysisStatus(analysisId), 3000);
      }
    } catch (error) {
      console.error("Error al consultar estado del análisis:", error);
      setIsAnalyzing(false);
      setCurrentAnalysisId(null);
      updateProgress(0);
    }
  };
  
  // Procesar un análisis completado
  const processCompletedAnalysis = (analysis: any) => {
    if (!analysis || !analysis.result) {
      setAlertMessage({
        title: "Error en el análisis",
        message: "No se pudo recuperar el resultado del análisis"
      });
      return;
    }
    
    updateProgress(100, "¡Análisis completado!");
    
    if (analysis.phase1_response) setPhase1Response(analysis.phase1_response);
    if (analysis.phase2_response) setPhase2Response(analysis.phase2_response);
    if (analysis.phase3_response) setPhase3Response(analysis.phase3_response);
    if (analysis.analysis_time) setAnalysisTime(analysis.analysis_time);
    
    const result = analysis.result;
    
    if (result.length === 0) {
      setAlertMessage({
        title: "No se encontraron pedidos",
        message: "No se pudo identificar ningún pedido en el mensaje. Intenta con un formato más claro, por ejemplo: 'nombre 2 producto'"
      });
      return;
    }
    
    const newOrders = result.map(result => {
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
    
    setOrders(newOrders);
    setShowOrderSummary(true);
    
    // Notificar que el análisis ha terminado
    const completionEvent = new CustomEvent('analysisStateChange', {
      detail: { 
        isAnalyzing: false,
        ordersCount: newOrders.length
      }
    });
    window.dispatchEvent(completionEvent);
    
    toast({
      title: "Análisis completado",
      description: `Se ${newOrders.length === 1 ? 'ha' : 'han'} detectado ${newOrders.length} pedido${newOrders.length === 1 ? '' : 's'}`,
      variant: "success"
    });
  };

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

    // Limpiar pedidos anteriores
    setOrders([]);
    localStorage.removeItem('magicOrder_orders');
    
    setIsAnalyzing(true);
    setAnalysisError(null);
    setRawJsonResponse(null);
    setPhase1Response(null);
    setPhase2Response(null);
    setPhase3Response(null);
    setProgress(10);
    setProgressStage("Iniciando análisis en segundo plano...");
    setAnalysisTime(null);
    
    try {
      // Crear un nuevo registro en magic_orders
      const { data: newOrder, error } = await supabase
        .from('magic_orders')
        .insert([{
          message: message,
          status: 'pending',
          api_provider: 'google-gemini',
          model: GOOGLE_GEMINI_MODELS.GEMINI_FLASH_2
        }])
        .select()
        .single();
      
      if (error) throw error;
      
      if (!newOrder || !newOrder.id) {
        throw new Error("No se pudo crear el registro para el análisis");
      }
      
      // Guardar el ID del análisis actual
      setCurrentAnalysisId(newOrder.id);
      
      // Limpiar el campo de mensaje
      setMessage("");
      
      // Llamar a la Edge Function para iniciar el análisis en segundo plano
      const { data, error: functionError } = await supabase.functions
        .invoke('analyze-message', {
          body: { messageId: newOrder.id }
        });
      
      if (functionError) {
        console.error("Error al invocar la función de análisis:", functionError);
        // No fallar aquí, ya que el análisis podría estar en curso de todos modos
      }
      
      updateProgress(30, "Procesando mensaje en segundo plano...");
      
      // Notificar que el análisis está en curso
      window.dispatchEvent(new CustomEvent('analysisStateChange', {
        detail: { 
          isAnalyzing: true,
          stage: "Procesando mensaje en segundo plano..." 
        }
      }));
      
    } catch (error) {
      console.error("Error al iniciar el análisis:", error);
      
      setAnalysisError(error instanceof Error ? error.message : "Error desconocido");
      setAlertMessage({
        title: "Error al iniciar análisis",
        message: error instanceof Error ? error.message : "Error desconocido al iniciar el análisis"
      });
      
      setIsAnalyzing(false);
      setCurrentAnalysisId(null);
      updateProgress(0);
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
            
            {/* Versión de la aplicación */}
            <div className="mt-1 text-xs text-muted-foreground/70">
              Versión: {APP_VERSION} • Procesamiento en segundo plano activado
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
              <p className="text-red-700 text-sm">{analyzeError}</p>
            </CardContent>
          </Card>
        )}

        {/* Sección de entrada del mensaje */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-0">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquareText className="h-5 w-5 text-primary" />
              Mensaje del cliente
            </CardTitle>
            <CardDescription>
              Ingresa el mensaje del cliente para analizarlo
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {/* Textarea para el mensaje */}
            <div className="mb-4">
              <TextareaWithHighlight
                placeholder="Pega o escribe aquí el mensaje del cliente..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                clients={clients}
                products={products}
                className="min-h-[150px] font-medium"
                clearable={true}
                onClear={handleClearMessage}
              />
            </div>
            
            <div className="flex items-center gap-2 justify-between">
              <div className="flex items-center gap-2">
                <Button 
                  onClick={handleAnalyzeMessage}
                  disabled={isAnalyzing || !message.trim()}
                  className="flex items-center gap-2"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analizando...
                    </>
                  ) : (
                    <>
                      <Wand className="h-4 w-4" />
                      Analizar mensaje
                    </>
                  )}
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={handlePaste}
                  disabled={isAnalyzing}
                  className="flex items-center gap-1"
                >
                  <Clipboard className="h-4 w-4" />
                  Pegar
                </Button>
              </div>
              
              <div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowGenerator(!showGenerator)}
                  className="text-xs"
                >
                  {showGenerator ? "Ocultar ejemplos" : "Ver ejemplos"}
                </Button>
              </div>
            </div>
            
            {isAnalyzing && (
              <div className="mt-6">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-muted-foreground">
                    {progressStage || "Procesando..."}
                  </span>
                  <span className="text-sm font-medium">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Generador de ejemplos */}
        {showGenerator && (
          <MessageExampleGenerator onSelectExample={handleSelectExample} />
        )}
        
        {/* Resultados del análisis y pedidos detectados */}
        {orders.length > 0 && (
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  Pedidos detectados
                </CardTitle>
                <CardDescription>
                  Se {orders.length === 1 ? 'ha' : 'han'} detectado {orders.length} {orders.length === 1 ? 'pedido' : 'pedidos'}
                </CardDescription>
              </div>
              
              <Button 
                variant="outline"
                size="sm"
                onClick={() => setShowOrderSummary(!showOrderSummary)}
                className="flex items-center gap-1"
              >
                {showOrderSummary ? (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    Ocultar
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    Mostrar
                  </>
                )}
              </Button>
            </CardHeader>
            
            {showOrderSummary && (
              <CardContent className="py-0">
                <div className="mb-2 grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-sm font-medium">
                      Pedidos con dudas: {incompleteOrders.length}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Requieren revisión
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      Pedidos listos: {completeOrders.length}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Listos para guardar
                    </p>
                  </div>
                </div>
                
                {/* Botón para guardar todos los pedidos */}
                {orders.length > 0 && (
                  <div className="mt-4 mb-6">
                    <Button 
                      className="w-full flex items-center justify-center gap-2"
                      disabled={!allOrdersComplete || isSavingAllOrders}
                      onClick={handleSaveAllOrders}
                    >
                      {isSavingAllOrders ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Guardando pedidos...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4" />
                          Guardar todos los pedidos
                        </>
                      )}
                    </Button>
                    
                    {!allOrdersComplete && (
                      <p className="text-xs text-center mt-1 text-muted-foreground">
                        Hay pedidos con dudas. Resuelve todas las dudas para habilitar el guardado.
                      </p>
                    )}
                  </div>
                )}
                
                {/* Mostrar los pedidos agrupados por cliente */}
                <div className="space-y-6">
                  {Object.entries(ordersByClient).map(([clientId, { clientName, orders: clientOrders, indices }]) => (
                    <div key={clientId} className="border rounded-lg overflow-hidden">
                      <div className="bg-muted px-4 py-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-primary" />
                          <span className="font-medium">{clientName}</span>
                          
                          {clientOrders.some(o => !o.client.id || o.client.matchConfidence !== 'alto') && (
                            <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-600 border-yellow-200">
                              Cliente con dudas
                            </Badge>
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {clientOrders.length} {clientOrders.length === 1 ? 'pedido' : 'pedidos'}
                        </span>
                      </div>
                      
                      <div className="divide-y">
                        {indices.map(index => (
                          <div key={index} className="p-4">
                            <SimpleOrderCardNew 
                              order={orders[index]}
                              clients={clients}
                              products={products}
                              onUpdateOrder={(updatedOrder) => handleUpdateOrder(index, updatedOrder)}
                              onDelete={() => handleDeleteOrder(index)}
                              onSave={() => handleSaveOrder(index, orders[index])}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        )}
        
        {/* Diálogo para ver el análisis en detalle */}
        <Dialog open={showAnalysisDialog} onOpenChange={setShowAnalysisDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>Análisis en detalle</DialogTitle>
              <DialogDescription>
                Revisa cómo se procesó el mensaje del cliente
              </DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue={analysisDialogTab} onValueChange={setAnalysisDialogTab}>
              <TabsList className="grid grid-cols-3">
                <TabsTrigger value="phase1">Fase 1: Preprocesamiento</TabsTrigger>
                <TabsTrigger value="phase2">Fase 2: Análisis de intenciones</TabsTrigger>
                <TabsTrigger value="phase3">Fase 3: Estructuración</TabsTrigger>
              </TabsList>
              
              <TabsContent value="phase1" className="space-y-4 mt-4">
                <div className="border rounded-md p-4 text-sm font-mono whitespace-pre-wrap text-muted-foreground">
                  {phase1Response || "No hay datos disponibles para esta fase."}
                </div>
              </TabsContent>
              
              <TabsContent value="phase2" className="space-y-4 mt-4">
                <div className="border rounded-md p-4 text-sm font-mono whitespace-pre-wrap text-muted-foreground">
                  {phase2Response || "No hay datos disponibles para esta fase."}
                </div>
              </TabsContent>
              
              <TabsContent value="phase3" className="space-y-4 mt-4">
                <div className="border rounded-md p-4 text-sm font-mono whitespace-pre-wrap text-muted-foreground">
                  {phase3Response || "No hay datos disponibles para esta fase."}
                </div>
                {rawJsonResponse && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium mb-2">Respuesta JSON cruda:</h3>
                    <pre className="border rounded-md p-4 text-xs overflow-auto max-h-64">
                      {rawJsonResponse}
                    </pre>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
        
        {/* Diálogo de alerta para mensajes */}
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
        
        {/* Diálogo de confirmación para eliminar pedido */}
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
              <AlertDialogAction variant="destructive" onClick={handleConfirmDeleteOrder}>
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
};

export default MagicOrder;
