
import { useState, useEffect, useMemo } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, DollarSign, ShoppingCart, Trash } from "lucide-react";
import { Order } from "@/types";
import { Switch } from "@/components/ui/switch";
import { ProductItem } from "./ProductItem";
import { Badge } from "@/components/ui/badge";

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
  // Estado local para controlar la animación del switch principal
  const [isPaidAnimating, setIsPaidAnimating] = useState(false);
  
  // Calcular el balance del cliente
  const total = orders.reduce((sum, order) => sum + order.total, 0);
  const paid = orders.reduce((sum, order) => sum + order.amountPaid, 0);
  const balance = total - paid;
  
  // Calcular el porcentaje de pago (para la barra de progreso visual)
  const paymentPercentage = total > 0 ? Math.min(100, (paid / total) * 100) : 0;
  
  // Organizar productos por pedido - AGRUPANDO VARIANTES
  const productGroups = useMemo(() => {
    // Usamos un mapa para agrupar productos por nombre
    const productMap: {[productName: string]: {
      id?: string,
      name: string, 
      variant?: string, 
      quantity: number,
      price: number,
      total: number,
      orderId: string,
      variants?: Array<{
        variant: string,
        quantity: number, 
        id?: string,
        price?: number,
        total?: number
      }>
    }} = {};
    
    orders.forEach(order => {
      order.items.forEach(item => {
        const productName = item.name || 'Producto';
        
        // Si este producto aún no existe en el mapa, inicializarlo
        if (!productMap[productName]) {
          productMap[productName] = {
            id: item.id,
            name: productName,
            quantity: 0,
            price: item.price || 0,
            total: 0,
            orderId: order.id,
            variants: []
          };
        }
        
        // Agregar la variante, si existe
        if (item.variant) {
          // Verificar si esta variante ya existe
          const existingVariantIndex = productMap[productName].variants?.findIndex(
            v => v.variant === item.variant
          );
          
          if (existingVariantIndex !== undefined && existingVariantIndex >= 0 && productMap[productName].variants) {
            // La variante ya existe, incrementar cantidad
            productMap[productName].variants[existingVariantIndex].quantity += (item.quantity || 1);
            if (productMap[productName].variants[existingVariantIndex].total !== undefined) {
              productMap[productName].variants[existingVariantIndex].total! += (item.price || 0) * (item.quantity || 1);
            }
          } else {
            // La variante no existe, agregarla
            productMap[productName].variants?.push({
              variant: item.variant,
              quantity: item.quantity || 1,
              id: item.id,
              price: item.price,
              total: (item.price || 0) * (item.quantity || 1)
            });
          }
        } else {
          // Si no hay variante, sumar directamente a la cantidad del producto
          productMap[productName].quantity += (item.quantity || 1);
        }
        
        // Actualizar totales
        productMap[productName].total += (item.price || 0) * (item.quantity || 1);
      });
    });
    
    // Convertir el mapa a un objeto con claves compuestas
    const result: {[key: string]: typeof productMap[string]} = {};
    Object.entries(productMap).forEach(([name, product]) => {
      const key = `${name}_${product.orderId}`;
      result[key] = product;
    });
    
    return result;
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

  // Determinar si se puede hacer swipe en la tarjeta principal
  // Solo permitir swipe cuando la tarjeta está cerrada (no expandida)
  const isSwipeable = openClientId !== clientId;
  
  return (
    <div 
      className="relative rounded-xl overflow-hidden mb-3 shadow-sm hover:shadow-md transition-shadow"
      data-client-id={clientId}
      ref={(ref) => registerClientRef(clientId, ref)}
      style={{ zIndex: 5 }}
    >
      {/* Botón de acción en el background con altura completa */}
      <div 
        className="absolute inset-y-0 right-0 flex items-stretch h-full overflow-hidden rounded-r-xl"
        style={{ width: '55px', zIndex: 1 }}
      >
        <button 
          className="client-action-button h-full w-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors"
          onClick={() => setClientToDelete(clientId)}
          aria-label="Eliminar cliente"
        >
          <Trash className="h-5 w-5" />
        </button>
      </div>
      
      {/* Contenido principal de la tarjeta del cliente */}
      <div 
        className="border overflow-hidden transition-all duration-200 rounded-xl bg-background relative shadow-sm"
        style={{ 
          transform: `translateX(${clientSwipeX}px)`,
          transition: 'transform 0.3s ease-out',
          zIndex: clientSwipeX === 0 ? 10 : 5,
          pointerEvents: isSwipeable ? 'all' : 'none' // Deshabilitar interacción cuando está abierto
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
              ) : (
                <div className="bg-background rounded-lg p-4 text-center text-muted-foreground text-sm">
                  No hay productos registrados para este cliente
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
