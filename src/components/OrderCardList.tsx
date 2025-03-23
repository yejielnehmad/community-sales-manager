
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
  ShoppingCart,
  Edit,
  Trash,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
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

interface OrderCardListProps {
  orders: Order[];
  onOrderUpdate?: (orderId: string, updates: Partial<Order>) => void;
}

export const OrderCardList = ({ orders, onOrderUpdate }: OrderCardListProps) => {
  const [openCards, setOpenCards] = useState<{ [key: string]: boolean }>({});
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
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

  const handleDeleteOrder = async () => {
    if (!orderToDelete) return;
    
    setIsDeleting(true);
    try {
      // Primero eliminar los items del pedido
      const { error: itemsError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', orderToDelete);
      
      if (itemsError) throw itemsError;
      
      // Luego eliminar el pedido
      const { error: orderError } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderToDelete);
        
      if (orderError) throw orderError;
      
      // Actualizar la lista de pedidos y mostrar confirmación
      toast({
        title: "Pedido eliminado",
        description: "El pedido ha sido eliminado correctamente",
      });
      
      // Cerrar el diálogo
      setOrderToDelete(null);
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al eliminar el pedido",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {orders.map(order => (
              <Card key={order.id} className="overflow-hidden transition-all duration-200 hover:shadow-md border-l-4" style={{
                borderLeftColor: order.amountPaid >= order.total ? 'var(--green-500)' : 'var(--yellow-500)'
              }}>
                <Collapsible 
                  open={openCards[order.id]} 
                  onOpenChange={() => toggleCard(order.id)}
                >
                  <CollapsibleTrigger className="w-full text-left">
                    <div className="p-3 flex justify-between items-center">
                      <div className="flex-1">
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(order.date).toLocaleDateString()}
                        </div>
                        <div className="font-medium">${order.total.toFixed(2)}</div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={order.amountPaid >= order.total * 0.99}
                          onCheckedChange={(checked) => handleTogglePaid(order.id, checked)}
                          className="data-[state=checked]:bg-green-500"
                        />
                        
                        <div className="bg-muted/60 h-7 w-7 rounded-full flex items-center justify-center">
                          {openCards[order.id] ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="px-3 py-2 bg-muted/10 border-t border-b">
                      <div className="flex flex-wrap items-center gap-2">
                        {getStatusBadge(order.status)}
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          Total: ${order.total.toFixed(2)}
                        </Badge>
                        {order.amountPaid < order.total && (
                          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 flex items-center gap-1">
                            <PiggyBank className="h-3 w-3" />
                            Saldo: ${order.balance.toFixed(2)}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <CardContent className="pt-3 pb-3">
                      <div className="space-y-3">
                        <div className="font-medium text-sm flex items-center gap-2">
                          <div className="bg-primary/10 p-1 rounded-full">
                            <ShoppingCart className="h-3 w-3 text-primary" />
                          </div>
                          Productos
                        </div>
                        
                        <div className="space-y-2">
                          {order.items.map((item, index) => {
                            // Intentar mostrar nombres legibles para productos
                            const productName = item.name || `Producto`;
                            const quantity = item.quantity || 1;
                            const variant = item.variant || '';
                            
                            return (
                              <div key={index} className="p-2 border rounded-md bg-muted/5 text-sm">
                                <div className="flex justify-between">
                                  <div>{productName}</div>
                                  <div className="font-medium">
                                    {quantity} {quantity === 1 ? 'unidad' : 'unidades'}
                                  </div>
                                </div>
                                {variant && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    Variante: {variant}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        
                        <div className="flex gap-2 mt-3 justify-end">
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="flex items-center gap-1"
                            onClick={() => setOrderToDelete(order.id)}
                          >
                            <Trash className="h-3.5 w-3.5" />
                            Eliminar
                          </Button>
                          <Button 
                            variant="default" 
                            size="sm"
                            className="flex items-center gap-1"
                          >
                            <Edit className="h-3.5 w-3.5" />
                            Editar
                          </Button>
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
      
      {/* Diálogo de confirmación para eliminar pedido */}
      <AlertDialog open={!!orderToDelete} onOpenChange={(open) => !open && setOrderToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este pedido?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El pedido será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteOrder}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
