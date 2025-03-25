import { useState, useEffect, useMemo } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, DollarSign, ShoppingCart, Trash, Package, CircleCheck } from "lucide-react";
import { Order } from '@/types';
import { Switch } from "@/components/ui/switch";
import { ProductItemNew } from "./ProductItemNew";
import { Badge } from "@/components/ui/badge";
import { useSwipe } from "@/hooks/use-swipe";
import { SwipeActionButton } from "@/components/ui/swipe-action-button";
import { PriceDisplay } from "@/components/ui/price-display";

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
  const { swipeX, resetSwipe, getMouseProps, getTouchProps } = useSwipe({
    maxSwipe: -55, // Reducido a -55 para que no se desplace tanto
    onSwipeEnd: (completed) => {
      if (!completed) {
        resetSwipe();
      }
    }
  });
  
  // Calcular el balance del cliente
  const total = useMemo(() => {
    return orders.reduce((sum, order) => {
      const orderTotal = order.items.reduce((itemSum, item) => {
        return itemSum + (item.price || 0) * (item.quantity || 1);
      }, 0);
      return sum + orderTotal;
    }, 0);
  }, [orders]);

  const paid = useMemo(() => {
    return orders.reduce((sum, order) => {
      const orderPaid = order.items.reduce((itemSum, item) => {
        const itemKey = `${item.name || 'Producto'}_${item.variant || ''}_${order.id}`;
        const isPaid = productPaidStatus[itemKey] === true;
        return itemSum + (isPaid ? (item.price || 0) * (item.quantity || 1) : 0);
      }, 0);
      return sum + orderPaid;
    }, 0);
  }, [orders, productPaidStatus]);
  
  const balance = total - paid;
  
  // Calcular el porcentaje de pago (para la barra de progreso visual)
  const paymentPercentage = total > 0 ? Math.min(100, (paid / total) * 100) : 0;
  
  // Agrupar productos por nombre base (sin variantes)
  const productGroups = useMemo(() => {
    const productMap: {[key: string]: {
      id?: string,
      name: string,
      // Extraemos nombre base (ej: "Pañales" de "Pañales G")
      baseName: string,
      variants?: {
        id?: string,
        name: string,
        variant: string,
        quantity: number,
        price: number,
        total: number,
        orderId: string,
        isPaid: boolean
      }[],
      totalUnits: number,
      totalPrice: number
    }} = {};
    
    // Función para extraer el nombre base del producto
    const getBaseName = (fullName: string) => {
      // Patrones comunes como "Producto X", "Producto Talla X", etc.
      const patterns = [
        /^(.+?)(?:\s+[XSML]$)/i, // Para tallas X, S, M, L
        /^(.+?)(?:\s+(?:Grande|Mediano|Pequeño)$)/i, // Para descripciones de tamaño en español
        /^(.+?)(?:\s+(?:G|M|P)$)/i, // Para abreviaturas G, M, P
        /^(.+?)(?:\s+\d+$)/i, // Para productos con números al final
      ];
      
      for (const pattern of patterns) {
        const match = fullName.match(pattern);
        if (match && match[1]) {
          return match[1].trim();
        }
      }
      
      // Si no coincide con ningún patrón, devolver el nombre completo
      return fullName;
    };
    
    orders.forEach(order => {
      order.items.forEach(item => {
        // Extraer el nombre base del producto
        const productName = item.name || 'Producto';
        const baseName = getBaseName(productName);
        
        // Clave para agrupar productos del mismo tipo
        const groupKey = baseName;
        
        if (!productMap[groupKey]) {
          productMap[groupKey] = {
            name: baseName,
            baseName: baseName,
            variants: [],
            totalUnits: 0,
            totalPrice: 0
          };
        }
        
        // Determinar si este ítem es una variante
        const isVariant = productName !== baseName || item.variant;
        const variantName = isVariant ? (item.variant || productName) : '';
        
        // Generar la clave única para este producto
        const itemUniqueKey = `${item.name || 'Producto'}_${item.variant || ''}_${order.id}`;
        
        // Obtener el estado de pago actual
        const isPaid = productPaidStatus[itemUniqueKey] === true;
        
        // Verificar si esta variante ya existe en el grupo
        const existingVariantIndex = productMap[groupKey].variants?.findIndex(
          v => v.variant === variantName
        );
        
        if (existingVariantIndex !== undefined && existingVariantIndex >= 0) {
          // La variante ya existe, actualizar cantidad y total
          const variant = productMap[groupKey].variants![existingVariantIndex];
          variant.quantity += (item.quantity || 1);
          variant.total = variant.price * variant.quantity;
          // Si alguno no está pagado, marcamos como no pagado
          if (!isPaid) {
            variant.isPaid = false;
          }
        } else {
          // Agregar la variante al grupo
          productMap[groupKey].variants?.push({
            id: item.id,
            name: item.name || 'Producto',
            variant: variantName || baseName,
            quantity: item.quantity || 1,
            price: item.price || 0,
            total: (item.price || 0) * (item.quantity || 1),
            orderId: order.id,
            isPaid: isPaid
          });
        }
        
        // Actualizar totales del grupo
        productMap[groupKey].totalUnits += (item.quantity || 1);
        productMap[groupKey].totalPrice += (item.price || 0) * (item.quantity || 1);
      });
    });
    
    return productMap;
  }, [orders, productPaidStatus]);
  
  // Verificar si hay productos
  const hasProducts = Object.keys(productGroups).length > 0;
  
  // Verificar si todos los productos están pagados
  const areAllProductsPaid = useMemo(() => {
    // Verificar todos los productos/variantes
    return Object.values(productGroups).every(group => {
      return group.variants?.every(variant => {
        const itemKey = `${variant.name}_${variant.variant || ''}_${variant.orderId}`;
        return productPaidStatus[itemKey] === true;
      });
    });
  }, [productGroups, productPaidStatus]);
  
  // Estado calculado para saber si todos los productos están pagados
  const isPaid = areAllProductsPaid;
  
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

  // Determinar si se puede hacer swipe en la tarjeta principal
  const isSwipeEnabled = openClientId !== clientId;
  
  return (
    <div 
      className="relative rounded-xl overflow-hidden mb-3 shadow-sm hover:shadow-md transition-shadow"
      data-client-id={clientId}
      style={{ zIndex: 1 }}
    >
      {/* Botón de acción en el background con altura completa */}
      <div 
        className="absolute inset-y-0 right-0 flex items-stretch h-full overflow-hidden rounded-r-xl"
        style={{ width: '55px', zIndex: 1 }}
      >
        <SwipeActionButton
          variant="destructive"
          icon={<Trash className="h-5 w-5" />}
          onClick={() => setClientToDelete(clientId)}
          label="Eliminar cliente"
          className="rounded-r-xl"
        />
      </div>
      
      {/* Contenido principal de la tarjeta del cliente */}
      <div 
        {...(isSwipeEnabled ? {...getMouseProps(), ...getTouchProps()} : {})}
        className={`border overflow-hidden transition-all duration-200 rounded-xl bg-background relative shadow-sm ${isSwipeEnabled ? 'cursor-grab active:cursor-grabbing' : ''}`}
        style={{ 
          transform: `translateX(${swipeX}px)`,
          transition: 'transform 0.3s ease-out',
          zIndex: swipeX === 0 ? 10 : 5,
          touchAction: 'pan-y'
        }}
      >
        <Collapsible 
          open={openClientId === clientId} 
          onOpenChange={() => toggleClient(clientId)}
        >
          <CollapsibleTrigger className="w-full text-left">
            <div className="p-3 flex justify-between items-center bg-card hover:bg-muted/10">
              <div className="flex items-center gap-2">
                <div className="font-semibold text-base">
                  {clientName}
                  {isPaid && (
                    <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-200">
                      Pagado
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="text-right flex items-center gap-1">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <div className="font-medium">
                    <span className={`${balance > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                      <PriceDisplay value={Math.round(balance)} showPrefix={false} />
                    </span>
                    <span className="text-xs text-muted-foreground ml-1">
                      /<PriceDisplay value={Math.round(total)} showPrefix={false} />
                    </span>
                  </div>
                </div>
                <div className="h-6 w-6 rounded-full flex items-center justify-center bg-muted/20">
                  {openClientId === clientId ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </div>
            </div>
            
            {/* Barra de progreso de pago */}
            <div className="h-1.5 w-full bg-gray-100">
              <div 
                className="h-1.5 bg-green-500 transition-all duration-500"
                style={{ width: `${paymentPercentage}%` }}
              />
            </div>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <div className="bg-card/25 p-3">
              <div className="flex justify-between items-center mb-2">
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
                <div className="space-y-2">
                  {/* Renderizamos una tarjeta por cada grupo de productos con el nuevo formato */}
                  {Object.entries(productGroups).map(([baseProductName, group], productIndex) => {
                    // Para cada producto principal (ej: "Leche")
                    // Verificar si todas las variantes están pagadas
                    const allVariantsPaid = group.variants?.every(v => {
                      const itemKey = `${v.name}_${v.variant || ''}_${v.orderId}`;
                      return productPaidStatus[itemKey];
                    });

                    // Calcular el precio total del grupo
                    const groupTotal = group.totalPrice || 0;

                    return (
                      <div key={baseProductName} className="border rounded-lg overflow-hidden bg-card shadow-sm">
                        {/* Nuevo formato de tarjeta basado en la imagen */}
                        <div className="grid grid-cols-[1fr,2fr,1fr] items-stretch">
                          {/* Columna 1: Nombre del producto */}
                          <div className="p-3 border-r flex items-center">
                            <div className="font-bold text-lg">
                              {group.baseName}
                            </div>
                          </div>
                          
                          {/* Columna 2: Variantes con precios y cantidades */}
                          <div className="p-3 flex flex-col justify-center space-y-2">
                            {group.variants?.map((variant, idx) => {
                              const itemKey = `${variant.name}_${variant.variant || ''}_${variant.orderId}`;
                              const isPaid = productPaidStatus[itemKey] === true;
                              
                              return (
                                <div key={idx} className="flex justify-between items-center">
                                  <div className="flex items-baseline gap-2">
                                    <span className="font-medium">{variant.variant}</span>
                                    <span className="text-sm">X</span>
                                    <span className="font-medium">{variant.quantity}</span>
                                    <span className="text-sm">=</span>
                                  </div>
                                  <PriceDisplay 
                                    value={Math.round(variant.price * variant.quantity)} 
                                    className={`font-medium ${isPaid ? 'text-green-600' : ''}`}
                                  />
                                </div>
                              );
                            })}
                          </div>
                          
                          {/* Columna 3: Total y switch de pago */}
                          <div className="p-3 border-l flex flex-col items-center justify-center bg-muted/10">
                            <div className="font-bold text-lg mb-2">
                              <PriceDisplay value={Math.round(groupTotal)} />
                            </div>
                            <Switch
                              checked={allVariantsPaid}
                              onCheckedChange={(checked) => {
                                // Marcar todas las variantes del grupo
                                group.variants?.forEach(v => {
                                  const itemKey = `${v.name}_${v.variant || ''}_${v.orderId}`;
                                  handleToggleProductPaid(itemKey, v.orderId, v.id || '', checked);
                                });
                              }}
                              disabled={isSaving}
                              className="data-[state=checked]:bg-green-500 h-6 w-12"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-background rounded-lg p-3 text-center text-muted-foreground text-sm">
                  No hay productos en este pedido
                </div>
              )}
              
              <div className="mt-3 p-2 flex justify-between items-center bg-primary/5 rounded-lg">
                <div className="font-medium text-sm">Total Cliente:</div>
                <div className="text-base font-semibold">
                  <PriceDisplay value={Math.round(total)} />
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
};
