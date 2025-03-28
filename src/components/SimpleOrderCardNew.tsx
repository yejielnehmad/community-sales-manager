
import { HelpCircle, Check, AlertCircle, ChevronDown, User, Edit, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OrderCard as OrderCardType, MessageItem } from '@/types';
import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { APP_VERSION } from '@/lib/app-config';

interface SimpleOrderCardProps {
  order: OrderCardType;
  clients: any[];
  products: any[];
  onUpdate: (updatedOrder: OrderCardType) => void;
  index: number;
  onDelete: () => void;
}

/**
 * Componente de tarjeta de pedido simplificada basada en el diseño proporcionado
 * v1.0.46
 */
export const SimpleOrderCardNew = ({ 
  order, 
  clients, 
  products, 
  onUpdate, 
  index,
  onDelete
}: SimpleOrderCardProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [customQuantity, setCustomQuantity] = useState<number | null>(null);
  const [isLoadingVariants, setIsLoadingVariants] = useState<{[key: number]: boolean}>({});
  
  // Verificamos si hay información faltante - MODIFICADO para corregir la validación
  // Un pedido está incompleto si: no tiene cliente, la confianza del cliente no es alta,
  // o hay algún ítem que no tiene producto, cantidad, o está marcado como 'duda' y no tiene variante cuando requiere una
  const hasMissingInfo = !order.client.id || 
    order.client.matchConfidence !== 'alto' || 
    order.items.some(item => {
      // Si no tiene producto o cantidad, está incompleto
      if (!item.product.id || !item.quantity) return true;
      
      // Si está en estado de duda, verificamos si es por falta de variante
      if (item.status === 'duda') {
        // Verificar si el producto requiere variante
        const productInfo = products.find(p => p.id === item.product.id);
        const requiresVariant = productInfo?.variants && productInfo.variants.length > 0;
        
        // Si requiere variante y no tiene una seleccionada, está incompleto
        if (requiresVariant && !item.variant?.id) return true;
        
        // Si no requiere variante pero sigue en 'duda', hay otro problema
        return true;
      }
      
      return false;
    });
  
  const hasClientProblem = !order.client.id || order.client.matchConfidence !== 'alto';
  
  // Preparamos el mensaje de duda principal
  const mainIssue = order.items.find(item => item.status === 'duda');
  let issueMessage = "";
  
  if (mainIssue) {
    if (!mainIssue.product.id) {
      issueMessage = "¿Qué producto pidió?";
    } else if (mainIssue.product.name && !mainIssue.variant?.id) {
      // Verificamos si el producto requiere variante
      const productInfo = products.find(p => p.id === mainIssue.product.id);
      if (productInfo && productInfo.variants && productInfo.variants.length > 0) {
        issueMessage = mainIssue.notes || `¿Qué variante de ${mainIssue.product.name} pidió ${order.client.name}?`;
      } else {
        issueMessage = mainIssue.notes || "Requiere confirmación";
      }
    } else if (!mainIssue.quantity) {
      issueMessage = `¿Qué cantidad de ${mainIssue.product.name} pidió ${order.client.name}?`;
    } else {
      issueMessage = mainIssue.notes || "Requiere confirmación";
    }
  } else {
    issueMessage = hasClientProblem ? "Cliente no identificado" : "Pedido completo";
  }

  // Handler para actualizar cliente
  const handleClientUpdate = (clientId: string) => {
    const selectedClient = clients.find(c => c.id === clientId);
    if (selectedClient) {
      const updatedOrder = {
        ...order,
        client: {
          id: selectedClient.id,
          name: selectedClient.name,
          matchConfidence: 'alto' as 'alto' | 'medio' | 'bajo'
        }
      };
      onUpdate(updatedOrder);
    }
  };
  
  // Handler para actualizar producto
  const handleProductUpdate = (itemIndex: number, productId: string) => {
    const selectedProduct = products.find(p => p.id === productId);
    if (selectedProduct) {
      const hasVariants = selectedProduct.variants && selectedProduct.variants.length > 0;
      
      // Simular carga de variantes
      setIsLoadingVariants(prev => ({ ...prev, [itemIndex]: true }));
      
      setTimeout(() => {
        const updatedItems = [...order.items];
        updatedItems[itemIndex] = {
          ...updatedItems[itemIndex],
          product: {
            id: selectedProduct.id,
            name: selectedProduct.name,
            price: selectedProduct.price
          },
          status: hasVariants ? 'duda' as const : 'confirmado' as const,
          notes: hasVariants ? 
            `¿Qué variante de ${selectedProduct.name}?` : 
            updatedItems[itemIndex].notes
        };
        
        const updatedOrder = {
          ...order,
          items: updatedItems
        };
        onUpdate(updatedOrder);
        setIsLoadingVariants(prev => ({ ...prev, [itemIndex]: false }));
      }, 300); // Simulamos una pequeña carga
    }
  };
  
  // Handler para actualizar variante
  const handleVariantUpdate = (itemIndex: number, variantId: string) => {
    setIsLoadingVariants(prev => ({ ...prev, [itemIndex]: true }));
    
    setTimeout(() => {
      const item = order.items[itemIndex];
      const itemProduct = item.product.id ? products.find(p => p.id === item.product.id) : null;
      
      if (itemProduct && itemProduct.variants) {
        const selectedVariant = itemProduct.variants.find(v => v.id === variantId);
        if (selectedVariant) {
          const updatedItems = [...order.items];
          updatedItems[itemIndex] = {
            ...updatedItems[itemIndex],
            variant: {
              id: selectedVariant.id,
              name: selectedVariant.name,
              price: selectedVariant.price
            },
            status: 'confirmado' as const
          };
          
          const updatedOrder = {
            ...order,
            items: updatedItems
          };
          onUpdate(updatedOrder);
        }
      } else {
        // Búsqueda de la variante en todos los productos
        for (const product of products) {
          if (product.variants) {
            const variant = product.variants.find(v => v.id === variantId);
            if (variant) {
              // Asignar automáticamente el producto basado en la variante
              const updatedItems = [...order.items];
              updatedItems[itemIndex] = {
                ...updatedItems[itemIndex],
                product: {
                  id: product.id,
                  name: product.name,
                  price: product.price
                },
                variant: {
                  id: variant.id,
                  name: variant.name,
                  price: variant.price
                },
                status: 'confirmado' as const
              };
              
              const updatedOrder = {
                ...order,
                items: updatedItems
              };
              onUpdate(updatedOrder);
              break;
            }
          }
        }
      }
      
      setIsLoadingVariants(prev => ({ ...prev, [itemIndex]: false }));
    }, 300);
  };
  
  // Handler para actualizar cantidad
  const handleQuantityUpdate = (itemIndex: number, quantity: number) => {
    const updatedItems = [...order.items];
    const item = updatedItems[itemIndex];
    
    // Verificar si el producto tiene variantes y requiere selección
    const productInfo = item.product.id ? products.find(p => p.id === item.product.id) : null;
    const requiresVariant = productInfo && productInfo.variants && productInfo.variants.length > 0 && !item.variant?.id;
    
    updatedItems[itemIndex] = {
      ...item,
      quantity,
      status: !item.product.id ? 'duda' as const : 
              requiresVariant ? 'duda' as const : 
              'confirmado' as const
    };
    
    const updatedOrder = {
      ...order,
      items: updatedItems
    };
    onUpdate(updatedOrder);
  };

  // Handler para resolver issues por notas o ambigüedades
  const handleResolveIssue = (itemIndex: number) => {
    const updatedItems = [...order.items];
    const item = updatedItems[itemIndex];
    
    // Verificar primero si el producto tiene variantes y no se ha seleccionado una
    const productInfo = item.product.id ? products.find(p => p.id === item.product.id) : null;
    const requiresVariant = productInfo && productInfo.variants && productInfo.variants.length > 0 && !item.variant?.id;
    
    // Si requiere variante, no permitir marcar como correcto
    if (requiresVariant) {
      return;
    }
    
    // Si estamos editando la cantidad, aplicar ese valor
    if (customQuantity !== null && editingItemIndex === itemIndex) {
      updatedItems[itemIndex] = {
        ...item,
        quantity: customQuantity,
        status: 'confirmado' as const,
        notes: '' // Limpiamos las notas ya que la duda fue resuelta
      };
      
      setCustomQuantity(null);
      setEditingItemIndex(null);
    } else {
      // Si no estamos editando, simplemente marcar como resuelto
      updatedItems[itemIndex] = {
        ...item,
        status: 'confirmado' as const,
        notes: '' // Limpiamos las notas ya que marcamos como resuelto manualmente
      };
    }
    
    const updatedOrder = {
      ...order,
      items: updatedItems
    };
    onUpdate(updatedOrder);
  };

  // Función para mostrar una interfaz de edición para un ítem con dudas
  const renderIssueEditor = (item: MessageItem, itemIndex: number) => {
    // Si el problema es relacionado con cantidades o contiene palabras clave de cantidad
    const isQuantityIssue = 
      item.notes?.toLowerCase().includes('cantidad') ||
      item.notes?.toLowerCase().includes('cuánto') ||
      item.notes?.toLowerCase().includes('cuántos') ||
      item.notes?.toLowerCase().includes('cuántas');

    // Verificar si el producto requiere variante y si tiene una seleccionada
    const productInfo = item.product.id ? products.find(p => p.id === item.product.id) : null;
    const hasVariants = productInfo?.variants && productInfo.variants.length > 0;
    const needsVariantSelection = hasVariants && !item.variant?.id;

    if (isQuantityIssue || !item.quantity) {
      return (
        <div className="mt-2">
          <div className="text-xs font-medium mb-1 text-amber-700">
            Corregir cantidad:
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="1"
              className="w-24 h-8 border-amber-300 bg-amber-50 text-amber-800"
              placeholder="Cantidad"
              value={customQuantity !== null ? customQuantity : item.quantity || ''}
              onChange={(e) => setCustomQuantity(parseInt(e.target.value) || 0)}
              onFocus={() => setEditingItemIndex(itemIndex)}
            />
            {!needsVariantSelection && (
              <Button 
                size="sm" 
                variant="outline" 
                className="h-8 border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                onClick={() => handleResolveIssue(itemIndex)}
              >
                <Check className="h-3 w-3 mr-1" />
                Confirmar
              </Button>
            )}
          </div>
        </div>
      );
    }

    // Para dudas genéricas sin opciones específicas
    return (
      <div className="mt-2">
        <div className="text-xs font-medium mb-1 text-amber-700">
          Opciones de resolución:
        </div>
        <div className="flex flex-wrap gap-2">
          {!needsVariantSelection && (
            <Button 
              size="sm" 
              variant="outline" 
              className="h-8 border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
              onClick={() => handleResolveIssue(itemIndex)}
              disabled={needsVariantSelection}
            >
              <Check className="h-3 w-3 mr-1" />
              Marcar como correcto
            </Button>
          )}
          <Button 
            size="sm" 
            variant="outline" 
            className="h-8 border-red-300 bg-red-50 text-red-800 hover:bg-red-100"
            onClick={onDelete}
          >
            Eliminar pedido
          </Button>
        </div>
      </div>
    );
  };
  
  return (
    <Card className={cn(
      "overflow-hidden transition-all duration-200 mb-2 border rounded-md",
      hasMissingInfo ? "border-amber-300 shadow-sm" : "border-green-300 shadow-sm"
    )}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="grid grid-cols-12 border-b">
          {/* Columna del cliente */}
          <div className="col-span-3 border-r p-2 flex items-center justify-center bg-primary/5">
            {order.client.id ? (
              <div className="font-medium text-sm flex items-center gap-1">
                <User className="h-4 w-4 text-primary/70" />
                {order.client.name}
              </div>
            ) : (
              <Select onValueChange={handleClientUpdate}>
                <SelectTrigger className="w-[160px] h-8 border-amber-300 bg-amber-50 text-amber-800 text-xs">
                  <SelectValue placeholder="Seleccionar cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          
          {/* Columna del mensaje/duda */}
          <CollapsibleTrigger className="col-span-8 text-left p-2 flex items-center cursor-pointer">
            <div className="flex-1">
              {hasMissingInfo ? (
                <div className="flex items-center text-amber-700 text-sm">
                  <HelpCircle className="h-4 w-4 mr-1 text-amber-500" />
                  {issueMessage}
                </div>
              ) : (
                <div className="flex items-center text-green-700 text-sm">
                  <Check className="h-4 w-4 mr-1 text-green-500" />
                  Pedido completo
                </div>
              )}
            </div>
          </CollapsibleTrigger>
          
          {/* Botón de expandir */}
          <div className="col-span-1 flex items-center justify-center border-l">
            <CollapsibleTrigger className="h-full w-full flex items-center justify-center">
              <ChevronDown className="h-4 w-4 transition-transform ui-open:rotate-180" />
            </CollapsibleTrigger>
          </div>
        </div>
        
        <CollapsibleContent>
          <div className="p-3 space-y-3">
            {order.items.map((item, itemIndex) => {
              // Lógica para determinar el estado del ítem
              const productInfo = item.product.id ? products.find(p => p.id === item.product.id) : null;
              const hasVariants = productInfo?.variants && productInfo.variants.length > 0;
              const hasVariantIssue = hasVariants && !item.variant?.id;
              const hasQuantityIssue = !item.quantity;
              const hasProductIssue = !item.product.id;
              
              // Un ítem necesita atención si no tiene producto, variante (cuando la requiere) o cantidad
              const needsAttention = hasProductIssue || hasVariantIssue || hasQuantityIssue || item.status === 'duda';
              
              const isLoading = isLoadingVariants[itemIndex];
              
              return (
                <div key={itemIndex} className={cn(
                  "p-2 rounded-md text-sm",
                  needsAttention ? "bg-amber-50" : "bg-green-50"
                )}>
                  <div className="flex justify-between items-center">
                    {/* Selección de producto */}
                    {!item.product.id ? (
                      <div className="flex-1">
                        <Select onValueChange={(value) => handleProductUpdate(itemIndex, value)}>
                          <SelectTrigger className="w-[200px] h-8 border-amber-300 bg-amber-50 text-amber-800">
                            <SelectValue placeholder="Seleccionar producto" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map(product => (
                              <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        {/* Alternativas sugeridas */}
                        {item.alternatives && item.alternatives.length > 0 && (
                          <div className="mt-2">
                            <div className="flex flex-wrap gap-1">
                              {item.alternatives.map((alt, altIndex) => (
                                <Badge 
                                  key={altIndex}
                                  variant="outline" 
                                  className="cursor-pointer hover:bg-accent transition-colors"
                                  onClick={() => {
                                    const selectedProduct = products.find(p => p.id === alt.id);
                                    if (selectedProduct) {
                                      handleProductUpdate(itemIndex, alt.id);
                                    }
                                  }}
                                >
                                  {alt.name}
                                </Badge>
                              ))}
                            </div>
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 w-fit mt-1">
                              <HelpCircle size={12} className="mr-1" />
                              ¿Te refieres a alguno de estos?
                            </Badge>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <span className="font-medium">{item.quantity || '?'}x </span>
                        <span className="ml-1">{item.product.name}</span>
                        {item.variant && (
                          <span className="text-muted-foreground ml-1">
                            ({item.variant.name})
                          </span>
                        )}
                      </div>
                    )}
                    
                    {/* Selección de cantidad */}
                    {hasQuantityIssue && (
                      <Input
                        type="number"
                        min="1"
                        className="w-16 h-8 border-amber-300 bg-amber-50 text-amber-800 ml-2"
                        placeholder="Cant."
                        onChange={(e) => handleQuantityUpdate(itemIndex, parseInt(e.target.value) || 0)}
                      />
                    )}
                    
                    {/* Estado */}
                    {item.product.id && (
                      <Badge variant={needsAttention ? "outline" : "secondary"} 
                        className={cn(
                          needsAttention 
                            ? "bg-amber-50 text-amber-700 border-amber-200" 
                            : "bg-green-50 text-green-700 border-green-200"
                        )}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 size={12} className="mr-1 animate-spin" />
                            Cargando...
                          </>
                        ) : needsAttention ? (
                          <>
                            <AlertCircle size={12} className="mr-1" />
                            {hasVariantIssue ? "Falta variante" : hasQuantityIssue ? "Falta cantidad" : "Requiere confirmar"}
                          </>
                        ) : (
                          <>
                            <Check size={12} className="mr-1" />
                            OK
                          </>
                        )}
                      </Badge>
                    )}
                  </div>
                  
                  {/* IMPORTANTE: Aquí mostramos las variantes disponibles si el producto las tiene y no hay una seleccionada */}
                  {hasVariantIssue && productInfo?.variants && productInfo.variants.length > 0 && (
                    <div className="mt-2">
                      <div className="text-xs font-medium mb-1 text-amber-700">
                        Selecciona una variante:
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {productInfo.variants.map((variant) => (
                          <Badge 
                            key={variant.id} 
                            variant="outline"
                            className="cursor-pointer transition-colors text-xs hover:bg-primary/10"
                            onClick={() => handleVariantUpdate(itemIndex, variant.id)}
                          >
                            {variant.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Mensaje de notas/error y editor de problemas */}
                  {item.notes && item.status === 'duda' && (
                    <>
                      <div className="mt-2 text-xs text-amber-700 flex items-center">
                        <AlertCircle size={12} className="mr-1" />
                        {item.notes}
                      </div>
                      {renderIssueEditor(item, itemIndex)}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
