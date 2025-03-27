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
import { analyzeCustomerMessage, GeminiError } from "@/services/geminiService";
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
 * v1.0.11
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

  // Cargar clientes y productos al iniciar
  useEffect(() => {
    const loadContextData = async () => {
      try {
        // Cargar clientes
        const { data: clientsData, error: clientsError } = await supabase
          .from('clients')
          .select('id, name, phone');
        
        if (clientsError) throw new Error(clientsError.message);
        if (clientsData) setClients(clientsData);
        
        // Cargar productos con variantes
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('id, name, price, description');
        
        if (productsError) throw new Error(productsError.message);
        
        if (productsData) {
          // Cargar variantes
          const { data: variantsData, error: variantsError } = await supabase
            .from('product_variants')
            .select('id, product_id, name, price');
          
          if (variantsError) throw new Error(variantsError.message);
          
          // Combinar productos con sus variantes
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
    const duration = 8000; // 8 segundos para el análisis simulado
    const interval = 20; // actualizar cada 20ms
    const totalSteps = duration / interval;
    let currentStep = 0;
    
    const timer = setInterval(() => {
      currentStep++;
      // Función sigmoide para que sea más lento al principio y al final
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
      
      // Extraer nombres no reconocidos para mostrar una alerta
      const namesNotInDB: string[] = [];
      
      // Procesar resultados para detectar posibles nombres no reconocidos
      const messageWords = message.toLowerCase().split(/\s+/);
      const clientNamesLower = clients.map(c => c.name.toLowerCase());
      
      // Verificar palabras que podrían ser nombres pero no están en la BD
      const potentialNames = messageWords.filter(word => 
        word.length > 2 && 
        !word.match(/^\d+$/) && // No es un número
        !clientNamesLower.some(name => name.includes(word)) && // No está en ningún nombre de cliente
        !products.some(p => p.name.toLowerCase().includes(word)) // No está en ningún nombre de producto
      );
      
      if (potentialNames.length > 0) {
        // Filtrar nombres que ya están en los resultados
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
          // Aseguramos que matchConfidence sea uno de los valores permitidos
          matchConfidence: (result.client.matchConfidence as 'alto' | 'medio' | 'bajo') || 'bajo'
        },
        items: result.items.map(item => ({
          ...item,
          // Aseguramos que status sea uno de los valores permitidos
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
      
      if (error instanceof GeminiError) {
        if (error.status) {
          errorMessage = `Error HTTP ${error.status}: ${error.message}`;
        } else if (error.apiResponse) {
          errorMessage = `Error en la respuesta de la API: ${error.message}`;
        } else {
          errorMessage = error.message;
        }
        
        // Guardamos la respuesta JSON para mostrarla
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
        
        const itemPrice = item.variant?.price || item.product.price || 0;
        total += item.quantity * itemPrice;
      }
      
      if (hasInvalidItems) {
        return false;
      }

      // Incluir ubicación de recogida si existe
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
        throw orderError;
      }

      const orderItems = order.items.map(item => ({
        order_id: newOrder.id,
        product_id: item.product.id!,
        variant_id: item.variant?.id || null,
        quantity: item.quantity,
        price: item.variant?.price || item.product.price || 0,
        total: item.quantity * (item.variant?.price || item.product.price || 0),
        notes: item.notes
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        throw itemsError;
      }

      const updatedOrders = [...orders];
      updatedOrders[orderIndex] = {
        ...order,
        id: newOrder.id,
        status: 'saved'
      };
      setOrders(updatedOrders);
      
      return true;
    } catch (error: any) {
      console.error("Error al guardar el pedido:", error);
      setAlertMessage({
        title: "Error",
        message: error.message || "Error al guardar el pedido"
      });
      return false;
    }
  };

  const handleSaveAllOrders = async () => {
    setIsSavingAllOrders(true);
    
    try {
      // Filtrar pedidos que se pueden guardar (no tienen dudas)
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
      
      // Guardar cada pedido válido
      for (let i = 0; i < validOrders.length; i++) {
        const orderIndex = orders.findIndex(o => o === validOrders[i]);
        if (orderIndex >= 0) {
          const success = await handleSaveOrder(orderIndex, validOrders[i]);
          if (success) {
            successCount++;
          } else {
            errorCount++;
          }
        }
      }
      
      // Mostrar resultado al finalizar todas las operaciones
      if (successCount > 0) {
        setAlertMessage({
          title: "Pedidos guardados",
          message: `Se ${successCount === 1 ? 'ha' : 'han'} guardado ${successCount} pedido${successCount === 1 ? '' : 's'} correctamente${errorCount > 0 ? ` (${errorCount} con errores)` : ''}`
        });
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
      setIsSavingAllOrders(false);
    }
  };

  const handleConfirmDeleteOrder = () => {
    if (orderToDelete !== null) {
      const updatedOrders = [...orders];
      updatedOrders.splice(orderToDelete.index, 1);
      setOrders(updatedOrders);
      setOrderToDelete(null);
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
  };

  // Separar pedidos completos e incompletos
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
  
  // Verificar si todos los pedidos están completos para habilitar el botón guardar
  const allOrdersComplete = orders.length > 0 && 
    orders.every(order => 
      order.client.id && 
      order.client.matchConfidence === 'alto' && 
      !order.items.some(item => item.status === 'duda' || !item.product.id || !item.quantity)
    );

  // Agrupar pedidos por cliente
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

        {/* Mostrar error de análisis si existe */}
        {analysisError && (
          <Card className="bg-red-50 border-red-200">
            <CardHeader className="py-3">
              <CardTitle className="text-red-800 text-base flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Error en el análisis
              </CardTitle>
            </CardHeader>
            <CardContent className="py-2">
              <p className="text-red-700 text-sm">
                {analysisError}
              </p>
              {rawJsonResponse && (
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
                <Progress value={progress} className="h-2 w-full" />
                <div className="text-xs text-muted-foreground text-right mt-1">
                  Analizando mensaje... {Math.round(progress)}%
                </div>
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
                disabled={isAnalyzing || !message.trim()}
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

        {/* Mostrar nombres no reconocidos */}
        {unmatchedNames.length > 0 && (
          <Card className="bg-amber-50 border-amber-200">
            <CardHeader className="py-3">
              <CardTitle className="text-amber-800 text-base flex items-center gap-2">
                <InfoIcon className="h-4 w-4" />
                Posibles nombres no reconocidos
              </CardTitle>
            </CardHeader>
            <CardContent className="py-0">
              <p className="text-amber-700 text-sm mb-2">
                Estos nombres no fueron reconocidos como clientes existentes:
              </p>
              <div className="flex flex-wrap gap-1 mb-2">
                {unmatchedNames.map((name, i) => (
                  <Badge key={i} variant="outline" className="bg-white text-amber-700 border-amber-300">
                    {name}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-amber-600 italic">
                Si alguno debería ser un cliente, asegúrate de agregarlo a la base de datos.
              </p>
            </CardContent>
          </Card>
        )}

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
            
            <Collapsible open={showOrderSummary} onOpenChange={setShowOrderSummary}>
              <CollapsibleContent>
                {/* Pedidos agrupados por cliente */}
                <div className="space-y-6">
                  {/* Pedidos con problemas primero */}
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
                  
                  {/* Pedidos confirmados */}
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
