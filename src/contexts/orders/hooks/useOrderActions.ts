
import { useCallback } from 'react';
import { Order } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { 
  updateProductPaymentStatus, 
  updateAllProductsPaymentStatus, 
  deleteOrder, 
  updateOrderTotal, 
  updateProductQuantity, 
  deleteProductFromOrder,
  saveNewOrder
} from '../services/ordersService';

export const useOrderActions = (
  state: { 
    orders: Order[],
    clientMap: { [key: string]: { name: string } }
  },
  setState: React.Dispatch<React.SetStateAction<any>>,
  itemState: any,
  setItemState: React.Dispatch<React.SetStateAction<any>>,
  fetchOrders: (refresh?: boolean) => Promise<void>
) => {
  const { toast } = useToast();

  const handleToggleProductPaid = useCallback(async (productKey: string, orderId: string, itemId: string, isPaid: boolean) => {
    try {
      setItemState(prev => ({ ...prev, isSaving: true }));
      
      setItemState(prev => ({
        ...prev,
        productPaidStatus: {
          ...prev.productPaidStatus,
          [productKey]: isPaid
        }
      }));
      
      const order = state.orders.find(o => o.id === orderId);
      if (!order) {
        throw new Error("Pedido no encontrado");
      }
      
      const item = order.items.find(item => item.id === itemId);
      if (!item) {
        throw new Error("Producto no encontrado");
      }
      
      let newAmountPaid = 0;
      order.items.forEach(orderItem => {
        const itemKey = `${orderItem.name || 'Producto'}_${orderItem.variant || ''}_${order.id}`;
        const isItemPaid = itemKey === productKey 
          ? isPaid 
          : (itemState.productPaidStatus[itemKey] || false);
        
        if (isItemPaid) {
          newAmountPaid += orderItem.price * orderItem.quantity;
        }
      });
      
      newAmountPaid = Math.round(newAmountPaid * 100) / 100;
      const newBalance = Math.max(0, order.total - newAmountPaid);
      
      await updateProductPaymentStatus(orderId, itemId, isPaid, newAmountPaid, newBalance);
      
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
  }, [itemState.productPaidStatus, setItemState, setState, state.orders, toast]);
  
  const handleToggleAllProducts = useCallback(async (clientId: string, isPaid: boolean) => {
    try {
      setItemState(prev => ({ ...prev, isSaving: true }));
      
      const clientOrders = state.orders.filter(order => order.clientId === clientId);
      
      if (clientOrders.length === 0) {
        throw new Error("No se encontraron pedidos para este cliente");
      }
      
      const clientProducts: { [key: string]: boolean } = {};
      
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
      
      await updateAllProductsPaymentStatus(clientOrders, isPaid);
      
      setState(prev => ({
        ...prev,
        orders: prev.orders.map(order => {
          if (order.clientId === clientId) {
            const orderTotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            return { 
              ...order, 
              total: orderTotal,
              amountPaid: isPaid ? orderTotal : 0, 
              balance: isPaid ? 0 : orderTotal 
            };
          }
          return order;
        })
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
      
      fetchOrders(true);
    } finally {
      setItemState(prev => ({ ...prev, isSaving: false }));
    }
  }, [fetchOrders, setItemState, setState, state.clientMap, state.orders, toast]);
  
  const handleDeleteOrder = useCallback(async () => {
    const { orderToDelete } = itemState;
    if (!orderToDelete) return;
    
    setItemState(prev => ({ ...prev, isDeleting: true }));
    try {
      await deleteOrder(orderToDelete);
      
      toast({
        title: "Pedido eliminado",
        description: "El pedido ha sido eliminado correctamente",
        variant: "default"
      });
      
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
  }, [itemState, setItemState, setState, toast]);
  
  const handleDeleteClientOrders = useCallback(async () => {
    const { clientToDelete } = itemState;
    if (!clientToDelete) return;
    
    setItemState(prev => ({ ...prev, isDeleting: true }));
    try {
      const clientOrders = state.orders.filter(order => order.clientId === clientToDelete);
      const orderIds = clientOrders.map(order => order.id);
      
      for (const orderId of orderIds) {
        await deleteOrder(orderId);
      }
      
      toast({
        title: "Pedidos eliminados",
        description: `Todos los pedidos del cliente ${state.clientMap[clientToDelete]?.name || 'seleccionado'} han sido eliminados`,
        variant: "default"
      });
      
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
  }, [itemState, setItemState, setState, state.clientMap, state.orders, toast]);
  
  const saveProductChanges = useCallback(async (productKey: string, orderId: string, itemId: string) => {
    const newQuantity = itemState.productQuantities[productKey] || 1;
    
    setItemState(prev => ({ ...prev, isSaving: true }));
    
    try {
      const { price } = await updateProductQuantity(itemId, newQuantity);
      await updateOrderTotal(orderId);
      
      // Actualizar estado local para reflejar la nueva cantidad
      setState(prev => ({
        ...prev,
        orders: prev.orders.map(order => {
          if (order.id === orderId) {
            return {
              ...order,
              items: order.items.map(item => {
                if (item.id === itemId) {
                  return {
                    ...item,
                    quantity: newQuantity,
                    total: price * newQuantity
                  };
                }
                return item;
              })
            };
          }
          return order;
        })
      }));
      
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
  }, [itemState.productQuantities, setItemState, setState, toast]);
  
  const saveVariantChanges = useCallback(async (variantKey: string, orderId: string, itemId: string) => {
    const newQuantity = itemState.variantQuantities[variantKey] || 1;
    
    setItemState(prev => ({ ...prev, isSaving: true }));
    
    try {
      const { price } = await updateProductQuantity(itemId, newQuantity);
      await updateOrderTotal(orderId);
      
      // Actualizar estado local para reflejar la nueva cantidad
      setState(prev => ({
        ...prev,
        orders: prev.orders.map(order => {
          if (order.id === orderId) {
            return {
              ...order,
              items: order.items.map(item => {
                if (item.id === itemId) {
                  return {
                    ...item,
                    quantity: newQuantity,
                    total: price * newQuantity
                  };
                }
                return item;
              })
            };
          }
          return order;
        })
      }));
      
      toast({
        title: "Variante actualizada",
        description: `Cantidad actualizada a ${newQuantity}`,
        variant: "default"
      });
      
    } catch (error: any) {
      console.error("Error al actualizar la variante:", error);
      toast({
        title: "Error",
        description: error.message || "Error al actualizar la variante",
        variant: "destructive",
      });
    } finally {
      setItemState(prev => ({ 
        ...prev, 
        isSaving: false,
        editingVariant: null,
        variantSwipeStates: Object.keys(prev.variantSwipeStates).reduce((acc, key) => {
          acc[key] = 0;
          return acc;
        }, {} as {[key: string]: number})
      }));
    }
  }, [itemState.variantQuantities, setItemState, setState, toast]);
  
  const deleteProduct = useCallback(async (productKey: string, orderId: string, itemId: string) => {
    setItemState(prev => ({ ...prev, isSaving: true }));
    try {
      await deleteProductFromOrder(itemId);
      await updateOrderTotal(orderId);
      
      // Actualizar el estado local
      setState(prev => ({
        ...prev,
        orders: prev.orders.map(order => {
          if (order.id === orderId) {
            return {
              ...order,
              items: order.items.filter(item => item.id !== itemId)
            };
          }
          return order;
        })
      }));
      
      // Eliminar estado de pago del producto eliminado
      setItemState(prev => {
        const newPaidStatus = { ...prev.productPaidStatus };
        delete newPaidStatus[productKey];
        
        return {
          ...prev,
          productPaidStatus: newPaidStatus
        };
      });
      
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
  }, [setItemState, setState, toast]);
  
  const deleteVariant = useCallback(async (variantKey: string, orderId: string, itemId: string) => {
    setItemState(prev => ({ ...prev, isSaving: true }));
    try {
      await deleteProductFromOrder(itemId);
      await updateOrderTotal(orderId);
      
      // Actualizar el estado local
      setState(prev => ({
        ...prev,
        orders: prev.orders.map(order => {
          if (order.id === orderId) {
            return {
              ...order,
              items: order.items.filter(item => item.id !== itemId)
            };
          }
          return order;
        })
      }));
      
      toast({
        title: "Variante eliminada",
        description: "La variante ha sido eliminada del pedido",
        variant: "default"
      });
      
    } catch (error: any) {
      console.error("Error al eliminar la variante:", error);
      toast({
        title: "Error",
        description: error.message || "Error al eliminar la variante",
        variant: "destructive",
      });
    } finally {
      setItemState(prev => ({ 
        ...prev, 
        isSaving: false,
        variantSwipeStates: {
          ...prev.variantSwipeStates,
          [variantKey]: 0
        }
      }));
    }
  }, [setItemState, setState, toast]);
  
  const handleAddAllOrders = useCallback(async () => {
    try {
      toast({
        title: "Procesando pedidos",
        description: "Guardando todos los pedidos válidos...",
        variant: "default"
      });
      
      // Obtener pedidos válidos (los que no tienen problemas de identificación)
      const validOrders = state.orders.filter(order => 
        order.status === 'pending' && 
        order.clientId && 
        !order.items.some(item => !item.product_id)
      );
      
      if (validOrders.length === 0) {
        toast({
          title: "No hay pedidos válidos",
          description: "No se encontraron pedidos que se puedan guardar automáticamente",
          variant: "destructive"
        });
        return;
      }
      
      let successCount = 0;
      
      for (const order of validOrders) {
        try {
          await saveNewOrder(order);
          successCount++;
        } catch (error) {
          console.error("Error al guardar un pedido:", error);
          continue;
        }
      }
      
      if (successCount > 0) {
        toast({
          title: "Pedidos guardados",
          description: `Se ${successCount === 1 ? 'ha' : 'han'} guardado ${successCount} pedido${successCount === 1 ? '' : 's'} correctamente`,
          variant: "success"
        });
        
        // Actualizar la lista de pedidos
        fetchOrders(true);
      } else {
        toast({
          title: "Error al guardar",
          description: "No se pudo guardar ningún pedido",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error("Error al guardar todos los pedidos:", error);
      toast({
        title: "Error",
        description: error.message || "Error al guardar los pedidos",
        variant: "destructive"
      });
    }
  }, [fetchOrders, state.orders, toast]);

  return {
    handleToggleProductPaid,
    handleToggleAllProducts,
    handleDeleteOrder,
    handleDeleteClientOrders,
    saveProductChanges,
    saveVariantChanges,
    deleteProduct,
    deleteVariant,
    handleAddAllOrders
  };
};
