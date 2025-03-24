import { useState, useEffect, useRef, useCallback } from "react";
import { Order, OrderItem } from "@/types";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
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
import { ClientOrderCard } from "./ClientOrderCard";

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
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const touchStartXRef = useRef<number | null>(null);
  const clientTouchStartXRef = useRef<number | null>(null);
  const productItemRefs = useRef<{[key: string]: HTMLDivElement | null}>({});
  const clientItemRefs = useRef<{[key: string]: HTMLDivElement | null}>({});

  const mapApiItemsToOrderItems = (apiItems: any[]): OrderItem[] => {
    return apiItems.map(item => {
      return {
        id: item.id,
        product_id: item.product_id,
        name: item.name || "Producto",
        variant: item.variant || "",
        variant_id: item.variant_id || "",
        quantity: item.quantity,
        price: item.price,
        total: item.total,
        is_paid: item.is_paid
      };
    });
  };

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

  useEffect(() => {
    const initialPaidStatus: { [key: string]: boolean } = {};
    
    orders.forEach(order => {
      order.items.forEach(item => {
        const key = `${item.name || 'Producto'}_${item.variant || ''}_${order.id}`;
        initialPaidStatus[key] = item.is_paid === true;
      });
    });
    
    setProductPaidStatus(initialPaidStatus);
  }, [orders]);

  const handleProductSwipe = useCallback((productKey: string, deltaX: number) => {
    const newSwipeX = Math.max(-140, Math.min(0, deltaX));
    
    setSwipeStates(prev => ({
      ...prev,
      [productKey]: newSwipeX
    }));
  }, []);

  const handleClientSwipe = useCallback((clientId: string, deltaX: number) => {
    const newSwipeX = Math.max(-70, Math.min(0, deltaX));
    
    setClientSwipeStates(prev => ({
      ...prev,
      [clientId]: newSwipeX
    }));
  }, []);

  const completeSwipeAnimation = useCallback((productKey: string) => {
    const currentSwipe = swipeStates[productKey] || 0;
    
    if (currentSwipe < -70) {
      setSwipeStates(prev => ({
        ...prev,
        [productKey]: -140
      }));
    } 
    else if (currentSwipe > -70 && currentSwipe < 0) {
      setSwipeStates(prev => ({
        ...prev,
        [productKey]: 0
      }));
    }
  }, [swipeStates]);

  const completeClientSwipeAnimation = useCallback((clientId: string) => {
    const currentSwipe = clientSwipeStates[clientId] || 0;
    
    if (currentSwipe < -35) {
      setClientSwipeStates(prev => ({
        ...prev,
        [clientId]: -70
      }));
    } 
    else if (currentSwipe > -35 && currentSwipe < 0) {
      setClientSwipeStates(prev => ({
        ...prev,
        [clientId]: 0
      }));
    }
  }, [clientSwipeStates]);

  const toggleClient = useCallback((clientId: string) => {
    if (openClientId && openClientId !== clientId) {
      setOpenClientId(null);
      setTimeout(() => {
        setOpenClientId(clientId);
      }, 50);
    } else {
      setOpenClientId(openClientId === clientId ? null : clientId);
    }
  }, [openClientId]);

  const handleToggleProductPaid = async (productKey: string, orderId: string, itemId: string, isPaid: boolean) => {
    try {
      setIsSaving(true);
      
      setProductPaidStatus(prev => ({
        ...prev,
        [productKey]: isPaid
      }));
      
      const order = orders.find(o => o.id === orderId);
      if (!order) {
        throw new Error("Pedido no encontrado");
      }
      
      const item = order.items.find(item => item.id === itemId);
      if (!item) {
        throw new Error("Producto no encontrado");
      }
      
      const productTotal = item.price * item.quantity;
      
      let newAmountPaid = 0;
      order.items.forEach(orderItem => {
        const key = `${orderItem.name || 'Producto'}_${orderItem.variant || ''}_${order.id}`;
        const isItemPaid = key === productKey 
          ? isPaid 
          : (productPaidStatus[key] || false);
        
        if (isItemPaid) {
          newAmountPaid += orderItem.price * orderItem.quantity;
        }
      });
      
      newAmountPaid = Math.round(newAmountPaid * 100) / 100;
      const newBalance = Math.max(0, order.total - newAmountPaid);
      
      const { error } = await supabase
        .from('orders')
        .update({
          amount_paid: newAmountPaid,
          balance: newBalance
        })
        .eq('id', orderId);
        
      if (error) throw error;
      
      const { error: itemError } = await supabase
        .from('order_items')
        .update({
          is_paid: isPaid
        })
        .eq('id', itemId);
        
      if (itemError) {
        console.error("Error al actualizar estado de pago del item:", itemError);
      }
      
      if (onOrderUpdate) {
        onOrderUpdate(orderId, {
          amountPaid: newAmountPaid,
          balance: newBalance
        });
      }
      
      toast({
        title: isPaid ? "Producto pagado" : "Producto marcado como no pagado",
        description: "Se ha actualizado el estado de pago",
        variant: "default"
      });
    } catch (error: any) {
      console.error("Error al actualizar el pago del producto:", error);
      toast({
        title: "Error",
        description: error.message || "Error al actualizar el pago del producto",
        variant: "destructive",
      });
      
      setProductPaidStatus(prev => ({
        ...prev,
        [productKey]: !isPaid
      }));
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleAllProducts = async (clientId: string, isPaid: boolean) => {
    try {
      setIsSaving(true);
      const clientOrders = ordersByClient[clientId]?.orders || [];
      const clientProducts: { [key: string]: boolean } = {};
      
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
      
      for (const order of clientOrders) {
        for (const item of order.items) {
          const { error: itemError } = await supabase
            .from('order_items')
            .update({ is_paid: isPaid })
            .eq('id', item.id || '');
            
          if (itemError) throw itemError;
        }
        
        const newAmountPaid = isPaid ? order.total : 0;
        const newBalance = isPaid ? 0 : order.total;
        
        const { error } = await supabase
          .from('orders')
          .update({ 
            amount_paid: newAmountPaid,
            balance: newBalance
          })
          .eq('id', order.id);
          
        if (error) throw error;
        
        if (onOrderUpdate) {
          onOrderUpdate(order.id, {
            amountPaid: newAmountPaid,
            balance: newBalance
          });
        }
      }
      
      toast({
        title: isPaid ? "Todos los productos pagados" : "Todos los productos marcados como no pagados",
        description: `Se ha actualizado el estado de pago para todos los productos de ${ordersByClient[clientId]?.client}`,
        variant: "default"
      });
    } catch (error: any) {
      console.error("Error al actualizar pagos masivos:", error);
      toast({
        title: "Error",
        description: error.message || "Error al actualizar los pagos",
        variant: "destructive",
      });
      
      if (onOrderUpdate) {
        const clientOrders = ordersByClient[clientId]?.orders || [];
        for (const order of clientOrders) {
          const { data } = await supabase
            .from('orders')
            .select('*')
            .eq('id', order.id)
            .single();
            
          if (data) {
            onOrderUpdate(order.id, {
              amountPaid: data.amount_paid,
              balance: data.balance
            });
          }
        }
      }
    } finally {
      setIsSaving(false);
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
        variant: "default"
      });
      
      if (onOrderUpdate) {
        onOrderUpdate(orderToDelete, { deleted: true });
      }
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al eliminar el pedido",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setOrderToDelete(null);
    }
  };

  const handleDeleteClientOrders = async () => {
    if (!clientToDelete) return;
    
    setIsDeleting(true);
    try {
      const clientOrders = ordersByClient[clientToDelete]?.orders || [];
      const orderIds = clientOrders.map(order => order.id);
      
      for (const orderId of orderIds) {
        const { error: itemsError } = await supabase
          .from('order_items')
          .delete()
          .eq('order_id', orderId);
        
        if (itemsError) throw itemsError;
      }
      
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
        variant: "default"
      });
      
      if (onOrderUpdate) {
        orderIds.forEach(orderId => {
          onOrderUpdate(orderId, { deleted: true });
        });
      }
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al eliminar los pedidos",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setClientToDelete(null);
      setClientSwipeStates(prev => ({
        ...prev,
        [clientToDelete]: 0
      }));
    }
  };

  const handleEditProduct = (productKey: string, currentQuantity: number, isPaid: boolean) => {
    if (isPaid) {
      toast({
        title: "Producto pagado",
        description: "No se puede editar un producto que ya está pagado",
        variant: "default"
      });
      return;
    }

    setSwipeStates(prev => {
      const newState = { ...prev };
      Object.keys(newState).forEach(key => {
        newState[key] = 0;
      });
      return newState;
    });
    
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
    
    setIsSaving(true);
    
    try {
      const { data: itemData, error: itemError } = await supabase
        .from('order_items')
        .select('price, is_paid')
        .eq('id', itemId)
        .single();
      
      if (itemError) throw itemError;
      
      const price = itemData?.price || 0;
      const total = price * newQuantity;
      const isPaid = itemData?.is_paid || false;
      
      const { error } = await supabase
        .from('order_items')
        .update({ 
          quantity: newQuantity,
          total: total
        })
        .eq('id', itemId);
        
      if (error) throw error;
      
      await updateOrderTotal(orderId);
      
      toast({
        title: "Producto actualizado",
        description: `Cantidad actualizada a ${newQuantity}`,
        variant: "default"
      });
      
      const { data: updatedOrderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .maybeSingle();
        
      if (orderError) throw orderError;
      
      const { data: updatedItems, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId);
        
      if (itemsError) throw itemsError;
      
      if (onOrderUpdate && updatedOrderData) {
        onOrderUpdate(orderId, {
          total: updatedOrderData.total,
          amountPaid: updatedOrderData.amount_paid,
          balance: updatedOrderData.balance,
          items: mapApiItemsToOrderItems(updatedItems || [])
        });
      }
      
    } catch (error: any) {
      console.error("Error al actualizar el producto:", error);
      toast({
        title: "Error",
        description: error.message || "Error al actualizar el producto",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
      setEditingProduct(null);
      setSwipeStates(prev => {
        const newState = { ...prev };
        Object.keys(newState).forEach(key => {
          newState[key] = 0;
        });
        return newState;
      });
    }
  };

  const updateOrderTotal = async (orderId: string) => {
    try {
      const { data: items, error: itemsError } = await supabase
        .from('order_items')
        .select('total')
        .eq('order_id', orderId);
      
      if (itemsError) throw itemsError;
      
      const newTotal = items?.reduce((sum, item) => sum + (item.total || 0), 0) || 0;
      
      const { data: currentOrder, error: orderError } = await supabase
        .from('orders')
        .select('amount_paid')
        .eq('id', orderId)
        .maybeSingle();
      
      if (orderError) throw orderError;
      
      const amountPaid = currentOrder?.amount_paid || 0;
      const newBalance = Math.max(0, newTotal - amountPaid);
      
      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          total: newTotal,
          balance: newBalance
        })
        .eq('id', orderId);
        
      if (updateError) throw updateError;
      
    } catch (error) {
      console.error("Error al actualizar el total del pedido:", error);
      throw error;
    }
  };

  const deleteProduct = async (productKey: string, orderId: string, itemId: string) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('order_items')
        .delete()
        .eq('id', itemId);
        
      if (error) throw error;
      
      await updateOrderTotal(orderId);
      
      toast({
        title: "Producto eliminado",
        description: "El producto ha sido eliminado del pedido",
        variant: "default"
      });
      
      const { data: updatedOrderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .maybeSingle();
        
      if (orderError) throw orderError;
      
      const { data: updatedItems, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId);
        
      if (itemsError) throw itemsError;
      
      if (onOrderUpdate && updatedOrderData) {
        onOrderUpdate(orderId, {
          total: updatedOrderData.total,
          amountPaid: updatedOrderData.amount_paid,
          balance: updatedOrderData.balance,
          items: mapApiItemsToOrderItems(updatedItems || [])
        });
      }
      
    } catch (error: any) {
      console.error("Error al eliminar el producto:", error);
      toast({
        title: "Error",
        description: error.message || "Error al eliminar el producto",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
      setSwipeStates(prev => ({
        ...prev,
        [productKey]: 0
      }));
    }
  };

  const closeAllSwipes = useCallback((exceptKey?: string) => {
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
  }, []);

  const registerProductRef = (key: string, ref: HTMLDivElement | null) => {
    productItemRefs.current[key] = ref;
  };

  const registerClientRef = (key: string, ref: HTMLDivElement | null) => {
    clientItemRefs.current[key] = ref;
  };

  const clientHasProducts = (clientId: string) => {
    const clientData = ordersByClient[clientId];
    if (!clientData) return false;
    
    return clientData.orders.some(order => order.items && order.items.length > 0);
  };

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      const productItem = target.closest('[data-product-key]') as HTMLElement;
      const clientItem = target.closest('[data-client-id]') as HTMLElement;
      
      if (editingProduct && (!productItem || productItem.getAttribute('data-product-key') !== editingProduct)) {
        setEditingProduct(null);
      }
      
      if (productItem) {
        const productKey = productItem.getAttribute('data-product-key');
        if (productKey) {
          const isPaid = productPaidStatus[productKey] || false;
          if (!isPaid) {
            touchStartXRef.current = e.touches[0].clientX;
            setTouchActive(true);
            closeAllSwipes(productKey);
          }
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
      const editControls = target.closest('.edit-controls');
      
      if (!isActionButton && !productItem && !clientItem && !editControls) {
        closeAllSwipes();
        setEditingProduct(null);
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
  }, [
    touchActive, 
    clientTouchActive, 
    swipeStates, 
    clientSwipeStates, 
    editingProduct, 
    productPaidStatus, 
    closeAllSwipes, 
    handleProductSwipe, 
    handleClientSwipe, 
    completeSwipeAnimation, 
    completeClientSwipeAnimation
  ]);

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground mb-2">
        {Object.keys(ordersByClient).filter(clientId => clientHasProducts(clientId)).length} {Object.keys(ordersByClient).filter(clientId => clientHasProducts(clientId)).length === 1 ? 'cliente' : 'clientes'} con pedidos
      </div>
      
      <div className="space-y-3">
        {Object.entries(ordersByClient)
          .filter(([clientId]) => clientHasProducts(clientId))
          .map(([clientId, { client, orders: clientOrders }]) => (
            <ClientOrderCard
              key={clientId}
              clientId={clientId}
              clientName={client}
              orders={clientOrders}
              clientSwipeX={clientSwipeStates[clientId] || 0}
              openClientId={openClientId}
              toggleClient={toggleClient}
              handleToggleAllProducts={handleToggleAllProducts}
              productPaidStatus={productPaidStatus}
              swipeStates={swipeStates}
              editingProduct={editingProduct}
              productQuantities={productQuantities}
              isSaving={isSaving}
              handleToggleProductPaid={handleToggleProductPaid}
              handleEditProduct={handleEditProduct}
              handleQuantityChange={handleQuantityChange}
              saveProductChanges={saveProductChanges}
              deleteProduct={deleteProduct}
              registerProductRef={registerProductRef}
              registerClientRef={registerClientRef}
              setClientToDelete={setClientToDelete}
            />
          ))}
      </div>
      
      {Object.keys(ordersByClient).filter(clientId => clientHasProducts(clientId)).length === 0 && (
        <div className="text-center p-8 bg-muted/20 rounded-lg">
          <p>No hay pedidos que coincidan con la búsqueda</p>
        </div>
      )}
      
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
