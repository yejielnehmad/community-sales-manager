
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Order } from "@/types";
import { Switch } from "@/components/ui/switch";
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from "@/components/ui/collapsible";
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
  const { toast } = useToast();

  const toggleCard = (orderId: string) => {
    setOpenCards(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  const handleTogglePaid = async (orderId: string, isPaid: boolean) => {
    // Encontrar el pedido correspondiente
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    
    try {
      // Actualizar en la base de datos
      const { error } = await supabase
        .from('orders')
        .update({ 
          amount_paid: isPaid ? order.total : 0,
          balance: isPaid ? 0 : order.total
        })
        .eq('id', orderId);
      
      if (error) throw error;
      
      // Si hay un callback para actualizar la UI
      if (onOrderUpdate) {
        onOrderUpdate(orderId, {
          amountPaid: isPaid ? order.total : 0,
          balance: isPaid ? 0 : order.total
        });
      }
      
      // Mostrar toast si el pago está completo
      if (isPaid) {
        toast({
          title: "Pago completado",
          description: `Pedido marcado como pagado completamente`,
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
            <div className="bg-primary/10 p-2 rounded-full">
              <User className="h-4 w-4 text-primary" />
            </div>
            {client}
          </h3>
          <div className="space-y-3">
            {orders.map(order => (
              <Card key={order.id} className="overflow-hidden transition-all duration-200 hover:shadow-md">
                <Collapsible 
                  open={openCards[order.id]} 
                  onOpenChange={() => toggleCard(order.id)}
                >
                  <CollapsibleTrigger className="w-full text-left">
                    <CardHeader className="p-4 flex flex-row items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col">
                          <div className="text-sm text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {order.date}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(order.status)}
                        <div className="bg-muted/60 h-7 w-7 rounded-full flex items-center justify-center transition-transform duration-200 transform hover:scale-110">
                          {openCards[order.id] ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
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
                      <Switch
                        checked={order.amountPaid >= order.total * 0.99}
                        onCheckedChange={(checked) => handleTogglePaid(order.id, checked)}
                      />
                      <span className="text-sm text-muted-foreground">
                        {order.amountPaid >= order.total * 0.99 ? "Pagado completamente" : "Pendiente de pago"}
                      </span>
                    </div>
                  </div>
                  
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="space-y-4">
                        <div className="font-medium text-sm flex items-center gap-2 mt-2">
                          <div className="bg-primary/10 p-1 rounded-full">
                            <ShoppingCart className="h-3 w-3 text-primary" />
                          </div>
                          Productos en este pedido
                        </div>
                        
                        <div className="space-y-2">
                          {order.items.map((item, index) => (
                            <div key={index} className="p-3 border rounded-md bg-muted/5 hover:bg-muted/20 transition-colors duration-200">
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
