
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
  XCircle, 
  Clock, 
  ShoppingCart,
  Edit,
  Trash,
  Loader2,
  Search,
  Check,
  X,
  DollarSign
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
import { Input } from "@/components/ui/input";
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
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);
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

  const getTotalClientBalance = (clientOrders: Order[]) => {
    const total = clientOrders.reduce((sum, order) => sum + order.total, 0);
    const paid = clientOrders.reduce((sum, order) => sum + order.amountPaid, 0);
    return { total, paid, balance: total - paid };
  };

  const isClientFullyPaid = (clientOrders: Order[]) => {
    const { total, paid } = getTotalClientBalance(clientOrders);
    return paid >= total * 0.99; // consideramos pagado si es 99% o más (por redondeos)
  };

  // Filtrado de clientes por término de búsqueda
  const filteredClients = Object.entries(ordersByClient).filter(([_, { client }]) => 
    client.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-2">
        <div className="text-sm text-muted-foreground">
          {filteredClients.length} {filteredClients.length === 1 ? 'cliente' : 'clientes'} con pedidos
        </div>
        <Button 
          variant="outline" 
          size="sm"
          className="flex items-center gap-1"
          onClick={() => setShowSearch(!showSearch)}
        >
          <Search className="h-4 w-4" />
          {showSearch ? "Ocultar búsqueda" : "Buscar cliente"}
        </Button>
      </div>
      
      {showSearch && (
        <div className="mb-4 relative">
          <Input
            placeholder="Buscar cliente por nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8"
              onClick={() => setSearchTerm("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
      
      <div className="space-y-3">
        {filteredClients.map(([clientId, { client, orders: clientOrders }]) => {
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
                    <div className="flex items-center gap-3">
                      <div className="font-medium text-lg flex items-center gap-1.5">
                        {client}
                        {isPaid && (
                          <Check className="h-4 w-4 text-green-500 bg-green-100 rounded-full p-0.5" />
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <div className="font-bold text-lg">
                          ${total.toFixed(2)}
                        </div>
                      </div>
                      <div className="h-8 w-8 rounded-full flex items-center justify-center bg-muted/20">
                        {openClients[clientId] ? (
                          <ChevronUp className="h-5 w-5" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                      </div>
                    </div>
                  </div>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <div className="bg-card/25 divide-y">
                    {clientOrders.map((order, orderIndex) => (
                      <div key={order.id} className="p-4">
                        <div className="flex justify-between items-center mb-3">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-background">
                              {new Date(order.date).toLocaleDateString()}
                            </Badge>
                            {getStatusBadge(order.status)}
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-sm font-medium">
                              ${order.total.toFixed(2)}
                            </div>
                            <Switch
                              checked={order.amountPaid >= order.total * 0.99}
                              onCheckedChange={(checked) => handleTogglePaid(order.id, checked)}
                              className="data-[state=checked]:bg-green-500"
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-3 mt-4">
                          <div className="font-medium text-sm flex items-center gap-2 mb-2">
                            <ShoppingCart className="h-3.5 w-3.5 text-primary" />
                            Productos
                          </div>
                          
                          <div className="space-y-2 bg-background rounded-lg p-3">
                            {order.items.map((item, index) => {
                              const productName = item.name || `Producto`;
                              const quantity = item.quantity || 1;
                              const variant = item.variant || '';
                              
                              return (
                                <div key={index} className="flex justify-between items-center">
                                  <div>
                                    <div className="font-medium">{productName}</div>
                                    {variant && (
                                      <div className="text-xs text-muted-foreground">
                                        Variante: {variant}
                                      </div>
                                    )}
                                  </div>
                                  <div className="text-sm font-medium">
                                    {quantity} {quantity === 1 ? 'unidad' : 'unidades'}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          
                          <div className="flex gap-2 mt-4 justify-end">
                            <Button 
                              variant="destructive" 
                              size="icon"
                              className="h-9 w-9"
                              onClick={() => setOrderToDelete(order.id)}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="default" 
                              className="flex items-center gap-1"
                            >
                              <Edit className="h-4 w-4" />
                              Editar
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          );
        })}
      </div>
      
      {filteredClients.length === 0 && (
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
