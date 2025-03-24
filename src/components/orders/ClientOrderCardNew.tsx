
import { useState, useEffect, useMemo } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, DollarSign, ShoppingCart, Trash } from "lucide-react";
import { Order } from '@/types';
import { Switch } from "@/components/ui/switch";
import { ProductItemNew } from "./ProductItemNew";
import { Badge } from "@/components/ui/badge";
import { useSwipe } from "@/hooks/use-swipe";
import { SwipeActionButton } from "@/components/ui/swipe-action-button";

interface ClientOrderCardProps {
  clientId: string;
  clientName: string;
  orders: Order[];
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
  setClientToDelete: (clientId: string) => void;
}

export const ClientOrderCardNew = ({
  clientId,
  clientName,
  orders,
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
  setClientToDelete
}: ClientOrderCardProps) => {
  // Estado local para controlar la animación del switch principal
  const [isPaidAnimating, setIsPaidAnimating] = useState(false);
  
  // Usar nuestro custom hook para el swipe
  const { swipeX, resetSwipe, getMouseProps } = useSwipe({
    maxSwipe: -70,
    onSwipeEnd: (completed) => {
      if (!completed) {
        resetSwipe();
      }
    }
  });
  
  // Calcular el balance del cliente
  const total = orders.reduce((sum, order) => sum + order.total, 0);
  const paid = orders.reduce((sum, order) => sum + order.amountPaid, 0);
  const balance = total - paid;
  
  // Calcular el porcentaje de pago (para la barra de progreso visual)
  const paymentPercentage = total > 0 ? Math.min(100, (paid / total) * 100) : 0;
  
  // Organizar productos por pedido
  const productGroups = useMemo(() => {
    const groups: {[key: string]: {
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
        if (!groups[key]) {
          groups[key] = {
            id: item.id,
            name: item.name || 'Producto',
            variant: item.variant,
            quantity: 0,
            price: item.price || 0,
            total: 0,
            orderId: order.id
          };
        }
        groups[key].quantity += (item.quantity || 1);
        groups[key].total = groups[key].price * groups[key].quantity;
      });
    });
    
    return groups;
  }, [orders]);
  
  // Verificar si hay productos
  const hasProducts = Object.keys(productGroups).length > 0;
  
  // Verificar si todos los productos están pagados
  const areAllProductsPaid = useMemo(() => {
    const products = Object.keys(productGroups);
    if (products.length === 0) return false;
    
    return products.every(key => productPaidStatus[key] === true);
  }, [productGroups, productPaidStatus]);
  
  // Estado calculado para saber si todos los productos están pagados
  const isPaid = areAllProductsPaid || (paid >= total * 0.99);
  
  // Manejar el cambio del switch principal con animación
  const handleMainSwitchChange = (checked: boolean) => {
    if (hasProducts) {
      setIsPaidAnimating(true);
      handleToggleAllProducts(clientId, checked);
      
      // Desactivar la animación después de 500ms
      setTimeout(() => {
        setIsPaidAnimating(false);
      }, 500);
    }
  };
  
  // Resetear swipe cuando se abre/cierra cliente
  useEffect(() => {
    if (openClientId === clientId || openClientId === null) {
      resetSwipe();
    }
  }, [openClientId, clientId, resetSwipe]);
  
  return (
    <div 
      className="relative rounded-xl overflow-hidden mb-3 shadow-sm hover:shadow-md transition-shadow"
      data-client-id={clientId}
    >
      {/* Botón de acción en el background con altura completa */}
      <div 
        className="absolute inset-y-0 right-0 flex items-stretch h-full overflow-hidden rounded-r-xl"
        style={{ width: '70px', zIndex: 1 }}
      >
        <SwipeActionButton
          variant="destructive"
          icon={<Trash className="h-5 w-5" />}
          onClick={() => setClientToDelete(clientId)}
          label="Eliminar cliente"
        />
      </div>
      
      {/* Contenido principal de la tarjeta del cliente */}
      <div 
        {...getMouseProps()}
        className="border overflow-hidden transition-all duration-200 rounded-xl bg-background relative shadow-sm cursor-grab active:cursor-grabbing"
        style={{ 
          transform: `translateX(${swipeX}px)`,
          transition: 'transform 0.3s ease-out',
          zIndex: swipeX === 0 ? 10 : 5,
          touchAction: 'pan-y' // Permitir scroll vertical pero capturar horizontal
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
                  {isPaid && (
                    <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-200">
                      Pagado
                    </Badge>
                  )}
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
            
            {/* Barra de progreso de pago */}
            <div className="h-1 w-full bg-gray-100">
              <div 
                className="h-1 bg-green-500 transition-all duration-500"
                style={{ width: `${paymentPercentage}%` }}
              />
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
                    onCheckedChange={handleMainSwitchChange}
                    disabled={isSaving || !hasProducts}
                    className={`data-[state=checked]:bg-green-500 h-4 w-7 ${isPaidAnimating ? 'animate-pulse' : ''} ${!hasProducts ? 'opacity-50' : ''}`}
                    aria-label={isPaid ? "Marcar todo como no pagado" : "Marcar todo como pagado"}
                  />
                </div>
              </div>
              
              {hasProducts ? (
                <div className="bg-background rounded-lg divide-y divide-gray-100">
                  {Object.entries(productGroups).map(([key, product], index) => {
                    const isPaid = productPaidStatus[key] || false;
                    const swipeX = swipeStates[key] || 0;
                    
                    return (
                      <ProductItemNew
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
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="bg-background rounded-lg p-4 text-center text-muted-foreground">
                  No hay productos en este pedido
                </div>
              )}
              
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
