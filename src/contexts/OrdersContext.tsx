import { createContext, useContext, useState, useCallback, useEffect, ReactNode, useRef } from 'react';
import { Order, OrdersContextProps, OrdersState, OrderItemState, OrderItem } from '@/types';
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
    _pendingOpenClientId: null,
    orderToDelete: null,
    clientToDelete: null,
    isSaving: false,
    isDeleting: false,
    productItemRefs: {},
    clientItemRefs: {}
  });
  
  // Referencias para el manejo táctil
  const touchStartXRef = useRef<number | null>(null);
  const clientTouchStartXRef = useRef<number | null>(null);
  const productItemRefs = useRef<{[key: string]: HTMLDivElement | null}>({});
  const clientItemRefs = useRef<{[key: string]: HTMLDivElement | null}>({});
  
  // Mapeo de items de la API al formato esperado
  const mapApiItemsToOrderItems = (items: any[], productMap: {[key: string]: {name: string, price: number}}, variantMap: {[key: string]: {name: string, price: number}}): OrderItem[] => {
    return items.map(item => {
      const productInfo = productMap[item.product_id] || { name: 'Producto', price: 0 };
      const variantInfo = item.variant_id ? variantMap[item.variant_id] || { name: 'Variante', price: 0 } : undefined;
      
      return {
        id: item.id,
        product_id: item.product_id,
        name: productInfo.name,
        variant: item.variant_id ? variantInfo.name : undefined,
        variant_id: item.variant_id || undefined,
        quantity: item.quantity,
        price: item.price || (variantInfo ? variantInfo.price : productInfo.price),
        total: item.total,
        is_paid: item.is_paid
      };
    });
  };
  
  // Funciones para actualizar los pedidos
  const fetchOrders = useCallback(async (refresh = false) => {
    if (refresh) {
      setState(prev => ({ ...prev, isRefreshing: true }));
    } else {
      setState(prev => ({ ...prev, isLoading: true }));
    }
    setState(prev => ({ ...prev, error: null }));
    
    try {
      console.log("Iniciando fetch de pedidos...");
      
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (ordersError) {
        throw ordersError;
      }

      if (ordersData && ordersData.length > 0) {
        console.log(`Obtenidos ${ordersData.length} pedidos`);
        
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
        
        console.log(`Obtenidos ${orderItemsData?.length || 0} items de pedidos`);

        const productIds = orderItemsData?.map(item => item.product_id) || [];
        const { data: productsData, error: productsError } = productIds.length > 0 
          ? await supabase
              .from('products')
              .select('id, name, price')
              .in('id', productIds)
          : { data: [], error: null };
          
        if (productsError) {
          throw productsError;
        }
        
        console.log(`Obtenidos ${productsData?.length || 0} productos`);
        
        const variantIds = orderItemsData?.filter(item => item.variant_id).map(item => item.variant_id) || [];
        let variantsData = [];
        
        if (variantIds.length > 0) {
          const { data: variants, error: variantsError } = await supabase
            .from('product_variants')
            .select('id, name, price')
            .in('id', variantIds);
            
          if (variantsError) {
            throw variantsError;
          }
          
          variantsData = variants || [];
          console.log(`Obtenidas ${variantsData.length} variantes`);
        }

        const productMap: { [key: string]: {name: string, price: number} } = {};
        productsData?.forEach(product => {
          productMap[product.id] = {
            name: product.name,
            price: product.price || 0
          };
        });
        
        const variantMap: { [key: string]: {name: string, price: number} } = {};
        variantsData?.forEach(variant => {
          variantMap[variant.id] = {
            name: variant.name,
            price: variant.price || 0
          };
        });
        
        console.log("Mapas de productos y variantes creados:", {
          productMap: Object.keys(productMap).length,
          variantMap: Object.keys(variantMap).length
        });

        const orderItemsMap: { [key: string]: OrderItem[] } = {};
        if (orderItemsData) {
          orderItemsData.forEach(item => {
            if (!orderItemsMap[item.order_id]) {
              orderItemsMap[item.order_id] = [];
            }
            
            const productInfo = productMap[item.product_id] || { name: 'Producto', price: 0 };
            const variantInfo = item.variant_id ? variantMap[item.variant_id] || { name: 'Variante', price: 0 } : undefined;
            
            const mappedItem: OrderItem = {
              id: item.id,
              product_id: item.product_id,
              name: productInfo.name,
              variant: item.variant_id ? variantInfo.name : undefined,
              variant_id: item.variant_id || undefined,
              quantity: item.quantity,
              price: item.price || (variantInfo ? variantInfo.price : productInfo.price),
              total: item.total,
              is_paid: item.is_paid
            };
            
            orderItemsMap[item.order_id].push(mappedItem);
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
          
          console.log(`Transformados ${transformedOrders.length} pedidos con sus items`);
          
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

  // Manejadores para los swipes y referencias
  const handleProductSwipe = useCallback((productKey: string, deltaX: number) => {
    // Limitar el deslizamiento entre 0 y -140 (70px por cada botón)
    const newSwipeX = Math.max(-140, Math.min(0, deltaX));
    
    setItemState(prev => ({
      ...prev,
      swipeStates: {
        ...prev.swipeStates,
        [productKey]: newSwipeX
      }
    }));
  }, []);

  const handleClientSwipe = useCallback((clientId: string, deltaX: number) => {
    // Limitar el deslizamiento entre 0 y -70 (tamaño del botón de eliminar)
    const newSwipeX = Math.max(-70, Math.min(0, deltaX));
    
    setItemState(prev => ({
      ...prev,
      clientSwipeStates: {
        ...prev.clientSwipeStates,
        [clientId]: newSwipeX
      }
    }));
  }, []);

  const completeSwipeAnimation = useCallback((productKey: string) => {
    setItemState(prev => {
      const currentSwipe = prev.swipeStates[productKey] || 0;
      
      // Si el deslizamiento es más de la mitad (-70), completar el deslizamiento
      if (currentSwipe < -70) {
        return {
          ...prev,
          swipeStates: {
            ...prev.swipeStates,
            [productKey]: -140
          }
        };
      } 
      // Si está entre 0 y la mitad, volver a 0
      else if (currentSwipe > -70 && currentSwipe < 0) {
        return {
          ...prev,
          swipeStates: {
            ...prev.swipeStates,
            [productKey]: 0
          }
        };
      }
      return prev;
    });
  }, []);

  const completeClientSwipeAnimation = useCallback((clientId: string) => {
    setItemState(prev => {
      const currentSwipe = prev.clientSwipeStates[clientId] || 0;
      
      // Si el deslizamiento es más de la mitad (-35), completar el deslizamiento
      if (currentSwipe < -35) {
        return {
          ...prev,
          clientSwipeStates: {
            ...prev.clientSwipeStates,
            [clientId]: -70
          }
        };
      } 
      // Si está entre 0 y la mitad, volver a 0
      else if (currentSwipe > -35 && currentSwipe < 0) {
        return {
          ...prev,
          clientSwipeStates: {
            ...prev.clientSwipeStates,
            [clientId]: 0
          }
        };
      }
      return prev;
    });
  }, []);

  const closeAllSwipes = useCallback((exceptKey?: string) => {
    setItemState(prev => {
      const newSwipeStates = { ...prev.swipeStates };
      const newClientSwipeStates = { ...prev.clientSwipeStates };
      
      Object.keys(newSwipeStates).forEach(key => {
        if (key !== exceptKey) {
          newSwipeStates[key] = 0;
        }
      });
      
      Object.keys(newClientSwipeStates).forEach(key => {
        if (key !== exceptKey) {
          newClientSwipeStates[key] = 0;
        }
      });
      
      return {
        ...prev,
        swipeStates: newSwipeStates,
        clientSwipeStates: newClientSwipeStates
      };
    });
  }, []);

  const registerProductRef = useCallback((key: string, ref: HTMLDivElement | null) => {
    productItemRefs.current[key] = ref;
  }, []);

  const registerClientRef = useCallback((key: string, ref: HTMLDivElement | null) => {
    clientItemRefs.current[key] = ref;
  }, []);
  
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
  
  // Actualizar cantidad de producto
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
    closeAllSwipes();
    
    setItemState(prev => ({
      ...prev,
      editingProduct: productKey,
      productQuantities: {
        ...prev.productQuantities,
        [productKey]: currentQuantity
      }
    }));
  };

  const handleQuantityChange = (productKey: string, newQuantity: number) => {
    setItemState(prev => ({
      ...prev,
      productQuantities: {
        ...prev.productQuantities,
        [productKey]: Math.max(1, newQuantity)
      }
    }));
  };

  // Actualización de productos
  const updateOrderTotal = async (orderId: string) => {
    try {
      const { data: items, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId);
      
      if (itemsError) throw itemsError;
      
      // Obtener información de productos para asociar nombres
      const productIds = items?.map(item => item.product_id) || [];
      let productsData: any[] = [];
      let variantsData: any[] = [];
      
      if (productIds.length > 0) {
        const { data: prods, error: productsError } = await supabase
          .from('products')
          .select('id, name')
          .in('id', productIds);
          
        if (productsError) throw productsError;
        productsData = prods || [];
        
        // También obtener variantes
        const variantIds = items?.filter(item => item.variant_id).map(item => item.variant_id) || [];
        if (variantIds.length > 0) {
          const { data: vars, error: variantsError } = await supabase
            .from('product_variants')
            .select('id, name')
            .in('id', variantIds);
            
          if (variantsError) throw variantsError;
          variantsData = vars || [];
        }
      }
      
      // Crear mapas para lookup rápido
      const productMap: { [key: string]: string } = {};
      productsData.forEach(product => {
        productMap[product.id] = product.name;
      });
      
      const variantMap: { [key: string]: string } = {};
      variantsData.forEach(variant => {
        variantMap[variant.id] = variant.name;
      });
      
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
      
      // Actualizar estado local
      setState(prev => ({
        ...prev,
        orders: prev.orders.map(order => {
          if (order.id === orderId) {
            // Mapear items con nombres
            const mappedItems = items ? mapApiItemsToOrderItems(items, productMap, variantMap) : [];
            
            return {
              ...order,
              total: newTotal,
              amountPaid: amountPaid,
              balance: newBalance,
              items: mappedItems
            };
          }
          return order;
        })
      }));
      
    } catch (error) {
      console.error("Error al actualizar el total del pedido:", error);
      throw error;
    }
  };

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
      
      // Actualizar total del pedido
      await updateOrderTotal(orderId);
      
      toast({
        title: "Producto actualizado",
        description: `Cantidad actualizada a ${newQuantity}`,
        variant: "default"
      });
      
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
        swipeStates: Object.keys(prev.swipeStates).reduce((acc, key) => {
          acc[key] = 0;
          return acc;
        }, {} as {[key: string]: number})
      }));
    }
  };

  const deleteProduct = async (productKey: string, orderId: string, itemId: string) => {
    setItemState(prev => ({ ...prev, isSaving: true }));
    try {
      const { error } = await supabase
        .from('order_items')
        .delete()
        .eq('id', itemId);
        
      if (error) throw error;
      
      // Actualizar total del pedido
      await updateOrderTotal(orderId);
      
      toast({
        title: "Producto eliminado",
        description: "El producto ha sido eliminado del pedido",
        variant: "default"
      });
      
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
  
  // Toggle para abrir/cerrar el panel de cliente
  const toggleClient = (clientId: string) => {
    setItemState(prev => {
      // Si hay un cliente abierto y es diferente del que queremos abrir, cerrarlo primero
      if (prev.openClientId && prev.openClientId !== clientId) {
        return {
          ...prev,
          _pendingOpenClientId: clientId,  // Guardar temporalmente el cliente que queremos abrir
          openClientId: null              // Cerrar el cliente actual
        };
      } else {
        // Si no hay cliente abierto o es el mismo, simplemente toggle
        return {
          ...prev,
          openClientId: prev.openClientId === clientId ? null : clientId
        };
      }
    });
  };
  
  // Efecto para abrir el cliente pendiente después de cerrar el actual
  useEffect(() => {
    if (itemState._pendingOpenClientId && !itemState.openClientId) {
      const timer = setTimeout(() => {
        setItemState(prev => ({
          ...prev,
          openClientId: prev._pendingOpenClientId,
          _pendingOpenClientId: null
        }));
      }, 50); // Pequeño delay para permitir la animación de cierre
      
      return () => clearTimeout(timer);
    }
  }, [itemState.openClientId, itemState._pendingOpenClientId]);
  
  // Utilidades para actualizar el estado de eliminación
  const setOrderToDelete = (orderId: string | null) => {
    setItemState(prev => ({ ...prev, orderToDelete: orderId }));
  };
  
  const setClientToDelete = (clientId: string | null) => {
    setItemState(prev => ({ ...prev, clientToDelete: clientId }));
  };
  
  // Cargar pedidos al montar el componente
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);
  
  // Valores a exportar en el contexto
  const contextValue: OrdersContextProps = {
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
      closeAllSwipes,
      registerProductRef,
      registerClientRef
    }
  };
  
  return (
    <OrdersContext.Provider value={contextValue}>
      {children}
    </OrdersContext.Provider>
  );
};

// Hook personalizado para usar el contexto
export const useOrders = () => {
  const context = useContext(OrdersContext);
  if (context === undefined) {
    throw new Error('useOrders debe usarse dentro de un OrdersProvider');
  }
  return context;
};
