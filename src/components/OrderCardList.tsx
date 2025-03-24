
import { useState, useEffect, useRef, useCallback } from "react";
import { Order } from "@/types";
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

  // Organizar pedidos por cliente
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

  // Inicializar el estado de pago de productos basado en órdenes
  useEffect(() => {
    const initialPaidStatus: { [key: string]: boolean } = {};
    
    orders.forEach(order => {
      const isPaid = order.amountPaid >= order.total * 0.99;
      
      order.items.forEach(item => {
        const key = `${item.name || 'Producto'}_${item.variant || ''}_${order.id}`;
        initialPaidStatus[key] = isPaid;
      });
    });
    
    setProductPaidStatus(initialPaidStatus);
  }, [orders]);

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
      
      // Encontrar todos los productos para esta orden
      const order = orders.find(o => o.id === orderId);
      if (!order) return;
      
      // Obtener el precio del producto que estamos cambiando
      const item = order.items.find(item => item.id === itemId);
      if (!item) return;
      
      const productTotal = item.price * item.quantity;
      
      // Actualizar el estado local primero
      setProductPaidStatus(prev => ({
        ...prev,
        [productKey]: isPaid
      }));
      
      // Calcular el nuevo monto pagado basado en todos los productos marcados como pagados
      let newAmountPaid = 0;
      order.items.forEach(orderItem => {
        const itemKey = `${orderItem.name || 'Producto'}_${orderItem.variant || ''}_${order.id}`;
        // Si es el ítem actual, usar el nuevo estado; de lo contrario, usar el estado existente
        const isItemPaid = itemKey === productKey 
          ? isPaid 
          : (productPaidStatus[itemKey] || false);
        
        if (isItemPaid) {
          newAmountPaid += orderItem.price * orderItem.quantity;
        }
      });
      
      // Redondear para evitar problemas de precisión
      newAmountPaid = Math.round(newAmountPaid * 100) / 100;
      const newBalance = Math.max(0, order.total - newAmountPaid);
      
      // Actualizar en la base de datos
      const { error } = await supabase
        .from('orders')
        .update({
          amount_paid: newAmountPaid,
          balance: newBalance
        })
        .eq('id', orderId);
        
      if (error) throw error;
      
      // Actualizar el estado de la aplicación
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
      
      // Revertir cambio local en caso de error
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
      
      // Actualizar estado local primero para UI responsive
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
      
      // Actualizar cada pedido en la base de datos
      for (const order of clientOrders) {
        const { error } = await supabase
          .from('orders')
          .update({ 
            amount_paid: isPaid ? order.total : 0,
            balance: isPaid ? 0 : order.total
          })
          .eq('id', order.id);
          
        if (error) throw error;
        
        if (onOrderUpdate) {
          onOrderUpdate(order.id, {
            amountPaid: isPaid ? order.total : 0,
            balance: isPaid ? 0 : order.total
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
      
      // Recargar para asegurar coherencia
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

  // Gestión de deslizamientos táctiles
  const handleProductSwipe = useCallback((productKey: string, deltaX: number) => {
    if (!touchActive) return;
    
    // Limitando el movimiento a -70px como máximo
    let swipePosition = Math.max(-70, Math.min(0, deltaX));
    
    // Umbral de activación optimizado
    const threshold = -20;
    if (swipePosition < threshold) {
      swipePosition = -70;
    }
    
    setSwipeStates(prev => ({
      ...prev,
      [productKey]: swipePosition
    }));
  }, [touchActive]);

  const handleClientSwipe = useCallback((clientId: string, deltaX: number) => {
    if (!clientTouchActive) return;
    
    // Limitando el movimiento a -55px como máximo
    let swipePosition = Math.max(-55, Math.min(0, deltaX));
    
    // Umbral de activación optimizado
    const threshold = -20;
    if (swipePosition < threshold) {
      swipePosition = -55;
    }
    
    setClientSwipeStates(prev => ({
      ...prev,
      [clientId]: swipePosition
    }));
  }, [clientTouchActive]);

  const completeSwipeAnimation = useCallback((productKey: string) => {
    const currentSwipe = swipeStates[productKey] || 0;
    
    const threshold = -20;
    
    if (currentSwipe < threshold) {
      setSwipeStates(prev => ({
        ...prev,
        [productKey]: -70
      }));
    } else {
      // Asegurarse de que la tarjeta vuelva a su posición original
      setSwipeStates(prev => ({
        ...prev,
        [productKey]: 0
      }));
    }
  }, [swipeStates]);

  const completeClientSwipeAnimation = useCallback((clientId: string) => {
    const currentSwipe = clientSwipeStates[clientId] || 0;
    
    const threshold = -20;
    
    if (currentSwipe < threshold) {
      setClientSwipeStates(prev => ({
        ...prev,
        [clientId]: -55
      }));
    } else {
      // Asegurarse de que la tarjeta vuelva a su posición original
      setClientSwipeStates(prev => ({
        ...prev,
        [clientId]: 0
      }));
    }
  }, [clientSwipeStates]);

  const handleEditProduct = (productKey: string, currentQuantity: number, isPaid: boolean) => {
    // No permitir editar productos pagados
    if (isPaid) {
      toast({
        title: "Producto pagado",
        description: "No se puede editar un producto que ya está pagado",
        variant: "default"
      });
      return;
    }

    // Cerrar cualquier otro swipe abierto
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
        .select('price')
        .eq('id', itemId)
        .single();
      
      if (itemError) throw itemError;
      
      const price = itemData?.price || 0;
      const total = price * newQuantity;
      
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
          items: updatedItems || []
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
      // Asegurarse de que la tarjeta vuelva a su posición original
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
          items: updatedItems || []
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

  // Verificar si un cliente tiene productos en sus pedidos
  const clientHasProducts = (clientId: string) => {
    const clientData = ordersByClient[clientId];
    if (!clientData) return false;
    
    // Verificar si hay al menos un pedido con al menos un producto
    return clientData.orders.some(order => order.items && order.items.length > 0);
  };

  // Gestión de eventos táctiles
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      const productItem = target.closest('[data-product-key]') as HTMLElement;
      const clientItem = target.closest('[data-client-id]') as HTMLElement;
      
      // Cerrar cualquier panel de edición abierto
      if (editingProduct && (!productItem || productItem.getAttribute('data-product-key') !== editingProduct)) {
        setEditingProduct(null);
      }
      
      if (productItem) {
        const productKey = productItem.getAttribute('data-product-key');
        // Verificar si el producto está pagado antes de permitir el swipe
        if (productKey) {
          // Verificar si el producto está pagado
          const isPaid = productPaidStatus[productKey] || false;
          
          // Si está pagado, no permitir el swipe
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
      
      // No cerrar si se está haciendo clic en los controles de edición
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
          .filter(([clientId]) => clientHasProducts(clientId)) // Filtrar clientes sin productos
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
