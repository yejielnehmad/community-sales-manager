
import { useState, useEffect } from "react";
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
  Edit,
  Trash,
  Loader2,
  DollarSign,
  ShoppingCart,
  Minus,
  Plus
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

interface OrderCardListProps {
  orders: Order[];
  onOrderUpdate?: (orderId: string, updates: Partial<Order>) => void;
}

export const OrderCardList = ({ orders, onOrderUpdate }: OrderCardListProps) => {
  const [openClientId, setOpenClientId] = useState<string | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [productPaidStatus, setProductPaidStatus] = useState<{ [key: string]: boolean }>({});
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [productQuantities, setProductQuantities] = useState<{ [key: string]: number }>({});
  const [swipeStates, setSwipeStates] = useState<{ [key: string]: number }>({});
  const { toast } = useToast();

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

  const toggleClient = (clientId: string) => {
    setOpenClientId(openClientId === clientId ? null : clientId);
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

  const handleToggleAllProducts = (clientId: string, isPaid: boolean) => {
    const clientProducts: { [key: string]: boolean } = {};
    const clientOrders = ordersByClient[clientId]?.orders || [];
    
    clientOrders.forEach(order => {
      order.items.forEach(item => {
        const key = `${item.name || 'Producto'}_${item.variant || ''}_${order.id}`;
        clientProducts[key] = isPaid;
      });
    });
    
    setProductPaidStatus(prev => ({
      ...prev,
      ...clientProducts
    }));
    
    // Actualizar los pedidos si están todos pagados
    if (isPaid) {
      clientOrders.forEach(order => {
        handleTogglePaid(order.id, true);
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

  const handleProductSwipe = (productKey: string, value: number) => {
    setSwipeStates(prev => ({
      ...prev,
      [productKey]: Math.max(-100, Math.min(0, value))
    }));
  };

  const handleEditProduct = (productKey: string, currentQuantity: number) => {
    setEditingProduct(productKey);
    setProductQuantities({
      ...productQuantities,
      [productKey]: currentQuantity
    });
  };

  const handleQuantityChange = (productKey: string, newQuantity: number) => {
    setProductQuantities({
      ...productQuantities,
      [productKey]: Math.max(1, newQuantity)
    });
  };

  const saveProductChanges = (productKey: string, orderId: string) => {
    // Aquí implementarías la lógica para guardar los cambios en la base de datos
    toast({
      title: "Producto actualizado",
      description: `Cantidad actualizada a ${productQuantities[productKey]}`
    });
    setEditingProduct(null);
    // Resetear el estado de deslizamiento
    setSwipeStates(prev => ({
      ...prev,
      [productKey]: 0
    }));
  };

  const deleteProduct = async (productKey: string, orderId: string, itemId: string) => {
    try {
      // Eliminar el item del pedido
      const { error } = await supabase
        .from('order_items')
        .delete()
        .eq('id', itemId);
        
      if (error) throw error;
      
      toast({
        title: "Producto eliminado",
        description: "El producto ha sido eliminado del pedido"
      });
      
      // Aquí deberías actualizar la UI para reflejar el cambio
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al eliminar el producto",
        variant: "destructive",
      });
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

  // Efecto para detectar eventos táctiles y de ratón
  useEffect(() => {
    let dragStartX: number;
    let currentProductKey: string | null = null;
    
    const handleTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      const productItem = target.closest('[data-product-key]');
      if (productItem) {
        dragStartX = e.touches[0].clientX;
        currentProductKey = productItem.getAttribute('data-product-key');
      }
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      if (currentProductKey) {
        const deltaX = e.touches[0].clientX - dragStartX;
        handleProductSwipe(currentProductKey, deltaX);
      }
    };
    
    const handleTouchEnd = () => {
      if (currentProductKey) {
        const currentSwipe = swipeStates[currentProductKey] || 0;
        
        // Si se deslizó lo suficiente, mantenerlo abierto, de lo contrario cerrar
        if (currentSwipe < -50) {
          setSwipeStates(prev => ({
            ...prev,
            [currentProductKey!]: -100
          }));
        } else {
          setSwipeStates(prev => ({
            ...prev,
            [currentProductKey!]: 0
          }));
        }
        
        currentProductKey = null;
      }
    };
    
    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);
    
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [swipeStates]);

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
                open={openClientId === clientId} 
                onOpenChange={() => toggleClient(clientId)}
              >
                <CollapsibleTrigger className="w-full text-left">
                  <div className="p-4 flex justify-between items-center bg-card hover:bg-muted/10">
                    <div className="flex items-center gap-2">
                      <div className="font-medium text-lg">
                        {client}
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
                        {openClientId === clientId ? (
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
                    {/* Sección de productos con switch general */}
                    <div className="flex justify-between items-center mb-3">
                      <div className="font-medium text-sm flex items-center gap-2">
                        <ShoppingCart className="h-3.5 w-3.5 text-primary" />
                        Productos
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Marcar todo como pagado</span>
                        <Switch
                          checked={isPaid}
                          onCheckedChange={(checked) => handleToggleAllProducts(clientId, checked)}
                          className="data-[state=checked]:bg-green-500 h-4 w-7"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-1 bg-background rounded-lg p-2">
                      {/* Combinamos todos los productos de todos los pedidos */}
                      {(() => {
                        // Agrupar productos por nombre y variante
                        const productGroups: {[key: string]: {
                          id?: string,
                          name: string, 
                          variant?: string, 
                          quantity: number,
                          price: number,
                          total: number,
                          orderId: string
                        }} = {};
                        
                        clientOrders.forEach(order => {
                          order.items.forEach(item => {
                            const key = `${item.name || 'Producto'}_${item.variant || ''}_${order.id}`;
                            if (!productGroups[key]) {
                              productGroups[key] = {
                                id: item.id,
                                name: item.name || 'Producto',
                                variant: item.variant,
                                quantity: 0,
                                price: item.price || 0,
                                total: 0,
                                orderId: order.id
                              };
                            }
                            productGroups[key].quantity += (item.quantity || 1);
                            productGroups[key].total = productGroups[key].price * productGroups[key].quantity;
                          });
                        });
                        
                        return Object.entries(productGroups).map(([key, product], index) => {
                          const isPaid = productPaidStatus[key] || false;
                          const isEditing = editingProduct === key;
                          const swipeX = swipeStates[key] || 0;
                          
                          return (
                            <div 
                              key={key} 
                              data-product-key={key}
                              className="relative overflow-hidden rounded-md"
                            >
                              {/* Acciones de edición en el fondo */}
                              <div className="absolute inset-y-0 right-0 flex items-center bg-primary text-primary-foreground">
                                <button 
                                  className="h-full px-4 bg-primary text-primary-foreground"
                                  onClick={() => handleEditProduct(key, product.quantity)}
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button 
                                  className="h-full px-4 bg-destructive text-destructive-foreground"
                                  onClick={() => deleteProduct(key, product.orderId, product.id || '')}
                                >
                                  <Trash className="h-4 w-4" />
                                </button>
                              </div>
                              
                              {/* Contenido del producto */}
                              <div 
                                className="flex justify-between items-center p-2 border-b bg-card transition-transform duration-200"
                                style={{ transform: `translateX(${swipeX}px)` }}
                              >
                                {isEditing ? (
                                  <div className="flex-1 flex items-center gap-2">
                                    <div className="flex-1">
                                      <div className="font-medium text-sm">{product.name}</div>
                                      {product.variant && (
                                        <div className="text-xs text-muted-foreground">
                                          {product.variant}
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex items-center">
                                      <Button 
                                        variant="outline" 
                                        size="icon" 
                                        className="h-6 w-6 p-0"
                                        onClick={() => handleQuantityChange(key, (productQuantities[key] || product.quantity) - 1)}
                                      >
                                        <Minus className="h-3 w-3" />
                                      </Button>
                                      <Input
                                        type="number"
                                        value={productQuantities[key] || product.quantity}
                                        onChange={(e) => handleQuantityChange(key, parseInt(e.target.value) || 1)}
                                        className="w-12 h-6 mx-1 text-center p-0"
                                      />
                                      <Button 
                                        variant="outline" 
                                        size="icon" 
                                        className="h-6 w-6 p-0"
                                        onClick={() => handleQuantityChange(key, (productQuantities[key] || product.quantity) + 1)}
                                      >
                                        <Plus className="h-3 w-3" />
                                      </Button>
                                    </div>
                                    <Button 
                                      variant="default" 
                                      size="sm" 
                                      className="h-6 text-xs ml-2"
                                      onClick={() => saveProductChanges(key, product.orderId)}
                                    >
                                      Guardar
                                    </Button>
                                  </div>
                                ) : (
                                  <>
                                    <div className="flex-1">
                                      <div className="font-medium text-sm">{product.name}</div>
                                      {product.variant && (
                                        <div className="text-xs text-muted-foreground">
                                          {product.variant}
                                        </div>
                                      )}
                                      <div className="text-xs text-muted-foreground">
                                        {product.quantity} {product.quantity === 1 ? 'unidad' : 'unidades'} - ${product.total.toFixed(2)}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <Switch
                                        checked={isPaid}
                                        onCheckedChange={(checked) => 
                                          handleToggleProductPaid(key, product.orderId, checked)
                                        }
                                        className="data-[state=checked]:bg-green-500 h-4 w-7"
                                      />
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                    
                    <div className="mt-3 flex justify-between items-center">
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
                        <div className="text-sm font-medium">
                          Total:
                          <span className="ml-1">
                            ${total.toFixed(2)}
                          </span>
                        </div>
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
