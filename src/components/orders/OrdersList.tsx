
import { useState } from "react";
import { useOrders } from "@/contexts/OrdersContext";
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

export const OrdersList = () => {
  const { state, itemState, actions } = useOrders();
  const { orders, searchTerm } = state;
  const { productPaidStatus, swipeStates, clientSwipeStates, 
          editingProduct, productQuantities, openClientId, 
          orderToDelete, clientToDelete, isSaving, isDeleting } = itemState;
  
  const { 
    handleToggleProductPaid, handleToggleAllProducts, 
    handleDeleteOrder, handleDeleteClientOrders, handleEditProduct, 
    handleQuantityChange, saveProductChanges, deleteProduct, 
    toggleClient, setClientToDelete
  } = actions;

  // Organizar pedidos por cliente
  const ordersByClient: { [clientId: string]: { client: string, orders: typeof orders } } = {};
  
  orders.forEach(order => {
    if (!ordersByClient[order.clientId]) {
      ordersByClient[order.clientId] = {
        client: order.clientName,
        orders: []
      };
    }
    ordersByClient[order.clientId].orders.push(order);
  });

  // Filtrar pedidos por término de búsqueda
  const filteredOrdersByClient: typeof ordersByClient = {};
  
  if (searchTerm) {
    const searchTermLower = searchTerm.toLowerCase();
    
    Object.entries(ordersByClient).forEach(([clientId, { client, orders }]) => {
      // Buscar coincidencia en nombre de cliente
      const clientMatches = client.toLowerCase().includes(searchTermLower);
      
      // Buscar coincidencia en productos
      const hasMatchingProducts = orders.some(order => 
        order.items.some(item => 
          (item.name && item.name.toLowerCase().includes(searchTermLower)) ||
          (item.variant && item.variant.toLowerCase().includes(searchTermLower))
        )
      );
      
      if (clientMatches || hasMatchingProducts) {
        filteredOrdersByClient[clientId] = { client, orders };
      }
    });
  } else {
    // Si no hay término de búsqueda, usar todos los pedidos
    Object.assign(filteredOrdersByClient, ordersByClient);
  }

  const clientHasProducts = (clientId: string) => {
    const clientData = ordersByClient[clientId];
    if (!clientData) return false;
    
    // Verificar si hay al menos un pedido con al menos un producto
    return clientData.orders.some(order => order.items && order.items.length > 0);
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground mb-2">
        {Object.keys(filteredOrdersByClient).filter(clientId => clientHasProducts(clientId)).length} {Object.keys(filteredOrdersByClient).filter(clientId => clientHasProducts(clientId)).length === 1 ? 'cliente' : 'clientes'} con pedidos
      </div>
      
      <div className="space-y-3">
        {Object.entries(filteredOrdersByClient)
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
              setClientToDelete={setClientToDelete}
            />
          ))}
      </div>
      
      {Object.keys(filteredOrdersByClient).filter(clientId => clientHasProducts(clientId)).length === 0 && (
        <div className="text-center p-8 bg-muted/20 rounded-lg">
          <p>No hay pedidos que coincidan con la búsqueda</p>
        </div>
      )}
      
      <AlertDialog open={!!orderToDelete} onOpenChange={(open) => !open && actions.setOrderToDelete(null)}>
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
      
      <AlertDialog open={!!clientToDelete} onOpenChange={(open) => !open && actions.setClientToDelete(null)}>
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
