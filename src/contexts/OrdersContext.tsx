
import { createContext, useContext, useState, useCallback, useEffect, ReactNode, useRef } from 'react';
import { Order, OrdersContextProps, OrdersState, OrderItemState } from '@/types';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

// Crear el contexto con un valor inicial
const OrdersContext = createContext<OrdersContextProps | undefined>(undefined);

// Proveedor del contexto
export const OrdersProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  
  // Estado principal de pedidos
  const [state, setState] = useState<OrdersState>({
    isLoading: true,
    isRefreshing: false,
    orders: [],
    error: null,
    clientMap: {},
    searchTerm: ''
  });
  
  // Estado relacionado con los items de pedidos
  const [itemState, setItemState] = useState<OrderItemState>({
    productPaidStatus: {},
    swipeStates: {},
    clientSwipeStates: {},
    editingProduct: null,
    productQuantities: {},
    openClientId: null,
    orderToDelete: null,
    clientToDelete: null,
    isSaving: false,
    isDeleting: false
  });
  
  // Referencias para el manejo táctil
  const touchStartXRef = useRef<number | null>(null);
  const clientTouchStartXRef = useRef<number | null>(null);
  const productItemRefs = useRef<{[key: string]: HTMLDivElement | null}>({});
  const clientItemRefs = useRef<{[key: string]: HTMLDivElement | null}>({});
  
  // Funciones para actualizar los pedidos
  const fetchOrders = useCallback(async (refresh = false) => {
    if (refresh) {
      setState(prev => ({ ...prev, isRefreshing: true }));
    } else {
      setState(prev => ({ ...prev, isLoading: true }));
    }
    setState(prev => ({ ...prev, error: null }));
    
    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (ordersError) {
        throw ordersError;
      }

      if (ordersData && ordersData.length > 0) {
        const clientIds = [...new Set(ordersData.map(order => order.client_id))];
        const { data: clientsData, error: clientsError } = await supabase
          .from('clients')
          .select('id, name')
          .in('id', clientIds);

        if (clientsError) {
          throw clientsError;
        }

        const orderIds = ordersData.map(order => order.id);
        const { data: orderItemsData, error: orderItemsError } = await supabase
          .from('order_items')
          .select('*')
          .in('order_id', orderIds);

        if (orderItemsError) {
          throw orderItemsError;
        }

        const productIds = orderItemsData?.map(item => item.product_id) || [];
        const { data: productsData, error: productsError } = productIds.length > 0 
          ? await supabase
              .from('products')
              .select('id, name')
              .in('id', productIds)
          : { data: [], error: null };
          
        if (productsError) {
          throw productsError;
        }
        
        const variantIds = orderItemsData?.filter(item => item.variant_id).map(item => item.variant_id) || [];
        let variantsData = [];
        
        if (variantIds.length > 0) {
          const { data: variants, error: variantsError } = await supabase
            .from('product_variants')
            .select('id, name')
            .in('id', variantIds);
            
          if (variantsError) {
            throw variantsError;
          }
          
          variantsData = variants || [];
        }

        const productMap: { [key: string]: string } = {};
        productsData?.forEach(product => {
          productMap[product.id] = product.name;
        });
        
        const variantMap: { [key: string]: string } = {};
        variantsData?.forEach(variant => {
          variantMap[variant.id] = variant.name;
        });

        const orderItemsMap: { [key: string]: any[] } = {};
        if (orderItemsData) {
          orderItemsData.forEach(item => {
            if (!orderItemsMap[item.order_id]) {
              orderItemsMap[item.order_id] = [];
            }
            
            orderItemsMap[item.order_id].push({
              ...item,
              name: productMap[item.product_id] || `Producto`,
              variant: item.variant_id ? variantMap[item.variant_id] || `Variante` : null
            });
          });
        }

        if (clientsData) {
          const clientMap: { [key: string]: { name: string } } = {};
          clientsData.forEach(client => {
            clientMap[client.id] = { name: client.name };
          });
          
          const transformedOrders: Order[] = ordersData.map((order: any) => ({
            id: order.id,
            clientId: order.client_id,
            clientName: clientMap[order.client_id]?.name || "Cliente desconocido",
            date: order.date || "",
            status: order.status as 'pending' | 'completed' | 'cancelled',
            items: orderItemsMap[order.id] || [],
            total: order.total,
            amountPaid: order.amount_paid,
            balance: order.balance
          }));
          
          setState(prev => ({
            ...prev,
            orders: transformedOrders,
            clientMap
          }));
          
          // Inicializar el estado de pago de productos
          const initialPaidStatus: { [key: string]: boolean } = {};
          transformedOrders.forEach(order => {
            order.items.forEach(item => {
              const key = `${item.name || 'Producto'}_${item.variant || ''}_${order.id}`;
              initialPaidStatus[key] = item.is_paid === true;
            });
          });
          
          setItemState(prev => ({
            ...prev,
            productPaidStatus: initialPaidStatus
          }));
        }
      } else {
        setState(prev => ({ ...prev, orders: [] }));
      }
    } catch (error: any) {
      console.error("Error al cargar pedidos:", error);
      setState(prev => ({
        ...prev,
        error: error.message || "Error al cargar pedidos"
      }));
      toast({
        title: "Error al cargar los pedidos",
        description: error.message || "Ha ocurrido un error al cargar los pedidos. Intente nuevamente.",
        variant: "destructive"
      });
    } finally {
      setState(prev => ({
        ...prev,
        isLoading: false,
        isRefreshing: false
      }));
    }
  }, [toast]);
  
  // Establecer término de búsqueda
  const setSearchTerm = (term: string) => {
    setState(prev => ({ ...prev, searchTerm: term }));
  };
  
  // Manejo de productos
  const handleToggleProductPaid = async (productKey: string, orderId: string, itemId: string, isPaid: boolean) => {
    try {
      setItemState(prev => ({ ...prev, isSaving: true }));
      
      // Primero actualizamos el estado local inmediatamente para UI responsiva
      setItemState(prev => ({
        ...prev,
        productPaidStatus: {
          ...prev.productPaidStatus,
          [productKey]: isPaid
        }
      }));
      
      // Encontrar todos los productos para esta orden
      const order = state.orders.find(o => o.id === orderId);
      if (!order) {
        throw new Error("Pedido no encontrado");
      }
      
      // Obtener el precio del producto que estamos cambiando
      const item = order.items.find(item => item.id === itemId);
      if (!item) {
        throw new Error("Producto no encontrado");
      }
      
      const productTotal = item.price * item.quantity;
      
      // Calcular el nuevo monto pagado basado en todos los productos marcados como pagados
      let newAmountPaid = 0;
      order.items.forEach(orderItem => {
        const itemKey = `${orderItem.name || 'Producto'}_${orderItem.variant || ''}_${order.id}`;
        // Si es el ítem actual, usar el nuevo estado; de lo contrario, usar el estado existente
        const isItemPaid = itemKey === productKey 
          ? isPaid 
          : (itemState.productPaidStatus[itemKey] || false);
        
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
      
      // También debemos actualizar el estado del item específico en la tabla order_items
      const { error: itemError } = await supabase
        .from('order_items')
        .update({
          is_paid: isPaid
        })
        .eq('id', itemId);
        
      if (itemError) {
        console.error("Error al actualizar estado de pago del item:", itemError);
      }
      
      // Actualizar el estado de la aplicación
      setState(prev => ({
        ...prev,
        orders: prev.orders.map(order => 
          order.id === orderId 
            ? { ...order, amountPaid: newAmountPaid, balance: newBalance } 
            : order
        )
      }));
      
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
      setItemState(prev => ({
        ...prev,
        productPaidStatus: {
          ...prev.productPaidStatus,
          [productKey]: !isPaid
        }
      }));
    } finally {
      setItemState(prev => ({ ...prev, isSaving: false }));
    }
  };
  
  // Manejo de pagos masivos
  const handleToggleAllProducts = async (clientId: string, isPaid: boolean) => {
    try {
      setItemState(prev => ({ ...prev, isSaving: true }));
      
      // Seleccionar órdenes del cliente
      const clientOrders = state.orders.filter(order => order.clientId === clientId);
      
      if (clientOrders.length === 0) {
        throw new Error("No se encontraron pedidos para este cliente");
      }
      
      const clientProducts: { [key: string]: boolean } = {};
      
      // Actualizar estado local primero para UI responsive
      clientOrders.forEach(order => {
        order.items.forEach(item => {
          const key = `${item.name || 'Producto'}_${item.variant || ''}_${order.id}`;
          clientProducts[key] = isPaid;
        });
      });
      
      setItemState(prev => ({
        ...prev,
        productPaidStatus: {
          ...prev.productPaidStatus,
          ...clientProducts
        }
      }));
      
      // Actualizar cada pedido en la base de datos
      for (const order of clientOrders) {
        // Primero, actualizar cada item del pedido
        for (const item of order.items) {
          const { error: itemError } = await supabase
            .from('order_items')
            .update({ is_paid: isPaid })
            .eq('id', item.id || '');
            
          if (itemError) throw itemError;
        }
        
        // Luego, recalcular el amount_paid y balance del pedido
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
      }
      
      // Actualizar el estado de la aplicación
      setState(prev => ({
        ...prev,
        orders: prev.orders.map(order => 
          order.clientId === clientId 
            ? { 
                ...order, 
                amountPaid: isPaid ? order.total : 0, 
                balance: isPaid ? 0 : order.total 
              } 
            : order
        )
      }));
      
      toast({
        title: isPaid ? "Todos los productos pagados" : "Todos los productos marcados como no pagados",
        description: `Se ha actualizado el estado de pago para todos los productos de ${state.clientMap[clientId]?.name || 'este cliente'}`,
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
      fetchOrders(true);
    } finally {
      setItemState(prev => ({ ...prev, isSaving: false }));
    }
  };
  
  // Eliminación de pedidos
  const handleDeleteOrder = async () => {
    const { orderToDelete } = itemState;
    if (!orderToDelete) return;
    
    setItemState(prev => ({ ...prev, isDeleting: true }));
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
      
      // Actualizar estado local
      setState(prev => ({
        ...prev,
        orders: prev.orders.filter(order => order.id !== orderToDelete)
      }));
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al eliminar el pedido",
        variant: "destructive",
      });
    } finally {
      setItemState(prev => ({ 
        ...prev, 
        isDeleting: false,
        orderToDelete: null 
      }));
    }
  };
  
  // Eliminación de pedidos de cliente
  const handleDeleteClientOrders = async () => {
    const { clientToDelete } = itemState;
    if (!clientToDelete) return;
    
    setItemState(prev => ({ ...prev, isDeleting: true }));
    try {
      const clientOrders = state.orders.filter(order => order.clientId === clientToDelete);
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
        description: `Todos los pedidos del cliente ${state.clientMap[clientToDelete]?.name || 'seleccionado'} han sido eliminados`,
        variant: "default"
      });
      
      // Actualizar estado local
      setState(prev => ({
        ...prev,
        orders: prev.orders.filter(order => order.clientId !== clientToDelete)
      }));
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al eliminar los pedidos",
        variant: "destructive",
      });
    } finally {
      setItemState(prev => ({ 
        ...prev, 
        isDeleting: false,
        clientToDelete: null,
        clientSwipeStates: {
          ...prev.clientSwipeStates,
          [prev.clientToDelete || '']: 0
        }
      }));
    }
  };
  
  // Actualización de pedidos
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
      
      return { newTotal, amountPaid, newBalance };
    } catch (error) {
      console.error("Error al actualizar el total del pedido:", error);
      throw error;
    }
  };
  
  // Edición de productos
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
    setItemState(prev => ({
      ...prev,
      swipeStates: Object.keys(prev.swipeStates).reduce((acc, key) => ({ ...acc, [key]: 0 }), {}),
      editingProduct: productKey,
      productQuantities: {
        ...prev.productQuantities,
        [productKey]: currentQuantity
      }
    }));
  };
  
  // Cambio de cantidad
  const handleQuantityChange = (productKey: string, newQuantity: number) => {
    setItemState(prev => ({
      ...prev,
      productQuantities: {
        ...prev.productQuantities,
        [productKey]: Math.max(1, newQuantity)
      }
    }));
  };
  
  // Guardado de cambios de producto
  const saveProductChanges = async (productKey: string, orderId: string, itemId: string) => {
    const newQuantity = itemState.productQuantities[productKey] || 1;
    
    setItemState(prev => ({ ...prev, isSaving: true }));
    
    try {
      const { data: itemData, error: itemError } = await supabase
        .from('order_items')
        .select('price, is_paid')
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
      
      const result = await updateOrderTotal(orderId);
      
      toast({
        title: "Producto actualizado",
        description: `Cantidad actualizada a ${newQuantity}`,
        variant: "default"
      });
      
      const { data: updatedItems, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId);
        
      if (itemsError) throw itemsError;
      
      // Actualizar estado local
      setState(prev => ({
        ...prev,
        orders: prev.orders.map(order => 
          order.id === orderId 
            ? {
                ...order,
                total: result.newTotal,
                amountPaid: result.amountPaid,
                balance: result.newBalance,
                items: updatedItems || []
              } 
            : order
        )
      }));
      
    } catch (error: any) {
      console.error("Error al actualizar el producto:", error);
      toast({
        title: "Error",
        description: error.message || "Error al actualizar el producto",
        variant: "destructive",
      });
    } finally {
      setItemState(prev => ({ 
        ...prev, 
        isSaving: false,
        editingProduct: null,
        swipeStates: Object.keys(prev.swipeStates).reduce((acc, key) => ({ ...acc, [key]: 0 }), {})
      }));
    }
  };
  
  // Eliminación de productos
  const deleteProduct = async (productKey: string, orderId: string, itemId: string) => {
    setItemState(prev => ({ ...prev, isSaving: true }));
    try {
      const { error } = await supabase
        .from('order_items')
        .delete()
        .eq('id', itemId);
        
      if (error) throw error;
      
      const result = await updateOrderTotal(orderId);
      
      toast({
        title: "Producto eliminado",
        description: "El producto ha sido eliminado del pedido",
        variant: "default"
      });
      
      const { data: updatedItems, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId);
        
      if (itemsError) throw itemsError;
      
      // Actualizar estado local
      setState(prev => ({
        ...prev,
        orders: prev.orders.map(order => 
          order.id === orderId 
            ? {
                ...order,
                total: result.newTotal,
                amountPaid: result.amountPaid,
                balance: result.newBalance,
                items: updatedItems || []
              } 
            : order
        )
      }));
      
    } catch (error: any) {
      console.error("Error al eliminar el producto:", error);
      toast({
        title: "Error",
        description: error.message || "Error al eliminar el producto",
        variant: "destructive",
      });
    } finally {
      setItemState(prev => ({ 
        ...prev, 
        isSaving: false,
        swipeStates: {
          ...prev.swipeStates,
          [productKey]: 0
        }
      }));
    }
  };
  
  // Interactividad de tarjetas
  const toggleClient = (clientId: string) => {
    setItemState(prev => {
      if (prev.openClientId && prev.openClientId !== clientId) {
        // Si ya hay un cliente abierto y es diferente, primero cerrarlo y luego abrir el nuevo
        return {
          ...prev,
          openClientId: null,
          _pendingOpenClientId: clientId
        };
      } else {
        // Si no hay cliente abierto o es el mismo, simplemente alternar
        return {
          ...prev,
          openClientId: prev.openClientId === clientId ? null : clientId
        };
      }
    });
  };
  
  // Efecto para gestionar la apertura retrasada después de cerrar un cliente
  useEffect(() => {
    if (itemState._pendingOpenClientId) {
      const timeout = setTimeout(() => {
        setItemState(prev => ({
          ...prev,
          openClientId: prev._pendingOpenClientId,
          _pendingOpenClientId: undefined
        }));
      }, 50);
      
      return () => clearTimeout(timeout);
    }
  }, [itemState._pendingOpenClientId]);
  
  // Configurar eliminaciones
  const setOrderToDelete = (orderId: string | null) => {
    setItemState(prev => ({ ...prev, orderToDelete: orderId }));
  };
  
  const setClientToDelete = (clientId: string | null) => {
    setItemState(prev => ({ ...prev, clientToDelete: clientId }));
  };
  
  // Funciones para el manejo de swipe en UI móvil
  const handleProductSwipe = (productKey: string, deltaX: number) => {
    const newSwipeX = Math.max(-140, Math.min(0, deltaX));
    
    setItemState(prev => ({
      ...prev,
      swipeStates: {
        ...prev.swipeStates,
        [productKey]: newSwipeX
      }
    }));
  };
  
  const handleClientSwipe = (clientId: string, deltaX: number) => {
    const newSwipeX = Math.max(-70, Math.min(0, deltaX));
    
    setItemState(prev => ({
      ...prev,
      clientSwipeStates: {
        ...prev.clientSwipeStates,
        [clientId]: newSwipeX
      }
    }));
  };
  
  const completeSwipeAnimation = (productKey: string) => {
    const currentSwipe = itemState.swipeStates[productKey] || 0;
    
    if (currentSwipe < -70) {
      setItemState(prev => ({
        ...prev,
        swipeStates: {
          ...prev.swipeStates,
          [productKey]: -140
        }
      }));
    } else if (currentSwipe > -70 && currentSwipe < 0) {
      setItemState(prev => ({
        ...prev,
        swipeStates: {
          ...prev.swipeStates,
          [productKey]: 0
        }
      }));
    }
  };
  
  const completeClientSwipeAnimation = (clientId: string) => {
    const currentSwipe = itemState.clientSwipeStates[clientId] || 0;
    
    if (currentSwipe < -35) {
      setItemState(prev => ({
        ...prev,
        clientSwipeStates: {
          ...prev.clientSwipeStates,
          [clientId]: -70
        }
      }));
    } else if (currentSwipe > -35 && currentSwipe < 0) {
      setItemState(prev => ({
        ...prev,
        clientSwipeStates: {
          ...prev.clientSwipeStates,
          [clientId]: 0
        }
      }));
    }
  };
  
  const closeAllSwipes = (exceptKey?: string) => {
    setItemState(prev => ({
      ...prev,
      swipeStates: Object.keys(prev.swipeStates).reduce((acc, key) => ({ 
        ...acc, 
        [key]: key === exceptKey ? prev.swipeStates[key] : 0 
      }), {}),
      clientSwipeStates: Object.keys(prev.clientSwipeStates).reduce((acc, key) => ({ 
        ...acc, 
        [key]: key === exceptKey ? prev.clientSwipeStates[key] : 0 
      }), {})
    }));
  };
  
  // Registrar referencias de DOM para eventos táctiles
  const registerProductRef = (key: string, ref: HTMLDivElement | null) => {
    productItemRefs.current[key] = ref;
  };
  
  const registerClientRef = (key: string, ref: HTMLDivElement | null) => {
    clientItemRefs.current[key] = ref;
  };
  
  // Efectos de eventos táctiles para UX móvil
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      const productItem = target.closest('[data-product-key]') as HTMLElement;
      const clientItem = target.closest('[data-client-id]') as HTMLElement;
      
      // Cerrar cualquier panel de edición abierto
      if (itemState.editingProduct && (!productItem || productItem.getAttribute('data-product-key') !== itemState.editingProduct)) {
        setItemState(prev => ({ ...prev, editingProduct: null }));
      }
      
      if (productItem) {
        const productKey = productItem.getAttribute('data-product-key');
        if (productKey) {
          // Verificar si el producto está pagado
          const isPaid = itemState.productPaidStatus[productKey] || false;
          
          // Si está pagado, no permitir el swipe
          if (!isPaid) {
            touchStartXRef.current = e.touches[0].clientX;
            closeAllSwipes(productKey);
          }
        }
      } else if (clientItem) {
        const clientId = clientItem.getAttribute('data-client-id');
        if (clientId) {
          clientTouchStartXRef.current = e.touches[0].clientX;
          closeAllSwipes(clientId);
        }
      }
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      if (touchStartXRef.current !== null) {
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
      
      if (clientTouchStartXRef.current !== null) {
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
      if (touchStartXRef.current !== null) {
        const target = e.target as HTMLElement;
        const productItem = target.closest('[data-product-key]') as HTMLElement;
        
        if (productItem) {
          const productKey = productItem.getAttribute('data-product-key');
          if (productKey) {
            completeSwipeAnimation(productKey);
          }
        }
        
        touchStartXRef.current = null;
      }
      
      if (clientTouchStartXRef.current !== null) {
        const target = e.target as HTMLElement;
        const clientItem = target.closest('[data-client-id]') as HTMLElement;
        
        if (clientItem) {
          const clientId = clientItem.getAttribute('data-client-id');
          if (clientId) {
            completeClientSwipeAnimation(clientId);
          }
        }
        
        clientTouchStartXRef.current = null;
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
        setItemState(prev => ({ ...prev, editingProduct: null }));
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
  }, [itemState.editingProduct, itemState.productPaidStatus, itemState.swipeStates, itemState.clientSwipeStates]);
  
  // Cargar pedidos al montar el componente
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);
  
  const value: OrdersContextProps = {
    state,
    itemState,
    actions: {
      fetchOrders,
      setSearchTerm,
      handleToggleProductPaid,
      handleToggleAllProducts,
      handleDeleteOrder,
      handleDeleteClientOrders,
      handleEditProduct,
      handleQuantityChange,
      saveProductChanges,
      deleteProduct,
      toggleClient,
      setOrderToDelete,
      setClientToDelete,
      handleProductSwipe,
      handleClientSwipe,
      completeSwipeAnimation,
      completeClientSwipeAnimation,
      closeAllSwipes
    }
  };
  
  return (
    <OrdersContext.Provider value={value}>
      {children}
    </OrdersContext.Provider>
  );
};

// Hook para consumir el contexto
export const useOrders = () => {
  const context = useContext(OrdersContext);
  if (context === undefined) {
    throw new Error('useOrders debe usarse dentro de un OrdersProvider');
  }
  return context;
};
