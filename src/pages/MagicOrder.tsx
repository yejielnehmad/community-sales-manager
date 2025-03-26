
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
  Plus
} from 'lucide-react';
import { supabase } from "@/lib/supabase";
import { analyzeCustomerMessage, GeminiError } from "@/services/geminiService";
import { OrderCard } from "@/components/OrderCard";
import { MessageExampleGenerator } from "@/components/MessageExampleGenerator";
import { OrderCard as OrderCardType, MessageAnalysis, MessageItem, MessageAlternative, MessageClient } from "@/types";
import { generateMessageExample } from "@/services/aiLabsService";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FormField, FormItem, FormLabel, FormControl, FormDescription, Form } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

/**
 * Componente para la tarjeta de pedido simplificada
 */
const SimpleOrderCard = ({ 
  order, 
  clients, 
  products, 
  onUpdate, 
  index,
  onDelete
}: { 
  order: OrderCardType, 
  clients: any[], 
  products: any[],
  onUpdate: (updatedOrder: OrderCardType) => void,
  index: number,
  onDelete: () => void
}) => {
  // Verificamos si hay información faltante
  const hasMissingInfo = !order.client.id || order.items.some(item => !item.product.id || item.status === 'duda' || !item.quantity);
  const hasClientProblem = !order.client.id || order.client.matchConfidence !== 'alto';
  
  // Agrupar las variantes por producto
  const productVariantsMap = useMemo(() => {
    const variantMap: Record<string, any[]> = {};
    products.forEach(product => {
      if (product.variants && product.variants.length) {
        variantMap[product.id] = product.variants;
      }
    });
    return variantMap;
  }, [products]);
  
  // Handler para actualizar cliente
  const handleClientUpdate = (clientId: string) => {
    const selectedClient = clients.find(c => c.id === clientId);
    if (selectedClient) {
      const updatedOrder = {
        ...order,
        client: {
          id: selectedClient.id,
          name: selectedClient.name,
          matchConfidence: 'alto'
        }
      };
      onUpdate(updatedOrder);
    }
  };
  
  // Handler para actualizar producto
  const handleProductUpdate = (itemIndex: number, productId: string) => {
    const selectedProduct = products.find(p => p.id === productId);
    if (selectedProduct) {
      const updatedItems = [...order.items];
      
      // Si el producto tiene variantes y no se ha seleccionado una, mantenemos el estado de duda
      const hasVariants = productVariantsMap[productId] && productVariantsMap[productId].length > 0;
      
      updatedItems[itemIndex] = {
        ...updatedItems[itemIndex],
        product: {
          id: selectedProduct.id,
          name: selectedProduct.name,
          price: selectedProduct.price
        },
        status: hasVariants && !updatedItems[itemIndex].variant?.id ? 'duda' : 'confirmado',
        notes: hasVariants && !updatedItems[itemIndex].variant?.id ? 
          "Falta seleccionar una variante" : 
          updatedItems[itemIndex].notes
      };
      
      const updatedOrder = {
        ...order,
        items: updatedItems
      };
      onUpdate(updatedOrder);
    }
  };
  
  // Handler para actualizar variante
  const handleVariantUpdate = (itemIndex: number, variantId: string) => {
    if (!order.items[itemIndex].product.id) return;
    
    const variants = productVariantsMap[order.items[itemIndex].product.id];
    const selectedVariant = variants?.find(v => v.id === variantId);
    
    if (selectedVariant) {
      const updatedItems = [...order.items];
      updatedItems[itemIndex] = {
        ...updatedItems[itemIndex],
        variant: {
          id: selectedVariant.id,
          name: selectedVariant.name,
          price: selectedVariant.price
        },
        status: updatedItems[itemIndex].quantity ? 'confirmado' : 'duda'
      };
      
      const updatedOrder = {
        ...order,
        items: updatedItems
      };
      onUpdate(updatedOrder);
    }
  };
  
  // Handler para actualizar cantidad
  const handleQuantityUpdate = (itemIndex: number, quantity: number) => {
    const updatedItems = [...order.items];
    updatedItems[itemIndex] = {
      ...updatedItems[itemIndex],
      quantity,
      status: updatedItems[itemIndex].product.id ? 'confirmado' : 'duda'
    };
    
    const updatedOrder = {
      ...order,
      items: updatedItems
    };
    onUpdate(updatedOrder);
  };
  
  // Agregamos un producto vacío
  const handleAddEmptyProduct = () => {
    const updatedItems = [...order.items, {
      product: { name: "Seleccionar producto" },
      quantity: 1,
      status: 'duda'
    }];
    
    const updatedOrder = {
      ...order,
      items: updatedItems
    };
    onUpdate(updatedOrder);
  };
  
  return (
    <Card className={`mb-2 overflow-hidden border-l-4 transition-all ${hasMissingInfo 
      ? 'border-l-amber-500 shadow-sm'
      : 'border-l-green-500 shadow-sm'}`}
    >
      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <User size={16} className={hasClientProblem ? "text-amber-500" : "text-green-500"} />
          
          {order.client.id ? (
            <CardTitle className="text-base font-medium">{order.client.name}</CardTitle>
          ) : (
            <div className="flex items-center gap-2">
              <Select onValueChange={handleClientUpdate}>
                <SelectTrigger className="w-[200px] border-amber-300 bg-amber-50 text-amber-800">
                  <SelectValue placeholder="Seleccionar cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                <AlertCircle size={12} className="mr-1" />
                Falta cliente
              </Badge>
            </div>
          )}
        </div>
        
        <Button variant="ghost" size="icon" onClick={onDelete} className="h-8 w-8">
          <X size={16} />
        </Button>
      </CardHeader>
      
      <CardContent className="px-4 py-1">
        <ul className="space-y-2">
          {order.items.map((item, itemIndex) => {
            const hasProductIssue = !item.product.id || item.status === 'duda';
            const hasVariantIssue = item.product.id && productVariantsMap[item.product.id]?.length > 0 && !item.variant?.id;
            const hasQuantityIssue = !item.quantity;
            
            return (
              <li key={itemIndex} className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package size={16} className={hasProductIssue ? "text-amber-500" : "text-green-500"} />
                    
                    {item.product.id ? (
                      <span className="font-medium">{item.product.name}</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Select onValueChange={(value) => handleProductUpdate(itemIndex, value)}>
                          <SelectTrigger className="w-[200px] border-amber-300 bg-amber-50 text-amber-800">
                            <SelectValue placeholder="Seleccionar producto" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map(product => (
                              <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                          <AlertCircle size={12} className="mr-1" />
                          Falta producto
                        </Badge>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {hasQuantityIssue ? (
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min="1"
                          className="w-16 h-8 border-amber-300 bg-amber-50 text-amber-800"
                          placeholder="Cant."
                          onChange={(e) => handleQuantityUpdate(itemIndex, parseInt(e.target.value) || 0)}
                        />
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                          <AlertCircle size={12} className="mr-1" />
                          Cant.
                        </Badge>
                      </div>
                    ) : (
                      <Badge variant="outline" className="bg-background border-input">
                        {item.quantity}
                      </Badge>
                    )}
                  </div>
                </div>
                
                {/* Variantes si existen */}
                {item.product.id && productVariantsMap[item.product.id]?.length > 0 && (
                  <div className="ml-6 flex flex-wrap gap-1 mt-1">
                    {hasVariantIssue ? (
                      <>
                        <div className="flex flex-col gap-1">
                          <div className="flex flex-wrap gap-1">
                            {productVariantsMap[item.product.id].map(variant => (
                              <Badge 
                                key={variant.id}
                                variant="outline" 
                                className="cursor-pointer bg-amber-50 hover:bg-amber-100 transition-colors"
                                onClick={() => handleVariantUpdate(itemIndex, variant.id)}
                              >
                                {variant.name}
                              </Badge>
                            ))}
                          </div>
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                            <AlertCircle size={12} className="mr-1" />
                            Seleccionar variante
                          </Badge>
                        </div>
                      </>
                    ) : (
                      item.variant && 
                      <Badge variant="secondary">{item.variant.name}</Badge>
                    )}
                  </div>
                )}
                
                {/* Mostrar alternativas si hay */}
                {item.alternatives && item.alternatives.length > 0 && !item.product.id && (
                  <div className="ml-6 flex flex-col gap-1 mt-1">
                    <div className="flex flex-wrap gap-1">
                      {item.alternatives.map((alt, altIndex) => (
                        <Badge 
                          key={altIndex}
                          variant="outline" 
                          className="cursor-pointer hover:bg-accent transition-colors"
                          onClick={() => {
                            const selectedProduct = products.find(p => p.id === alt.id);
                            if (selectedProduct) {
                              handleProductUpdate(itemIndex, alt.id);
                            }
                          }}
                        >
                          {alt.name}
                        </Badge>
                      ))}
                    </div>
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 w-fit">
                      <HelpCircle size={12} className="mr-1" />
                      ¿Te refieres a alguno de estos?
                    </Badge>
                  </div>
                )}
              </li>
            );
          })}
          
          {/* Botón para agregar un producto */}
          <li>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full mt-2 border-dashed"
              onClick={handleAddEmptyProduct}
            >
              <Plus size={16} className="mr-1" />
              Agregar producto
            </Button>
          </li>
        </ul>
      </CardContent>
    </Card>
  );
};


/**
 * Página Mensaje Mágico
 * v1.0.4
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
    const steps = duration / interval;
    let currentStep = 0;
    
    const timer = setInterval(() => {
      currentStep++;
      // Función sigmoide para que sea más lento al principio y al final
      const progressValue = 100 / (1 + Math.exp(-0.07 * (currentStep - steps/2)));
      setProgress(progressValue);
      
      if (currentStep >= steps) {
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
    const stopSimulation = simulateProgress();

    try {
      let results;
      try {
        results = await analyzeCustomerMessage(message);
      } catch (error) {
        console.error("Error inicial al analizar:", error);
        
        if (error instanceof GeminiError && 
            error.message && 
            error.message.includes("JSON")) {
          
          const cleanedMessage = message
            .replace(/[\u2018\u2019]/g, "'")
            .replace(/[\u201C\u201D]/g, '"')
            .replace(/\n+/g, ' ')
            .trim();
            
          results = await analyzeCustomerMessage(cleanedMessage);
        } else {
          throw error;
        }
      }
      
      setProgress(100);
      
      const newOrders = results.map(result => ({
        client: result.client,
        items: result.items || [],
        isPaid: false,
        status: 'pending' as const
      }));
      
      setOrders(prevOrders => [...prevOrders, ...newOrders]);
      
      setMessage("");
      
      const ordersWithIssues = newOrders.filter(order => 
        order.items.some(item => item.status === 'duda') || 
        order.client.matchConfidence !== 'alto'
      );
      
      setShowOrderSummary(true);
      
    } catch (error) {
      console.error("Error al analizar el mensaje:", error);
      
      if (error instanceof GeminiError) {
        let errorTitle = "Error de análisis";
        let errorMessage = "Error al analizar el mensaje";
        
        if (error.status) {
          errorMessage = `Error HTTP ${error.status}: ${error.message}`;
        } else if (error.apiResponse) {
          errorMessage = `Error en la respuesta de la API: ${error.message}`;
        } else {
          errorMessage = error.message;
        }
        
        setAlertMessage({
          title: errorTitle,
          message: errorMessage
        });
      } else {
        setAlertMessage({
          title: "Error",
          message: (error as Error).message || "Error al analizar el mensaje"
        });
      }
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
                                  <SimpleOrderCard
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
                                  <SimpleOrderCard
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
