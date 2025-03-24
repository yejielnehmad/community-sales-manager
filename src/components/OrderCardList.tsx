
import { useState, useEffect, useRef } from "react";
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
  DollarSign,
  ShoppingCart,
  Minus,
  Plus,
  Trash,
  Edit
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
  const [clientToDelete, setClientToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [productPaidStatus, setProductPaidStatus] = useState<{ [key: string]: boolean }>({});
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [productQuantities, setProductQuantities] = useState<{ [key: string]: number }>({});
  const [swipeStates, setSwipeStates] = useState<{ [key: string]: number }>({});
  const [clientSwipeStates, setClientSwipeStates] = useState<{ [key: string]: number }>({});
  const [touchActive, setTouchActive] = useState<boolean>(false);
  const [clientTouchActive, setClientTouchActive] = useState<boolean>(false);
  const { toast } = useToast();
  const touchStartXRef = useRef<number | null>(null);
  const clientTouchStartXRef = useRef<number | null>(null);
  const productItemRefs = useRef<{[key: string]: HTMLDivElement | null}>({});
  const clientItemRefs = useRef<{[key: string]: HTMLDivElement | null}>({});

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
    if (openClientId && openClientId !== clientId) {
      setOpenClientId(null);
      setTimeout(() => {
        setOpenClientId(clientId);
      }, 50);
    } else {
      setOpenClientId(openClientId === clientId ? null : clientId);
    }
  };

  const handleTogglePaid = async (orderId: string, isPaid: boolean) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          amount_paid: isPaid ? order.total : 0,
          balance: isPaid ? 0 : order.total
        })
        .eq('id', orderId);
      
      if (error) throw error;
      
      if (onOrderUpdate) {
        onOrderUpdate(orderId, {
          amountPaid: isPaid ? order.total : 0,
          balance: isPaid ? 0 : order.total
        });
      }
      
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
      const { error: itemsError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', orderToDelete);
      
      if (itemsError) throw itemsError;
      
      const { error: orderError } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderToDelete);
        
      if (orderError) throw orderError;
      
      toast({
        title: "Pedido eliminado",
        description: "El pedido ha sido eliminado correctamente",
      });
      
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

  const handleDeleteClientOrders = async () => {
    if (!clientToDelete) return;
    
    setIsDeleting(true);
    try {
      const clientOrders = ordersByClient[clientToDelete]?.orders || [];
      const orderIds = clientOrders.map(order => order.id);
      
      // Eliminar order_items primero
      for (const orderId of orderIds) {
        const { error: itemsError } = await supabase
          .from('order_items')
          .delete()
          .eq('order_id', orderId);
        
        if (itemsError) throw itemsError;
      }
      
      // Ahora eliminar las órdenes
      for (const orderId of orderIds) {
        const { error: orderError } = await supabase
          .from('orders')
          .delete()
          .eq('id', orderId);
          
        if (orderError) throw orderError;
      }
      
      toast({
        title: "Pedidos eliminados",
        description: `Todos los pedidos del cliente ${ordersByClient[clientToDelete]?.client} han sido eliminados`,
      });
      
      setClientToDelete(null);
      setClientSwipeStates(prev => ({
        ...prev,
        [clientToDelete]: 0
      }));
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al eliminar los pedidos",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleProductSwipe = (productKey: string, deltaX: number) => {
    if (!touchActive) return;
    
    let swipePosition = Math.min(0, deltaX);
    
    // Si el deslizamiento es significativo, mostrar completamente los botones
    const threshold = -20;
    if (swipePosition < threshold) {
      swipePosition = -120; // Ancho total de los botones
    }
    
    setSwipeStates(prev => ({
      ...prev,
      [productKey]: swipePosition
    }));
  };

  const handleClientSwipe = (clientId: string, deltaX: number) => {
    if (!clientTouchActive) return;
    
    let swipePosition = Math.min(0, deltaX);
    
    // Si el deslizamiento es significativo, mostrar completamente el botón de eliminar
    const threshold = -20;
    if (swipePosition < threshold) {
      swipePosition = -80; // Ancho del botón de eliminar
    }
    
    setClientSwipeStates(prev => ({
      ...prev,
      [clientId]: swipePosition
    }));
  };

  const completeSwipeAnimation = (productKey: string) => {
    const currentSwipe = swipeStates[productKey] || 0;
    
    const threshold = -20;
    
    // Si el deslizamiento actual es menor que el umbral, mostrar completamente los botones
    const finalPosition = currentSwipe < threshold ? -120 : 0;
    
    setSwipeStates(prev => ({
      ...prev,
      [productKey]: finalPosition
    }));
  };

  const completeClientSwipeAnimation = (clientId: string) => {
    const currentSwipe = clientSwipeStates[clientId] || 0;
    
    const threshold = -20;
    
    // Si el deslizamiento actual es menor que el umbral, mostrar completamente el botón de eliminar
    const finalPosition = currentSwipe < threshold ? -80 : 0;
    
    setClientSwipeStates(prev => ({
      ...prev,
      [clientId]: finalPosition
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

  const saveProductChanges = async (productKey: string, orderId: string, itemId: string) => {
    const newQuantity = productQuantities[productKey] || 1;
    
    try {
      const { error } = await supabase
        .from('order_items')
        .update({ quantity: newQuantity })
        .eq('id', itemId);
        
      if (error) throw error;
      
      toast({
        title: "Producto actualizado",
        description: `Cantidad actualizada a ${newQuantity}`
      });
      
      setEditingProduct(null);
      
      setSwipeStates(prev => ({
        ...prev,
        [productKey]: 0
      }));
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al actualizar el producto",
        variant: "destructive",
      });
    }
  };

  const deleteProduct = async (productKey: string, orderId: string, itemId: string) => {
    try {
      const { error } = await supabase
        .from('order_items')
        .delete()
        .eq('id', itemId);
        
      if (error) throw error;
      
      toast({
        title: "Producto eliminado",
        description: "El producto ha sido eliminado del pedido"
      });
      
      setSwipeStates(prev => ({
        ...prev,
        [productKey]: 0
      }));
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al eliminar el producto",
        variant: "destructive",
      });
    }
  };

  const closeAllSwipes = (exceptKey?: string) => {
    setSwipeStates(prev => {
      const newState = { ...prev };
      Object.keys(newState).forEach(key => {
        if (key !== exceptKey) {
          newState[key] = 0;
        }
      });
      return newState;
    });
    
    setClientSwipeStates(prev => {
      const newState = { ...prev };
      Object.keys(newState).forEach(key => {
        if (key !== exceptKey) {
          newState[key] = 0;
        }
      });
      return newState;
    });
  };

  const getTotalClientBalance = (clientOrders: Order[]) => {
    const total = clientOrders.reduce((sum, order) => sum + order.total, 0);
    const paid = clientOrders.reduce((sum, order) => sum + order.amountPaid, 0);
    return { total, paid, balance: total - paid };
  };

  const isClientFullyPaid = (clientOrders: Order[]) => {
    const { total, paid } = getTotalClientBalance(clientOrders);
    return paid >= total * 0.99;
  };

  const registerProductRef = (key: string, ref: HTMLDivElement | null) => {
    productItemRefs.current[key] = ref;
  };

  const registerClientRef = (key: string, ref: HTMLDivElement | null) => {
    clientItemRefs.current[key] = ref;
  };

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      const productItem = target.closest('[data-product-key]') as HTMLElement;
      const clientItem = target.closest('[data-client-id]') as HTMLElement;
      
      if (productItem) {
        const productKey = productItem.getAttribute('data-product-key');
        if (productKey) {
          touchStartXRef.current = e.touches[0].clientX;
          setTouchActive(true);
          closeAllSwipes(productKey);
        }
      } else if (clientItem) {
        const clientId = clientItem.getAttribute('data-client-id');
        if (clientId) {
          clientTouchStartXRef.current = e.touches[0].clientX;
          setClientTouchActive(true);
          closeAllSwipes(clientId);
        }
      }
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      // Manejo de deslizamiento para productos
      if (touchActive && touchStartXRef.current !== null) {
        const target = e.target as HTMLElement;
        const productItem = target.closest('[data-product-key]') as HTMLElement;
        
        if (productItem) {
          const productKey = productItem.getAttribute('data-product-key');
          if (productKey) {
            const currentX = e.touches[0].clientX;
            const deltaX = currentX - touchStartXRef.current;
            handleProductSwipe(productKey, deltaX);
          }
        }
      }
      
      // Manejo de deslizamiento para clientes
      if (clientTouchActive && clientTouchStartXRef.current !== null) {
        const target = e.target as HTMLElement;
        const clientItem = target.closest('[data-client-id]') as HTMLElement;
        
        if (clientItem) {
          const clientId = clientItem.getAttribute('data-client-id');
          if (clientId) {
            const currentX = e.touches[0].clientX;
            const deltaX = currentX - clientTouchStartXRef.current;
            handleClientSwipe(clientId, deltaX);
          }
        }
      }
    };
    
    const handleTouchEnd = (e: TouchEvent) => {
      // Finalización del deslizamiento para productos
      if (touchActive) {
        const target = e.target as HTMLElement;
        const productItem = target.closest('[data-product-key]') as HTMLElement;
        
        if (productItem) {
          const productKey = productItem.getAttribute('data-product-key');
          if (productKey) {
            completeSwipeAnimation(productKey);
          }
        }
        
        touchStartXRef.current = null;
        setTouchActive(false);
      }
      
      // Finalización del deslizamiento para clientes
      if (clientTouchActive) {
        const target = e.target as HTMLElement;
        const clientItem = target.closest('[data-client-id]') as HTMLElement;
        
        if (clientItem) {
          const clientId = clientItem.getAttribute('data-client-id');
          if (clientId) {
            completeClientSwipeAnimation(clientId);
          }
        }
        
        clientTouchStartXRef.current = null;
        setClientTouchActive(false);
      }
    };
    
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isActionButton = target.closest('.product-action-button') || target.closest('.client-action-button');
      const productItem = target.closest('[data-product-key]');
      const clientItem = target.closest('[data-client-id]');
      
      if (!isActionButton && !productItem && !clientItem) {
        closeAllSwipes();
      }
    };
    
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('click', handleDocumentClick);
    
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('click', handleDocumentClick);
    };
  }, [touchActive, clientTouchActive, swipeStates, clientSwipeStates]);

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground mb-2">
        {Object.keys(ordersByClient).length} {Object.keys(ordersByClient).length === 1 ? 'cliente' : 'clientes'} con pedidos
      </div>
      
      <div className="space-y-3">
        {Object.entries(ordersByClient).map(([clientId, { client, orders: clientOrders }]) => {
          const { total, balance } = getTotalClientBalance(clientOrders);
          const isPaid = isClientFullyPaid(clientOrders);
          const clientSwipeX = clientSwipeStates[clientId] || 0;
          
          return (
            <div 
              key={clientId} 
              className="relative overflow-hidden transition-all duration-200 rounded-xl"
              data-client-id={clientId}
              ref={(ref) => registerClientRef(clientId, ref)}
            >
              {/* Botón de eliminar cliente (detrás del header) */}
              <div 
                className="absolute inset-y-0 right-0 flex items-stretch h-14"
                style={{ width: '80px' }}
              >
                <button 
                  className="client-action-button h-full w-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors"
                  onClick={() => setClientToDelete(clientId)}
                >
                  <Trash className="h-5 w-5" />
                </button>
              </div>
              
              <div 
                className="border overflow-hidden transition-all duration-200 rounded-xl"
                style={{ 
                  transform: `translateX(${clientSwipeX}px)`,
                  transition: 'transform 0.3s ease-out'
                }}
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
                        {(() => {
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
                                className="relative overflow-hidden rounded-md mb-1"
                                ref={(ref) => registerProductRef(key, ref)}
                              >
                                {/* Botones de acción (detrás del producto) */}
                                <div 
                                  className="absolute inset-y-0 right-0 flex items-stretch h-full"
                                  style={{ width: '120px' }}
                                >
                                  <div className="flex-1 flex items-stretch">
                                    <button 
                                      className="product-action-button h-full w-full bg-amber-500 hover:bg-amber-600 text-white flex flex-col items-center justify-center transition-colors"
                                      onClick={() => handleEditProduct(key, product.quantity)}
                                    >
                                      <Edit className="h-5 w-5" />
                                    </button>
                                  </div>
                                  <div className="flex-1 flex items-stretch">
                                    <button 
                                      className="product-action-button h-full w-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors"
                                      onClick={() => deleteProduct(key, product.orderId, product.id || '')}
                                    >
                                      <Trash className="h-5 w-5" />
                                    </button>
                                  </div>
                                </div>
                                
                                <div 
                                  className={`flex justify-between items-center p-3 border-b bg-card shadow-sm transition-transform ${isEditing ? 'bg-muted/10' : ''}`}
                                  style={{ 
                                    transform: `translateX(${swipeX}px)`,
                                    borderRadius: '4px',
                                    transition: 'transform 0.3s ease-out'
                                  }}
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
                                          className="h-8 w-8 rounded-full"
                                          onClick={() => handleQuantityChange(key, (productQuantities[key] || product.quantity) - 1)}
                                        >
                                          <Minus className="h-3 w-3" />
                                        </Button>
                                        <Input
                                          type="number"
                                          value={productQuantities[key] || product.quantity}
                                          onChange={(e) => handleQuantityChange(key, parseInt(e.target.value) || 1)}
                                          className="w-12 h-8 mx-1 text-center p-0"
                                        />
                                        <Button 
                                          variant="outline" 
                                          size="icon" 
                                          className="h-8 w-8 rounded-full"
                                          onClick={() => handleQuantityChange(key, (productQuantities[key] || product.quantity) + 1)}
                                        >
                                          <Plus className="h-3 w-3" />
                                        </Button>
                                      </div>
                                      <Button 
                                        variant="default" 
                                        size="sm" 
                                        className="h-8 text-xs ml-2 px-4"
                                        onClick={() => saveProductChanges(key, product.orderId, product.id || '')}
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
                                        <div className="flex justify-between text-xs text-muted-foreground mt-0.5">
                                          <div>
                                            {product.quantity} {product.quantity === 1 ? 'unidad' : 'unidades'}
                                          </div>
                                          <div className="font-medium text-foreground">
                                            ${product.total.toFixed(2)}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-3 ml-2">
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
                      
                      <div className="mt-3 flex justify-end items-center">
                        <div className="text-sm font-medium">
                          Total:
                          <span className="ml-1">
                            ${total.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </div>
          );
        })}
      </div>
      
      {Object.keys(ordersByClient).length === 0 && (
        <div className="text-center p-8 bg-muted/20 rounded-lg">
          <p>No hay pedidos que coincidan con la búsqueda</p>
        </div>
      )}
      
      {/* Diálogo para eliminar un producto de un pedido */}
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
              {isDeleting ? <span className="animate-pulse">Eliminando...</span> : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Diálogo para eliminar todos los pedidos de un cliente */}
      <AlertDialog open={!!clientToDelete} onOpenChange={(open) => !open && setClientToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar todos los pedidos de este cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Todos los pedidos del cliente {ordersByClient[clientToDelete || '']?.client} serán eliminados permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteClientOrders}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <span className="animate-pulse">Eliminando...</span> : 'Eliminar todos'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
