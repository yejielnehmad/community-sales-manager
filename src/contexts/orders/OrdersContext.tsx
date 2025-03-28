
import { createContext, useContext, useEffect, ReactNode } from 'react';
import { OrdersContextProps } from './types';
import { useOrdersState } from './hooks/useOrdersState';
import { useItemState } from './hooks/useItemState';
import { useOrderActions } from './hooks/useOrderActions';
import { logStateOperation, logDebug } from '@/lib/debug-utils';

const OrdersContext = createContext<OrdersContextProps | undefined>(undefined);

export const OrdersProvider = ({ children }: { children: ReactNode }) => {
  const { state, setState, setSearchTerm, fetchOrders } = useOrdersState();
  
  const { 
    itemState, 
    setItemState,
    handleProductSwipe,
    handleVariantSwipe,
    handleClientSwipe,
    completeSwipeAnimation,
    completeVariantSwipeAnimation,
    completeClientSwipeAnimation,
    closeAllSwipes,
    registerProductRef,
    registerClientRef,
    handleEditProduct,
    handleEditVariant,
    handleQuantityChange,
    handleVariantQuantityChange,
    toggleClient,
    setOrderToDelete,
    setClientToDelete
  } = useItemState();
  
  const {
    handleToggleProductPaid,
    handleToggleAllProducts,
    handleDeleteOrder,
    handleDeleteClientOrders,
    saveProductChanges,
    saveVariantChanges,
    deleteProduct,
    deleteVariant,
    handleAddAllOrders
  } = useOrderActions(
    state,
    setState,
    itemState,
    setItemState,
    fetchOrders
  );
  
  // Inicializar el estado de pago de los productos cuando cambian las órdenes
  useEffect(() => {
    if (state.orders.length > 0) {
      logDebug('OrdersList', `Se han detectado ${state.orders.length} pedidos para mostrar`);
      
      logStateOperation('load', 'ordersContext', true, { 
        ordersCount: state.orders.length, 
        clientsCount: Object.keys(state.clientMap).length 
      });
      
      try {
        const ordersData = {
          orders: state.orders,
          clientMap: state.clientMap,
          timestamp: new Date().toISOString()
        };
        
        sessionStorage.setItem('magicOrder_ordersData', JSON.stringify(ordersData));
        logDebug('State', 'Datos de pedidos guardados en sessionStorage', { 
          ordersCount: state.orders.length 
        });
        
        // Inicializar el estado de pago
        const initialPaidStatus: { [key: string]: boolean } = {};
        state.orders.forEach(order => {
          order.items.forEach(item => {
            const key = `${item.name || 'Producto'}_${item.variant || ''}_${order.id}`;
            initialPaidStatus[key] = item.is_paid === true;
          });
        });
        
        setItemState(prev => ({
          ...prev,
          productPaidStatus: initialPaidStatus
        }));
      } catch (error) {
        logDebug('State', 'Error al guardar datos de pedidos en sessionStorage', error);
      }
    }
  }, [state.orders, state.clientMap, setItemState]);
  
  // Cargar pedidos al montar el componente
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);
  
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
      handleEditVariant,
      handleQuantityChange,
      handleVariantQuantityChange,
      saveProductChanges,
      saveVariantChanges,
      deleteProduct,
      deleteVariant,
      toggleClient,
      setOrderToDelete,
      setClientToDelete,
      handleProductSwipe,
      handleVariantSwipe,
      handleClientSwipe,
      completeSwipeAnimation,
      completeVariantSwipeAnimation,
      completeClientSwipeAnimation,
      closeAllSwipes,
      registerProductRef,
      registerClientRef,
      handleAddAllOrders
    }
  };
  
  return (
    <OrdersContext.Provider value={contextValue}>
      {children}
    </OrdersContext.Provider>
  );
};

export const useOrders = () => {
  const context = useContext(OrdersContext);
  if (context === undefined) {
    throw new Error('useOrders debe usarse dentro de un OrdersProvider');
  }
  return context;
};
