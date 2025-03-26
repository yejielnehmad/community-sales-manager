import { useState, useEffect } from 'react';
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
  Settings,
  Tag,
  MapPin,
  Check,
  InfoIcon,
  AlertCircle
} from 'lucide-react';
import { supabase } from "@/lib/supabase";
import { analyzeCustomerMessage, GeminiError } from "@/services/geminiService";
import { OrderCard } from "@/components/OrderCard";
import { MessageExampleGenerator } from "@/components/MessageExampleGenerator";
import { OrderCard as OrderCardType, MessageAnalysis, MessageItem } from "@/types";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { FormField, FormItem, FormLabel, FormControl, FormDescription, Form } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

// Esquema para la configuración de IA
const aiConfigSchema = z.object({
  checkPickupLocation: z.boolean().default(false),
  preferredVariants: z.boolean().default(false),
  additionalInstructions: z.string().optional(),
});

type AIConfigFormValues = z.infer<typeof aiConfigSchema>;

const MagicOrder = () => {
  const [message, setMessage] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [orders, setOrders] = useState<OrderCardType[]>([]);
  const [showGenerator, setShowGenerator] = useState(false);
  const [showAIConfig, setShowAIConfig] = useState(false);
  const [showOrderSummary, setShowOrderSummary] = useState(true);
  const [alertMessage, setAlertMessage] = useState<{ title: string; message: string } | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<{index: number, name: string} | null>(null);
  const { toast } = useToast();

  // Obtener la configuración guardada en localStorage o usar valores predeterminados
  const getStoredConfig = () => {
    const storedConfig = localStorage.getItem('magicOrderAIConfig');
    if (storedConfig) {
      try {
        return JSON.parse(storedConfig);
      } catch (e) {
        console.error('Error parsing stored AI config:', e);
      }
    }
    return {
      checkPickupLocation: false,
      preferredVariants: false,
      additionalInstructions: "",
    };
  };

  // Formulario de configuración de IA
  const aiConfigForm = useForm<AIConfigFormValues>({
    resolver: zodResolver(aiConfigSchema),
    defaultValues: getStoredConfig(),
  });

  useEffect(() => {
    // Cargar configuración guardada al iniciar
    const storedConfig = getStoredConfig();
    aiConfigForm.reset(storedConfig);
  }, []);

  const saveAIConfig = (values: AIConfigFormValues) => {
    localStorage.setItem('magicOrderAIConfig', JSON.stringify(values));
    setShowAIConfig(false);
    toast({
      title: "Configuración guardada",
      description: "Las preferencias de IA se han guardado correctamente."
    });
    
    console.log('Configuración de IA guardada:', values);
  };

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
      // Obtener configuración actual
      const aiConfig = aiConfigForm.getValues();
      console.log('Analizando mensaje con configuración:', aiConfig);
      
      let results;
      try {
        results = await analyzeCustomerMessage(message, aiConfig);
      } catch (error) {
        console.error("Error inicial al analizar:", error);
        
        if (error instanceof GeminiError && 
            error.message && 
            error.message.includes("JSON")) {
          
          toast({
            title: "Reintentando análisis",
            description: "El primer intento falló, estamos reintentando con formato optimizado..."
          });
          
          const cleanedMessage = message
            .replace(/[\u2018\u2019]/g, "'")
            .replace(/[\u201C\u201D]/g, '"')
            .replace(/\n+/g, ' ')
            .trim();
            
          results = await analyzeCustomerMessage(cleanedMessage, aiConfig);
        } else {
          throw error;
        }
      }
      
      setProgress(100);
      
      const newOrders = results.map(result => ({
        client: result.client,
        items: result.items || [],
        isPaid: false,
        status: 'pending' as const,
        pickupLocation: result.pickupLocation
      }));
      
      setOrders(prevOrders => [...prevOrders, ...newOrders]);
      
      setMessage("");
      
      const ordersWithIssues = newOrders.filter(order => 
        order.items.some(item => item.status === 'duda') || 
        order.client.matchConfidence !== 'alto'
      );
      
      toast({
        title: "Análisis completado",
        description: `Se ${newOrders.length === 1 ? 'ha' : 'han'} detectado ${newOrders.length} ${newOrders.length === 1 ? 'pedido' : 'pedidos'}, ${ordersWithIssues.length} requiere${ordersWithIssues.length === 1 ? '' : 'n'} atención`
      });
      
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
    console.log('Pedido actualizado en índice', index, updatedOrder);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setMessage(text);
      toast({
        title: "Texto copiado",
        description: "El texto ha sido copiado del portapapeles"
      });
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
        setAlertMessage({
          title: "Error",
          message: "Cliente no identificado correctamente"
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
        
        const itemPrice = item.variant?.price || item.product.price || 0;
        total += item.quantity * itemPrice;
      }
      
      if (hasInvalidItems) {
        setAlertMessage({
          title: "Error",
          message: "Hay productos que no fueron identificados correctamente"
        });
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

      toast({
        title: "Pedido guardado",
        description: `El pedido para ${order.client.name} se ha guardado correctamente`,
        variant: "success"
      });
      
      console.log('Pedido guardado exitosamente:', newOrder.id);
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

  const handleConfirmDeleteOrder = () => {
    if (orderToDelete !== null) {
      const updatedOrders = [...orders];
      updatedOrders.splice(orderToDelete.index, 1);
      setOrders(updatedOrders);
      setOrderToDelete(null);
      
      console.log('Pedido eliminado del índice:', orderToDelete.index);
    }
  };

  const handleDeleteOrder = (index: number) => {
    const order = orders[index];
    setOrderToDelete({
      index, 
      name: order.client.name
    });
  };

  // Filtrar pedidos que requieren atención para mostrarlos primero
  const sortedOrders = [...orders].sort((a, b) => {
    const aRequiresAttention = a.items.some(item => item.status === 'duda') || a.client.matchConfidence !== 'alto';
    const bRequiresAttention = b.items.some(item => item.status === 'duda') || b.client.matchConfidence !== 'alto';
    
    if (aRequiresAttention && !bRequiresAttention) return -1;
    if (!aRequiresAttention && bRequiresAttention) return 1;
    return 0;
  });

  // Contar pedidos que requieren atención
  const ordersRequiringAttention = orders.filter(order => 
    order.items.some(item => item.status === 'duda') || 
    order.client.matchConfidence !== 'alto'
  ).length;

  // Contar pedidos confirmados (sin problemas)
  const ordersConfirmed = orders.filter(order => 
    !order.items.some(item => item.status === 'duda') && 
    order.client.matchConfidence === 'alto'
  ).length;

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
          
          <div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowAIConfig(!showAIConfig)}
              className="flex items-center gap-1"
            >
              <Settings size={16} />
              Configuración IA
            </Button>
          </div>
        </div>

        <Collapsible
          open={showAIConfig}
          onOpenChange={setShowAIConfig}
        >
          <CollapsibleContent>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">Configuración de la IA</CardTitle>
                <CardDescription>
                  Personaliza cómo la IA analiza los mensajes de los clientes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...aiConfigForm}>
                  <form onSubmit={aiConfigForm.handleSubmit(saveAIConfig)} className="space-y-4">
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="checkPickupLocation">
                            <div className="flex items-center gap-2">
                              <MapPin size={16} className="text-amber-600" />
                              Detectar ubicación de retiro
                            </div>
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            Identifica si el pedido es para retirar en Once o Palermo
                          </p>
                        </div>
                        <Switch
                          id="checkPickupLocation"
                          checked={aiConfigForm.watch("checkPickupLocation")}
                          onCheckedChange={(checked) => 
                            aiConfigForm.setValue("checkPickupLocation", checked)
                          }
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="preferredVariants">
                            <div className="flex items-center gap-2">
                              <Tag size={16} className="text-primary" />
                              Sugerir variantes preferidas
                            </div>
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            Prioriza variantes más populares o con más stock
                          </p>
                        </div>
                        <Switch
                          id="preferredVariants"
                          checked={aiConfigForm.watch("preferredVariants")}
                          onCheckedChange={(checked) => 
                            aiConfigForm.setValue("preferredVariants", checked)
                          }
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="additionalInstructions">
                          Instrucciones adicionales para la IA
                        </Label>
                        <Textarea
                          id="additionalInstructions"
                          placeholder="Ej: Incluir notas sobre detalles de entrega, preferencias específicas..."
                          {...aiConfigForm.register("additionalInstructions")}
                          className="min-h-20"
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-end gap-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setShowAIConfig(false)}
                      >
                        Cancelar
                      </Button>
                      <Button type="submit">
                        Guardar configuración
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>

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
            <div className="relative">
              <Textarea
                placeholder="Por ejemplo: 'Hola, soy María López y quiero 2 paquetes de pañales talla 1 y 1.5 kg de queso fresco'"
                className="min-h-32 pr-12"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2 h-8 w-8 rounded-full opacity-70 hover:opacity-100 transition-opacity"
                onClick={handlePaste}
                type="button"
                title="Pegar del portapapeles"
              >
                <Clipboard className="h-4 w-4" />
              </Button>
            </div>
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
            <div className="w-full flex justify-end">
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
                  Pedidos Detectados
                </h2>
                
                <div className="flex gap-3 mt-1">
                  {ordersRequiringAttention > 0 && (
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                      <AlertCircle size={12} className="mr-1" />
                      {ordersRequiringAttention} requiere{ordersRequiringAttention !== 1 ? 'n' : ''} atención
                    </Badge>
                  )}
                  
                  {ordersConfirmed > 0 && (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      <Check size={12} className="mr-1" />
                      {ordersConfirmed} confirmado{ordersConfirmed !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="flex gap-2">
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
                
                <Button 
                  variant="outline" 
                  onClick={() => setOrders([])}
                  disabled={orders.some(o => o.status === 'saved')}
                >
                  Limpiar Todos
                </Button>
              </div>
            </div>
            
            <Separator />
            
            <Collapsible open={showOrderSummary} onOpenChange={setShowOrderSummary}>
              <CollapsibleContent>
                {/* Resumen de pedidos sin problemas */}
                {ordersConfirmed > 0 && (
                  <div className="mb-6">
                    <h3 className="text-md font-semibold mb-2 flex items-center gap-2">
                      <Check size={16} className="text-green-600" />
                      Pedidos Confirmados ({ordersConfirmed})
                    </h3>
                    <div className="space-y-2">
                      {sortedOrders.filter(order => 
                        !order.items.some(item => item.status === 'duda') && 
                        order.client.matchConfidence === 'alto'
                      ).map((order, index) => {
                        // Encontrar el índice original en el array orders
                        const originalIndex = orders.findIndex(o => 
                          o.client.id === order.client.id && 
                          JSON.stringify(o.items) === JSON.stringify(order.items)
                        );
                        
                        return (
                          <div key={index} className="relative">
                            <OrderCard 
                              order={order}
                              onUpdate={(updatedOrder) => handleUpdateOrder(originalIndex, updatedOrder)}
                              onSave={async (orderToSave) => handleSaveOrder(originalIndex, orderToSave)}
                              isPreliminary={true}
                            />
                            
                            {order.status !== 'saved' && (
                              <Button
                                variant="destructive"
                                size="sm"
                                className="absolute top-2 right-2"
                                onClick={() => handleDeleteOrder(originalIndex)}
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Eliminar
                              </Button>
                            )}
                            
                            {order.pickupLocation && (
                              <Badge 
                                className="absolute top-2 right-20 bg-primary/20 text-primary-foreground hover:bg-primary/30 border-0"
                              >
                                <MapPin size={12} className="mr-1" />
                                Retiro: {order.pickupLocation}
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {/* Pedidos con problemas */}
                {ordersRequiringAttention > 0 && (
                  <div>
                    <h3 className="text-md font-semibold mb-2 flex items-center gap-2">
                      <AlertCircle size={16} className="text-amber-600" />
                      Pedidos que Requieren Atención ({ordersRequiringAttention})
                    </h3>
                    <div className="space-y-2">
                      {sortedOrders.filter(order => 
                        order.items.some(item => item.status === 'duda') || 
                        order.client.matchConfidence !== 'alto'
                      ).map((order, index) => {
                        // Encontrar el índice original en el array orders
                        const originalIndex = orders.findIndex(o => 
                          o.client.id === order.client.id && 
                          JSON.stringify(o.items) === JSON.stringify(order.items)
                        );
                        
                        return (
                          <div key={index} className="relative">
                            <OrderCard 
                              order={order}
                              onUpdate={(updatedOrder) => handleUpdateOrder(originalIndex, updatedOrder)}
                              onSave={async (orderToSave) => handleSaveOrder(originalIndex, orderToSave)}
                              isPreliminary={true}
                            />
                            
                            {order.status !== 'saved' && (
                              <Button
                                variant="destructive"
                                size="sm"
                                className="absolute top-2 right-2"
                                onClick={() => handleDeleteOrder(originalIndex)}
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Eliminar
                              </Button>
                            )}
                            
                            {order.pickupLocation && (
                              <Badge 
                                className="absolute top-2 right-20 bg-primary/20 text-primary-foreground hover:bg-primary/30 border-0"
                              >
                                <MapPin size={12} className="mr-1" />
                                Retiro: {order.pickupLocation}
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
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
