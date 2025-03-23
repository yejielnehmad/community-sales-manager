
import { useState, useEffect } from 'react';
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { 
  Loader2, 
  MessageSquareText, 
  Wand, 
  Sparkles, 
  ChevronDown,
  ChevronUp,
  Clipboard
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

export const MAGIC_ORDER_VERSION = "1.0.3";

const MagicOrder = () => {
  const [message, setMessage] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [orders, setOrders] = useState<OrderCardType[]>([]);
  const [showGenerator, setShowGenerator] = useState(false);

  const simulateProgress = () => {
    setProgress(0);
    const duration = 5000; // 5 segundos para el análisis simulado
    const interval = 20; // actualizar cada 20ms
    const steps = duration / interval;
    let currentStep = 0;
    
    const timer = setInterval(() => {
      currentStep++;
      // Función sigmoide para que sea más lento al principio y al final
      const progressValue = 100 / (1 + Math.exp(-0.1 * (currentStep - steps/2)));
      setProgress(progressValue);
      
      if (currentStep >= steps) {
        clearInterval(timer);
      }
    }, interval);
    
    return () => clearInterval(timer);
  };

  // Función para analizar el mensaje utilizando la API de Google Gemini
  const handleAnalyzeMessage = async () => {
    if (!message.trim()) {
      alert("Por favor, ingresa un mensaje para analizar");
      return;
    }

    setIsAnalyzing(true);
    const stopSimulation = simulateProgress();

    try {
      const results = await analyzeCustomerMessage(message);
      
      // Asegurar que la barra de progreso llegue al 100%
      setProgress(100);
      
      // Convertir los resultados a formato de OrderCard
      const newOrders = results.map(result => ({
        client: result.client,
        items: result.items || [],
        isPaid: false,
        status: 'pending' as const
      }));
      
      setOrders(prevOrders => [...prevOrders, ...newOrders]);
      
      // Limpiar el mensaje después de procesarlo
      setMessage("");
    } catch (error) {
      console.error("Error al analizar el mensaje:", error);
      
      if (error instanceof GeminiError) {
        // Personalizamos el mensaje de error basado en el tipo de error
        let errorMessage = "Error al analizar el mensaje";
        
        if (error.status) {
          errorMessage = `Error HTTP ${error.status}: ${error.message}`;
        } else if (error.apiResponse) {
          errorMessage = `Error en la respuesta de la API: ${error.message}`;
        } else {
          errorMessage = error.message;
        }
        
        alert(errorMessage);
      } else {
        alert((error as Error).message || "Error al analizar el mensaje");
      }
    } finally {
      setTimeout(() => {
        setIsAnalyzing(false);
        setProgress(0);
      }, 500); // Pequeño retraso para asegurar que la barra llegue al 100%
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
      alert("El texto ha sido copiado del portapapeles");
    } catch (err) {
      alert("No se pudo acceder al portapapeles");
    }
  };

  const handleSelectExample = (example: string) => {
    setMessage(example);
    setShowGenerator(false);
  };

  const handleSaveOrder = async (orderIndex: number, order: OrderCardType) => {
    try {
      if (!order.client.id) {
        alert("Cliente no identificado correctamente");
        return false;
      }

      // Buscar el cliente por id
      const clientId = order.client.id;
      
      // Calcular total y verificar que todos los items tengan ID
      let hasInvalidItems = false;
      let total = 0;
      
      for (const item of order.items) {
        if (!item.product.id) {
          hasInvalidItems = true;
          break;
        }
        
        // Usamos un precio estimado de 100 como fallback
        const estimatedPrice = 100;
        total += item.quantity * estimatedPrice;
      }
      
      if (hasInvalidItems) {
        alert("Hay productos que no fueron identificados correctamente");
        return false;
      }

      // Crear el pedido en la base de datos
      const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert([
          {
            client_id: clientId,
            date: new Date().toISOString().split('T')[0],
            status: 'pending',
            total: total,
            amount_paid: order.isPaid ? total : 0,
            balance: order.isPaid ? 0 : total
          }
        ])
        .select('id')
        .single();

      if (orderError) {
        throw orderError;
      }

      // Crear los items del pedido
      const orderItems = order.items.map(item => ({
        order_id: newOrder.id,
        product_id: item.product.id!,
        variant_id: item.variant?.id || null,
        quantity: item.quantity,
        price: 100, // Precio estimado para simplificar
        total: item.quantity * 100 // Total estimado
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        throw itemsError;
      }

      // Actualizar el estado del pedido en la interfaz
      const updatedOrders = [...orders];
      updatedOrders[orderIndex] = {
        ...order,
        id: newOrder.id,
        status: 'saved'
      };
      setOrders(updatedOrders);

      alert(`El pedido para ${order.client.name} se ha guardado correctamente`);
      
      return true;
    } catch (error: any) {
      console.error("Error al guardar el pedido:", error);
      alert(error.message || "Error al guardar el pedido");
      return false;
    }
  };

  const handleDeleteOrder = (index: number) => {
    if (window.confirm('¿Estás seguro de eliminar este pedido preliminar?')) {
      const updatedOrders = [...orders];
      updatedOrders.splice(index, 1);
      setOrders(updatedOrders);
    }
  };

  const AnimatedCounter = ({ value, duration = 1000 }: { value: number, duration?: number }) => {
    const [count, setCount] = useState(0);
    
    useEffect(() => {
      let startTime: number;
      let animationFrame: number;
      
      const updateCount = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        setCount(Math.floor(progress * value));
        
        if (progress < 1) {
          animationFrame = requestAnimationFrame(updateCount);
        } else {
          setCount(value);
        }
      };
      
      animationFrame = requestAnimationFrame(updateCount);
      
      return () => {
        cancelAnimationFrame(animationFrame);
      };
    }, [value, duration]);
    
    return <span>{count}</span>;
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
          <div className="text-xs text-muted-foreground">v{MAGIC_ORDER_VERSION}</div>
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

        <Card>
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
            <div className="w-full flex justify-end">
              <Button 
                onClick={handleAnalyzeMessage}
                disabled={isAnalyzing || !message.trim()}
                className="relative overflow-hidden"
              >
                <div className="flex items-center gap-2 z-10 relative">
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
                {isAnalyzing && (
                  <div 
                    className="absolute left-0 top-0 h-full bg-primary/50 z-0 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                )}
              </Button>
            </div>
          </CardFooter>
        </Card>

        {orders.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <MessageSquareText className="h-5 w-5 text-primary" />
                Pedidos Preliminares Identificados
              </h2>
              <Button 
                variant="outline" 
                onClick={() => setOrders([])}
                disabled={orders.some(o => o.status === 'saved')}
              >
                Limpiar Todos
              </Button>
            </div>
            <Separator />
            
            <div className="space-y-2">
              {orders.map((order, index) => (
                <div key={index} className="relative">
                  <OrderCard 
                    order={order}
                    onUpdate={(updatedOrder) => handleUpdateOrder(index, updatedOrder)}
                    onSave={async (orderToSave) => handleSaveOrder(index, orderToSave)}
                    isPreliminary={true}
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => handleDeleteOrder(index)}
                    disabled={order.status === 'saved'}
                  >
                    Eliminar
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default MagicOrder;
