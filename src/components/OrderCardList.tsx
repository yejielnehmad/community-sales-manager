
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Order } from "@/types";
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from "@/components/ui/collapsible";
import { Slider } from "@/components/ui/slider";
import { 
  ChevronDown, 
  ChevronUp, 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  Calendar,
  DollarSign,
  PiggyBank,
  ShoppingCart
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface OrderCardListProps {
  orders: Order[];
  onOrderUpdate?: (orderId: string, updates: Partial<Order>) => void;
}

export const OrderCardList = ({ orders, onOrderUpdate }: OrderCardListProps) => {
  const [openCards, setOpenCards] = useState<{ [key: string]: boolean }>({});
  const [sliderValues, setSliderValues] = useState<{ [key: string]: number }>({});
  const { toast } = useToast();

  const toggleCard = (orderId: string) => {
    setOpenCards(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  const handleSliderChange = async (orderId: string, value: number[]) => {
    const newValue = value[0];
    setSliderValues(prev => ({
      ...prev,
      [orderId]: newValue
    }));
    
    // Encontrar el pedido correspondiente
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    
    // Calcular el nuevo monto pagado basado en el porcentaje del slider
    const newAmountPaid = order.total * (newValue / 100);
    
    try {
      // Actualizar en la base de datos
      const { error } = await supabase
        .from('orders')
        .update({ 
          amount_paid: newAmountPaid,
          balance: order.total - newAmountPaid
        })
        .eq('id', orderId);
      
      if (error) throw error;
      
      // Si hay un callback para actualizar la UI
      if (onOrderUpdate) {
        onOrderUpdate(orderId, {
          amountPaid: newAmountPaid,
          balance: order.total - newAmountPaid
        });
      }
      
      // Mostrar toast si el pago está completo
      if (newValue === 100) {
        toast({
          title: "Pago completado",
          description: `Pedido #${orderId} marcado como pagado completamente`,
        });
      }
    } catch (error: any) {
      console.error("Error al actualizar el pago:", error);
      toast({
        title: "Error",
        description: error.message || "Error al actualizar el pago",
        variant: "destructive",
      });
    }
  };

  // Agrupar pedidos por cliente
  const ordersByClient: { [clientId: string]: { client: string, orders: Order[] } } = {};
  
  orders.forEach(order => {
    if (!ordersByClient[order.clientId]) {
      ordersByClient[order.clientId] = {
        client: order.clientName,
        orders: []
      };
    }
    ordersByClient[order.clientId].orders.push(order);
  });

  // Inicializar los valores del slider si no existen
  orders.forEach(order => {
    if (sliderValues[order.id] === undefined) {
      const paymentPercentage = order.total > 0 ? (order.amountPaid / order.total) * 100 : 0;
      setSliderValues(prev => ({
        ...prev,
        [order.id]: paymentPercentage
      }));
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Completado</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-500 flex items-center gap-1"><XCircle className="h-3 w-3" /> Cancelado</Badge>;
      default:
        return <Badge className="bg-yellow-500 flex items-center gap-1"><Clock className="h-3 w-3" /> Pendiente</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {Object.entries(ordersByClient).map(([clientId, { client, orders }]) => (
        <div key={clientId} className="space-y-3">
          <h3 className="text-lg font-medium flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            {client}
          </h3>
          <div className="space-y-3">
            {orders.map(order => (
              <Card key={order.id} className="overflow-hidden">
                <Collapsible 
                  open={openCards[order.id]} 
                  onOpenChange={() => toggleCard(order.id)}
                >
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="p-4 flex flex-row items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col">
                          <CardTitle className="text-base">
                            Pedido #{order.id.substring(0, 8)}
                          </CardTitle>
                          <div className="text-sm text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {order.date}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(order.status)}
                        {openCards[order.id] ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  
                  <div className="px-4 py-2 bg-muted/10 flex flex-wrap items-center gap-3 border-t border-b">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      Total: ${order.total.toFixed(2)}
                    </Badge>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Pagado: ${order.amountPaid.toFixed(2)}
                    </Badge>
                    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 flex items-center gap-1">
                      <PiggyBank className="h-3 w-3" />
                      Saldo: ${order.balance.toFixed(2)}
                    </Badge>
                  </div>
                  
                  <div className="px-4 py-3">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">Pago:</span>
                      <div className="grow">
                        <Slider
                          defaultValue={[sliderValues[order.id] || 0]}
                          max={100}
                          step={1}
                          onValueChange={(value) => handleSliderChange(order.id, value)}
                          className="w-full"
                        />
                      </div>
                      <span>{Math.round(sliderValues[order.id] || 0)}%</span>
                    </div>
                  </div>
                  
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="space-y-4">
                        <div className="font-medium text-sm flex items-center gap-2 mt-2">
                          <ShoppingCart className="h-4 w-4 text-primary" />
                          Productos en este pedido
                        </div>
                        
                        <div className="space-y-2">
                          {order.items.map((item, index) => (
                            <div key={index} className="p-3 border rounded-md bg-muted/5">
                              <div className="flex justify-between">
                                <div>{item.name || 'Producto'}</div>
                                <div className="font-medium">
                                  Cantidad: {item.quantity || 1}
                                </div>
                              </div>
                              {item.variant && (
                                <div className="text-sm text-muted-foreground mt-1">
                                  Variante: {item.variant}
                                </div>
                              )}
                            </div>
                          ))}
                          
                          {(!order.items || order.items.length === 0) && (
                            <div className="text-center p-4 text-muted-foreground italic">
                              No hay detalles disponibles para este pedido
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            ))}
          </div>
        </div>
      ))}
      
      {Object.keys(ordersByClient).length === 0 && (
        <div className="text-center p-8 bg-muted/20 rounded-lg">
          <p>No hay pedidos registrados</p>
        </div>
      )}
    </div>
  );
};
