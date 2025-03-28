
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
import { logStateOperation } from '@/lib/debug-utils';

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
    registerClientRef
  } = actions;
  
  // Registrar el estado de los pedidos cuando cambie para propósitos de depuración
  useEffect(() => {
    if (orders.length > 0) {
      logStateOperation('load', 'ordersContext', true, { 
        ordersCount: orders.length, 
        clientsCount: Object.keys(clientMap).length 
      });
    }
  }, [orders.length, clientMap]);
  
  // Ordenar y agrupar pedidos por cliente
  const ordersByClient = useMemo(() => {
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
          <div className="text-sm text-muted-foreground mb-2">
            {Object.keys(ordersByClient).length} {Object.keys(ordersByClient).length === 1 ? 'cliente' : 'clientes'} con pedidos
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
