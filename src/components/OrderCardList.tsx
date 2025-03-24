
import { useState } from "react";
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
  Edit,
  Trash,
  Loader2,
  Check,
  X,
  DollarSign,
  ShoppingCart
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface OrderCardListProps {
  orders: Order[];
  onOrderUpdate?: (orderId: string, updates: Partial<Order>) => void;
}

export const OrderCardList = ({ orders, onOrderUpdate }: OrderCardListProps) => {
  const [openClients, setOpenClients] = useState<{ [key: string]: boolean }>({});
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [productPaidStatus, setProductPaidStatus] = useState<{ [key: string]: boolean }>({});
  const { toast } = useToast();

  const toggleClient = (clientId: string) => {
    setOpenClients(prev => ({
      ...prev,
      [clientId]: !prev[clientId]
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

  const handleToggleProductPaid = (productKey: string, orderId: string, isPaid: boolean) => {
    setProductPaidStatus(prev => ({
      ...prev,
      [productKey]: isPaid
    }));
    
    // Aquí se podría implementar la lógica para actualizar el pago parcial
    toast({
      title: isPaid ? "Producto pagado" : "Producto marcado como no pagado",
      description: "Se ha actualizado el estado de pago del producto"
    });
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

  const getTotalClientBalance = (clientOrders: Order[]) => {
    const total = clientOrders.reduce((sum, order) => sum + order.total, 0);
    const paid = clientOrders.reduce((sum, order) => sum + order.amountPaid, 0);
    return { total, paid, balance: total - paid };
  };

  const isClientFullyPaid = (clientOrders: Order[]) => {
    const { total, paid } = getTotalClientBalance(clientOrders);
    return paid >= total * 0.99; // consideramos pagado si es 99% o más (por redondeos)
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground mb-2">
        {Object.keys(ordersByClient).length} {Object.keys(ordersByClient).length === 1 ? 'cliente' : 'clientes'} con pedidos
      </div>
      
      <div className="space-y-3">
        {Object.entries(ordersByClient).map(([clientId, { client, orders: clientOrders }]) => {
          const { total, balance } = getTotalClientBalance(clientOrders);
          const isPaid = isClientFullyPaid(clientOrders);
          
          return (
            <div 
              key={clientId} 
              className="border overflow-hidden transition-all duration-200 rounded-xl"
            >
              <Collapsible 
                open={openClients[clientId]} 
                onOpenChange={() => toggleClient(clientId)}
              >
                <CollapsibleTrigger className="w-full text-left">
                  <div className="p-4 flex justify-between items-center bg-card hover:bg-muted/10">
                    <div className="flex items-center gap-2">
                      <div className="font-medium text-lg">
                        {client}
                        {isPaid && (
                          <Check className="inline-flex ml-1.5 h-4 w-4 text-green-500 bg-green-100 rounded-full p-0.5" />
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="text-right flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <div className="font-medium">
                          <span className={`${balance > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                            ${balance > 0 ? balance.toFixed(2) : '0.00'}
                          </span>
                          <span className="text-xs text-muted-foreground ml-1">
                            /${total.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <div className="h-7 w-7 rounded-full flex items-center justify-center bg-muted/20">
                        {openClients[clientId] ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </div>
                  </div>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <div className="bg-card/25 p-4">
                    {/* Sección de productos condensada */}
                    <div className="font-medium text-sm flex items-center gap-2 mb-3">
                      <ShoppingCart className="h-3.5 w-3.5 text-primary" />
                      Productos
                    </div>
                    
                    <div className="space-y-2 bg-background rounded-lg p-3">
                      {/* Combinamos todos los productos de todos los pedidos */}
                      {(() => {
                        // Agrupar productos por nombre y variante
                        const productGroups: {[key: string]: {
                          name: string, 
                          variant?: string, 
                          quantity: number,
                          orderId: string
                        }} = {};
                        
                        clientOrders.forEach(order => {
                          order.items.forEach(item => {
                            const key = `${item.name || 'Producto'}_${item.variant || ''}`;
                            if (!productGroups[key]) {
                              productGroups[key] = {
                                name: item.name || 'Producto',
                                variant: item.variant,
                                quantity: 0,
                                orderId: order.id
                              };
                            }
                            productGroups[key].quantity += (item.quantity || 1);
                          });
                        });
                        
                        return Object.entries(productGroups).map(([key, product], index) => {
                          const isPaid = productPaidStatus[key] || false;
                          
                          return (
                            <div key={key} className="flex justify-between items-center py-1.5">
                              <div className="flex-1">
                                <div className="font-medium text-sm">{product.name}</div>
                                {product.variant && (
                                  <div className="text-xs text-muted-foreground">
                                    {product.variant}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-xs font-medium">
                                  {product.quantity} {product.quantity === 1 ? 'unidad' : 'unidades'}
                                </div>
                                <Switch
                                  checked={isPaid}
                                  onCheckedChange={(checked) => 
                                    handleToggleProductPaid(key, product.orderId, checked)
                                  }
                                  className="data-[state=checked]:bg-green-500 h-4 w-7"
                                />
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                    
                    <div className="mt-4 flex justify-between items-center">
                      <div className="flex gap-2">
                        {clientOrders.map(order => (
                          <div key={order.id} className="flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setOrderToDelete(order.id)}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="text-sm text-muted-foreground">
                          Total:
                          <span className="ml-1 font-medium text-foreground">
                            ${total.toFixed(2)}
                          </span>
                        </div>
                        
                        <Switch
                          checked={isPaid}
                          onCheckedChange={(checked) => {
                            // Marcar todos los pedidos como pagados/no pagados
                            clientOrders.forEach(order => {
                              handleTogglePaid(order.id, checked);
                            });
                          }}
                          className="data-[state=checked]:bg-green-500"
                        />
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          );
        })}
      </div>
      
      {Object.keys(ordersByClient).length === 0 && (
        <div className="text-center p-8 bg-muted/20 rounded-lg">
          <p>No hay pedidos que coincidan con la búsqueda</p>
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
