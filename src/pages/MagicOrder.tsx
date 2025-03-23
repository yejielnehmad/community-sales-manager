
import { useState, useEffect } from 'react';
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Loader2, MessageSquareText, Wand } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { analyzeCustomerMessage, GeminiError } from "@/services/geminiService";
import { OrderCard } from "@/components/OrderCard";
import { PasteButton } from "@/components/PasteButton";
import { OrderCard as OrderCardType, MessageAnalysis, MessageItem } from "@/types";

const MagicOrder = () => {
  const [message, setMessage] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [orders, setOrders] = useState<OrderCardType[]>([]);
  const { toast } = useToast();

  // Función para analizar el mensaje utilizando la API de Google Gemini
  const handleAnalyzeMessage = async () => {
    if (!message.trim()) {
      toast({
        title: "Error",
        description: "Por favor, ingresa un mensaje para analizar",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);

    try {
      const results = await analyzeCustomerMessage(message);
      
      // Convertir los resultados a formato de OrderCard
      const newOrders = results.map(result => ({
        client: result.client,
        items: result.items || [],
        isPaid: false,
        status: 'pending' as const
      }));
      
      setOrders(prevOrders => [...prevOrders, ...newOrders]);
      
      toast({
        title: "Análisis completado",
        description: `Se identificaron ${newOrders.length} pedidos`,
      });
      
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
        
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: (error as Error).message || "Error al analizar el mensaje",
          variant: "destructive",
        });
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleUpdateOrder = (index: number, updatedOrder: OrderCardType) => {
    const updatedOrders = [...orders];
    updatedOrders[index] = updatedOrder;
    setOrders(updatedOrders);
  };

  const handlePaste = (text: string) => {
    setMessage(text);
  };

  const handleSaveOrder = async (orderIndex: number, order: OrderCardType) => {
    try {
      if (!order.client.id) {
        toast({
          title: "Error",
          description: "Cliente no identificado correctamente",
          variant: "destructive",
        });
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
        toast({
          title: "Error",
          description: "Hay productos que no fueron identificados correctamente",
          variant: "destructive",
        });
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

      toast({
        title: "Pedido guardado",
        description: `El pedido para ${order.client.name} se ha guardado correctamente`,
      });
      
      return true;
    } catch (error: any) {
      console.error("Error al guardar el pedido:", error);
      toast({
        title: "Error",
        description: error.message || "Error al guardar el pedido",
        variant: "destructive",
      });
      return false;
    }
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
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Nuevo Mensaje</CardTitle>
            <CardDescription>
              Ingresa el mensaje del cliente para analizarlo con IA
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <Textarea
                placeholder="Por ejemplo: 'Hola, soy María López y quiero 2 paquetes de pañales talla 1 y 1.5 kg de queso fresco'"
                className="min-h-32"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <div className="flex items-center justify-end gap-2">
                <PasteButton onPaste={handlePaste} />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
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
                  <MessageSquareText className="h-4 w-4" />
                  Analizar Mensaje
                </>
              )}
            </Button>
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
                <OrderCard 
                  key={index} 
                  order={order}
                  onUpdate={(updatedOrder) => handleUpdateOrder(index, updatedOrder)}
                  onSave={async (orderToSave) => handleSaveOrder(index, orderToSave)}
                  isPreliminary={true}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default MagicOrder;
