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
 * v1.0.10
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

  const handleDeleteOrder = (index: number, name: string) => {
    setOrderToDelete({ index, name });
  };

  const confirmDeleteOrder = () => {
    if (orderToDelete) {
      setOrders(prevOrders => {
        const newOrders = [...prevOrders];
        newOrders.splice(orderToDelete.index, 1);
        return newOrders;
      });
      setOrderToDelete(null);
    }
  };

  const cancelDeleteOrder = () => {
    setOrderToDelete(null);
  };

  const handleClearOrders = () => {
    setAlertMessage({
      title: "¿Borrar todos los pedidos?",
      message: "¿Estás seguro de que quieres borrar todos los pedidos? Esta acción no se puede deshacer."
    });
  };

  const confirmClearOrders = () => {
    setOrders([]);
    setAlertMessage(null);
  };

  const handleSaveAllOrders = async () => {
    setIsSavingAllOrders(true);
    try {
      for (const order of orders) {
        const client = clients.find(c => c.name === order.client.name);
        if (!client) {
          console.warn(`Cliente no encontrado: ${order.client.name}`);
          continue;
        }

        const { data: newOrder, error: orderError } = await supabase
          .from('orders')
          .insert({
            client_id: client.id,
            total: 0,
            status: order.status,
            is_paid: order.isPaid
          })
          .select()
          .single();

        if (orderError) {
          console.error("Error al crear la orden:", orderError);
          continue;
        }

        let totalOrder = 0;

        for (const item of order.items) {
          const product = products.find(p => p.name === item.name);
          if (!product) {
            console.warn(`Producto no encontrado: ${item.name}`);
            continue;
          }

          const itemPrice = product.price || 0;
          totalOrder += itemPrice * item.quantity;

          const { error: orderItemError } = await supabase
            .from('order_items')
            .insert({
              order_id: newOrder.id,
              product_id: product.id,
              quantity: item.quantity,
              price: itemPrice
            });

          if (orderItemError) {
            console.error("Error al crear el order_item:", orderItemError);
          }
        }

        // Actualizar el total de la orden
        const { error: updateOrderError } = await supabase
          .from('orders')
          .update({ total: totalOrder })
          .eq('id', newOrder.id);

        if (updateOrderError) {
          console.error("Error al actualizar el total de la orden:", updateOrderError);
        }
      }

      toast({
        title: "Pedidos guardados",
        description: "Todos los pedidos han sido guardados exitosamente.",
        variant: "success"
      });
      setOrders([]);
    } catch (error) {
      console.error("Error al guardar los pedidos:", error);
      toast({
        title: "Error al guardar pedidos",
        description: "Hubo un error al guardar los pedidos. Por favor, inténtalo de nuevo.",
        variant: "destructive"
      });
    } finally {
      setIsSavingAllOrders(false);
    }
  };

  const handleUpdateOrderStatus = async (index: number, status: 'pending' | 'processing' | 'completed' | 'cancelled') => {
    setOrders(prevOrders => {
      const newOrders = [...prevOrders];
      newOrders[index] = { ...newOrders[index], status: status };
      return newOrders;
    });
  };

  const handleUpdateOrderIsPaid = (index: number, isPaid: boolean) => {
    setOrders(prevOrders => {
      const newOrders = [...prevOrders];
      newOrders[index] = { ...newOrders[index], isPaid: isPaid };
      return newOrders;
    });
  };

  const handleUpdateOrderItemStatus = (orderIndex: number, itemIndex: number, status: 'duda' | 'confirmado') => {
    setOrders(prevOrders => {
      const newOrders = [...prevOrders];
      const updatedItems = [...newOrders[orderIndex].items];
      updatedItems[itemIndex] = { ...updatedItems[itemIndex], status: status };
      newOrders[orderIndex] = { ...newOrders[orderIndex], items: updatedItems };
      return newOrders;
    });
  };

  return (
    <AppLayout>
      <div className="md:flex md:items-start md:justify-between gap-4">
        <div className="md:w-1/2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquareText className="h-5 w-5 text-blue-500" />
                Mensaje del cliente
              </CardTitle>
              <CardDescription>
                Ingresa el mensaje del cliente para analizar los pedidos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <MessageExampleGenerator onSelectExample={setMessage} />
              <Textarea
                placeholder="Escribe el mensaje del cliente aquí..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                clearable={true}
                onClear={() => setMessage("")}
                rows={4}
                disabled={isAnalyzing}
              />
              <Button
                className="w-full flex items-center gap-2 justify-center"
                onClick={handleAnalyzeMessage}
                disabled={isAnalyzing}
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
              {isAnalyzing && (
                <Progress value={progress} className="mt-2" />
              )}
              {analysisError && (
                <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    <span>Error en el análisis:</span>
                  </div>
                  <p className="mt-2">{analysisError}</p>
                  {rawJsonResponse && (
                    <>
                      <Separator className="my-2" />
                      <Collapsible>
                        <CollapsibleTrigger className="w-full text-left text-muted-foreground hover:underline flex items-center justify-between">
                          Mostrar respuesta JSON
                          <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-300 peer-data-[state=open]:rotate-180" />
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <pre className="mt-2 rounded-md bg-muted/5 p-2 text-xs">
                            {rawJsonResponse}
                          </pre>
                        </CollapsibleContent>
                      </Collapsible>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="md:w-1/2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Clipboard className="h-5 w-5 text-primary" />
              Resumen de pedidos
            </h2>
            <div>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleClearOrders}
                disabled={orders.length === 0}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Borrar todo
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="ml-2"
                onClick={handleSaveAllOrders}
                disabled={orders.length === 0 || isSavingAllOrders}
              >
                {isSavingAllOrders ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Guardar todo
                  </>
                )}
              </Button>
            </div>
          </div>

          {orders.length === 0 ? (
            <Card className="opacity-70">
              <CardContent className="grid place-items-center p-10">
                <HelpCircle className="h-10 w-10 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground mt-4">
                  No hay pedidos para mostrar.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {orders.map((order, index) => (
                <SimpleOrderCardNew
                  key={index}
                  order={order}
                  index={index}
                  clients={clients}
                  products={products}
                  onDelete={() => handleDeleteOrder(index, order.client.name)}
                  onUpdateStatus={(status) => handleUpdateOrderStatus(index, status)}
                  onUpdateIsPaid={(isPaid) => handleUpdateOrderIsPaid(index, isPaid)}
                  onUpdateOrderItemStatus={(itemIndex, status) => handleUpdateOrderItemStatus(index, itemIndex, status)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Alerta genérica reutilizable */}
      <AlertDialog open={alertMessage !== null} onOpenChange={(open) => !open && setAlertMessage(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{alertMessage?.title || "Información"}</AlertDialogTitle>
            <AlertDialogDescription>
              {alertMessage?.message || ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {alertMessage?.title === "¿Borrar todos los pedidos?" ? (
              <>
                <AlertDialogCancel onClick={() => setAlertMessage(null)}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={confirmClearOrders}>Confirmar</AlertDialogAction>
              </>
            ) : orderToDelete ? (
              <>
                <AlertDialogCancel onClick={cancelDeleteOrder}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDeleteOrder}>Confirmar</AlertDialogAction>
              </>
            ) : (
              <AlertDialogAction onClick={() => setAlertMessage(null)}>Aceptar</AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default MagicOrder;
