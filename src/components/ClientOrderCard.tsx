
import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, DollarSign, ShoppingCart, Trash } from "lucide-react";
import { Order } from "@/types";
import { Switch } from "@/components/ui/switch";
import { ProductItem } from "./ProductItem";

interface ClientOrderCardProps {
  clientId: string;
  clientName: string;
  orders: Order[];
  clientSwipeX: number;
  openClientId: string | null;
  toggleClient: (clientId: string) => void;
  handleToggleAllProducts: (clientId: string, isPaid: boolean) => void;
  productPaidStatus: { [key: string]: boolean };
  swipeStates: { [key: string]: number };
  editingProduct: string | null;
  productQuantities: { [key: string]: number };
  isSaving: boolean;
  handleToggleProductPaid: (productKey: string, orderId: string, itemId: string, isPaid: boolean) => void;
  handleEditProduct: (productKey: string, currentQuantity: number, isPaid: boolean) => void;
  handleQuantityChange: (productKey: string, newQuantity: number) => void;
  saveProductChanges: (productKey: string, orderId: string, itemId: string) => void;
  deleteProduct: (productKey: string, orderId: string, itemId: string) => void;
  registerProductRef: (key: string, ref: HTMLDivElement | null) => void;
  registerClientRef: (key: string, ref: HTMLDivElement | null) => void;
  setClientToDelete: (clientId: string) => void;
}

export const ClientOrderCard = ({
  clientId,
  clientName,
  orders,
  clientSwipeX,
  openClientId,
  toggleClient,
  handleToggleAllProducts,
  productPaidStatus,
  swipeStates,
  editingProduct,
  productQuantities,
  isSaving,
  handleToggleProductPaid,
  handleEditProduct,
  handleQuantityChange,
  saveProductChanges,
  deleteProduct,
  registerProductRef,
  registerClientRef,
  setClientToDelete
}: ClientOrderCardProps) => {
  // Calcular el balance del cliente
  const total = orders.reduce((sum, order) => sum + order.total, 0);
  const paid = orders.reduce((sum, order) => sum + order.amountPaid, 0);
  const balance = total - paid;
  const isPaid = paid >= total * 0.99;

  // Organizar productos por pedido
  const getClientProducts = () => {
    const productGroups: {[key: string]: {
      id?: string,
      name: string, 
      variant?: string, 
      quantity: number,
      price: number,
      total: number,
      orderId: string
    }} = {};
    
    orders.forEach(order => {
      order.items.forEach(item => {
        const key = `${item.name || 'Producto'}_${item.variant || ''}_${order.id}`;
        if (!productGroups[key]) {
          productGroups[key] = {
            id: item.id,
            name: item.name || 'Producto',
            variant: item.variant,
            quantity: 0,
            price: item.price || 0,
            total: 0,
            orderId: order.id
          };
        }
        productGroups[key].quantity += (item.quantity || 1);
        productGroups[key].total = productGroups[key].price * productGroups[key].quantity;
      });
    });
    
    return productGroups;
  };

  const productGroups = getClientProducts();
  
  return (
    <div 
      className="relative rounded-xl overflow-hidden mb-3"
      data-client-id={clientId}
      ref={(ref) => registerClientRef(clientId, ref)}
    >
      {/* Botón de acción en el background con altura completa */}
      <div 
        className="absolute inset-y-0 right-0 flex items-stretch h-full overflow-hidden rounded-r-xl"
        style={{ width: '55px' }}
      >
        <button 
          className="client-action-button h-full w-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors"
          onClick={() => setClientToDelete(clientId)}
        >
          <Trash className="h-5 w-5" />
        </button>
      </div>
      
      {/* Contenido principal de la tarjeta del cliente */}
      <div 
        className="border overflow-hidden transition-all duration-200 rounded-xl z-10 bg-background relative shadow-sm"
        style={{ 
          transform: `translateX(${clientSwipeX}px)`,
          transition: 'transform 0.3s ease-out',
          zIndex: clientSwipeX === 0 ? 10 : 5
        }}
      >
        <Collapsible 
          open={openClientId === clientId} 
          onOpenChange={() => toggleClient(clientId)}
        >
          <CollapsibleTrigger className="w-full text-left">
            <div className="p-4 flex justify-between items-center bg-card hover:bg-muted/10">
              <div className="flex items-center gap-2">
                <div className="font-medium text-lg">
                  {clientName}
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="text-right flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <div className="font-medium">
                    <span className={`${balance > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                      ${balance > 0 ? balance.toFixed(2) : '0.00'}
                    </span>
                    <span className="text-xs text-muted-foreground ml-1">
                      /${total.toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="h-7 w-7 rounded-full flex items-center justify-center bg-muted/20">
                  {openClientId === clientId ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </div>
            </div>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <div className="bg-card/25 p-4">
              <div className="flex justify-between items-center mb-3">
                <div className="font-medium text-sm flex items-center gap-2">
                  <ShoppingCart className="h-3.5 w-3.5 text-primary" />
                  Productos
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Marcar todo como pagado</span>
                  <Switch
                    checked={isPaid}
                    onCheckedChange={(checked) => handleToggleAllProducts(clientId, checked)}
                    disabled={isSaving}
                    className="data-[state=checked]:bg-green-500 h-4 w-7"
                  />
                </div>
              </div>
              
              <div className="bg-background rounded-lg divide-y divide-gray-100">
                {Object.entries(productGroups).map(([key, product], index) => {
                  const isPaid = productPaidStatus[key] || false;
                  const swipeX = swipeStates[key] || 0;
                  
                  return (
                    <ProductItem
                      key={key}
                      productKey={key}
                      product={product}
                      isPaid={isPaid}
                      isLastItem={index === Object.keys(productGroups).length - 1}
                      isFirstItem={index === 0}
                      swipeX={swipeX}
                      isSaving={isSaving}
                      editingProduct={editingProduct}
                      productQuantities={productQuantities}
                      onDeleteProduct={deleteProduct}
                      onEditProduct={handleEditProduct}
                      onSaveProductChanges={saveProductChanges}
                      onQuantityChange={handleQuantityChange}
                      onToggleProductPaid={handleToggleProductPaid}
                      registerRef={registerProductRef}
                    />
                  );
                })}
              </div>
              
              <div className="mt-3 flex justify-end items-center">
                <div className="text-sm font-medium">
                  Total:
                  <span className="ml-1">
                    ${total.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
};
