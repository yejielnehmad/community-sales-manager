
import { useMemo, useEffect, useCallback } from 'react';
import { useOrders } from '@/contexts/OrdersContext';
import { ClientOrderCardNew } from './ClientOrderCardNew';
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
import { logStateOperation, logDebug } from '@/lib/debug-utils';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

export const OrdersList = () => {
  const { state, itemState, actions } = useOrders();
  
  const {
    orders,
    searchTerm,
    clientMap
  } = state;
  
  const {
    productPaidStatus,
    swipeStates,
    variantSwipeStates,
    editingProduct,
    editingVariant,
    productQuantities,
    variantQuantities,
    openClientId,
    orderToDelete,
    clientToDelete,
    isSaving,
    isDeleting,
    clientSwipeStates
  } = itemState;
  
  const {
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
  } = actions;
  
  // Limpiador de datos residuales
  const clearResidualData = useCallback(() => {
    // Eliminar cualquier dato residual relacionado con análisis anteriores
    const keysToRemove = [];
    
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && (
        key.startsWith('magicOrder_analysis') || 
        key.includes('phase') ||
        key.includes('rawJson')
      )) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => {
      sessionStorage.removeItem(key);
    });
    
    if (keysToRemove.length > 0) {
      console.log(`OrdersList: Eliminados ${keysToRemove.length} elementos residuales de análisis`);
    }
  }, []);
  
  // Limpiar datos residuales al montar el componente
  useEffect(() => {
    clearResidualData();
    
    // Escuchar eventos de reinicio de estado
    const handleStateReset = () => {
      clearResidualData();
    };
    
    window.addEventListener('ordersStateReset', handleStateReset);
    window.addEventListener('analysisStateReset', handleStateReset);
    
    return () => {
      window.removeEventListener('ordersStateReset', handleStateReset);
      window.removeEventListener('analysisStateReset', handleStateReset);
    };
  }, [clearResidualData]);
  
  useEffect(() => {
    if (orders.length > 0) {
      logDebug('OrdersList', `Se han detectado ${orders.length} pedidos para mostrar`);
      
      logStateOperation('load', 'ordersContext', true, { 
        ordersCount: orders.length, 
        clientsCount: Object.keys(clientMap).length 
      });
      
      try {
        const ordersData = {
          orders,
          clientMap,
          timestamp: new Date().toISOString()
        };
        
        sessionStorage.setItem('magicOrder_ordersData', JSON.stringify(ordersData));
        logDebug('State', 'Datos de pedidos guardados en sessionStorage', { 
          ordersCount: orders.length 
        });
      } catch (error) {
        logDebug('State', 'Error al guardar datos de pedidos en sessionStorage', error);
      }
    }
  }, [orders.length, orders, clientMap]);
  
  const ordersByClient = useMemo(() => {
    logDebug('OrdersList', `Procesando ${orders.length} pedidos para visualización`);
    
    const filteredOrders = searchTerm
      ? orders.filter(order => {
          const clientNameMatch = order.clientName.toLowerCase().includes(searchTerm.toLowerCase());
          const productMatch = order.items.some(item => 
            (item.name?.toLowerCase().includes(searchTerm.toLowerCase())) || 
            (item.variant?.toLowerCase().includes(searchTerm.toLowerCase()))
          );
          return clientNameMatch || productMatch;
        })
      : orders;
    
    return filteredOrders.reduce((acc, order) => {
      if (!acc[order.clientId]) {
        acc[order.clientId] = {
          clientName: order.clientName,
          orders: []
        };
      }
      acc[order.clientId].orders.push(order);
      return acc;
    }, {} as {[key: string]: {clientName: string, orders: typeof orders}});
  }, [orders, searchTerm]);
  
  const hasValidOrders = useMemo(() => {
    return orders.length > 0 && orders.some(order => 
      order.status !== 'pending' && 
      order.clientId && 
      !order.items.some(item => !item.product_id)
    );
  }, [orders]);
  
  return (
    <div>
      {Object.keys(ordersByClient).length === 0 ? (
        <div className="text-center p-8 bg-muted/20 rounded-lg">
          {searchTerm ? (
            <p className="text-muted-foreground">No se encontraron resultados para "{searchTerm}"</p>
          ) : (
            <p className="text-muted-foreground">No hay pedidos registrados</p>
          )}
        </div>
      ) : (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm text-muted-foreground">
              {Object.keys(ordersByClient).length} {Object.keys(ordersByClient).length === 1 ? 'cliente' : 'clientes'} con pedidos
            </div>
            
            {hasValidOrders && (
              <Button 
                onClick={handleAddAllOrders}
                disabled={isSaving}
                size="sm"
                className="flex items-center gap-1"
              >
                <PlusCircle className="h-4 w-4" />
                Agregar todos los pedidos
              </Button>
            )}
          </div>
          
          {Object.entries(ordersByClient).map(([clientId, { clientName, orders }]) => (
            <ClientOrderCardNew
              key={clientId}
              clientId={clientId}
              clientName={clientName}
              orders={orders}
              openClientId={openClientId}
              toggleClient={toggleClient}
              handleToggleAllProducts={handleToggleAllProducts}
              productPaidStatus={productPaidStatus}
              swipeStates={swipeStates}
              variantSwipeStates={variantSwipeStates}
              editingProduct={editingProduct}
              editingVariant={editingVariant}
              productQuantities={productQuantities}
              variantQuantities={variantQuantities}
              isSaving={isSaving}
              handleToggleProductPaid={handleToggleProductPaid}
              handleEditProduct={handleEditProduct}
              handleEditVariant={handleEditVariant}
              handleQuantityChange={handleQuantityChange}
              handleVariantQuantityChange={handleVariantQuantityChange}
              saveProductChanges={saveProductChanges}
              saveVariantChanges={saveVariantChanges}
              deleteProduct={deleteProduct}
              deleteVariant={deleteVariant}
              setClientToDelete={setClientToDelete}
            />
          ))}
        </div>
      )}
      
      <AlertDialog open={!!orderToDelete} onOpenChange={() => !isDeleting && setOrderToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar pedido?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El pedido será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteOrder}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600"
            >
              {isDeleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog open={!!clientToDelete} onOpenChange={() => !isDeleting && setClientToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar todos los pedidos?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Todos los pedidos de {clientToDelete ? clientMap[clientToDelete]?.name : 'este cliente'} serán eliminados permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteClientOrders}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600"
            >
              {isDeleting ? 'Eliminando...' : 'Eliminar todos los pedidos'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
