
import { useMemo, useEffect } from 'react';
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
  
  // Registrar el estado de los pedidos cuando cambie y guardar en sessionStorage
  useEffect(() => {
    if (orders.length > 0) {
      // Log para debug
      logDebug('OrdersList', `Se han detectado ${orders.length} pedidos para mostrar`);
      
      // Registro para propósitos de depuración
      logStateOperation('load', 'ordersContext', true, { 
        ordersCount: orders.length, 
        clientsCount: Object.keys(clientMap).length 
      });
      
      // Guardar en sessionStorage para persistencia entre navegaciones
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
  
  // Ordenar y agrupar pedidos por cliente
  const ordersByClient = useMemo(() => {
    // Log para debug
    logDebug('OrdersList', `Procesando ${orders.length} pedidos para visualización`);
    
    // Filtrar pedidos por término de búsqueda
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
    
    // Agrupar por cliente
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
  
  // Verificar si hay pedidos válidos para agregar
  const hasValidOrders = useMemo(() => {
    return orders.length > 0 && orders.some(order => 
      order.status !== 'saved' && 
      order.clientId && 
      !order.items.some(item => !item.productId)
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
      
      {/* Modal de confirmación para eliminar pedido */}
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
      
      {/* Modal de confirmación para eliminar cliente */}
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
