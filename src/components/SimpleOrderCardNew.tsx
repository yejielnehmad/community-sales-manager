
import { HelpCircle, Check, AlertCircle, ChevronDown, User } from 'lucide-react';
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
import { useState } from 'react';
import { Input } from '@/components/ui/input';

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
 * v1.0.1
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
  
  // Verificamos si hay información faltante
  const hasMissingInfo = !order.client.id || order.items.some(item => !item.product.id || item.status === 'duda' || !item.quantity);
  const hasClientProblem = !order.client.id || order.client.matchConfidence !== 'alto';
  
  // Preparamos el mensaje de duda principal
  const mainIssue = order.items.find(item => item.status === 'duda');
  let issueMessage = "";
  
  if (mainIssue) {
    if (!mainIssue.product.id) {
      issueMessage = "¿Qué producto pidió?";
    } else if (mainIssue.product.name && !mainIssue.variant?.id) {
      issueMessage = `¿Qué variante de ${mainIssue.product.name} pidió ${order.client.name}?`;
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
      
      const updatedItems = [...order.items];
      updatedItems[itemIndex] = {
        ...updatedItems[itemIndex],
        product: {
          id: selectedProduct.id,
          name: selectedProduct.name,
          price: selectedProduct.price
        },
        status: hasVariants && !updatedItems[itemIndex].variant?.id ? 'duda' as const : 'confirmado' as const,
        notes: hasVariants && !updatedItems[itemIndex].variant?.id ? 
          `¿Qué variante de ${selectedProduct.name}?` : 
          updatedItems[itemIndex].notes
      };
      
      const updatedOrder = {
        ...order,
        items: updatedItems
      };
      onUpdate(updatedOrder);
    }
  };
  
  // Handler para actualizar variante
  const handleVariantUpdate = (itemIndex: number, variantId: string) => {
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
  };
  
  // Handler para actualizar cantidad
  const handleQuantityUpdate = (itemIndex: number, quantity: number) => {
    const updatedItems = [...order.items];
    updatedItems[itemIndex] = {
      ...updatedItems[itemIndex],
      quantity,
      status: updatedItems[itemIndex].product.id ? 
        (updatedItems[itemIndex].product.id && !updatedItems[itemIndex].variant?.id ? 'duda' as const : 'confirmado' as const) 
        : 'duda' as const
    };
    
    const updatedOrder = {
      ...order,
      items: updatedItems
    };
    onUpdate(updatedOrder);
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
              const hasProductIssue = !item.product.id || item.status === 'duda';
              const itemProduct = item.product.id ? products.find(p => p.id === item.product.id) : null;
              const hasVariants = itemProduct?.variants && itemProduct.variants.length > 0;
              const hasVariantIssue = hasVariants && !item.variant?.id;
              const hasQuantityIssue = !item.quantity;
              
              return (
                <div key={itemIndex} className={cn(
                  "p-2 rounded-md text-sm",
                  hasProductIssue || hasVariantIssue || hasQuantityIssue ? "bg-amber-50" : "bg-green-50"
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
                      <Badge variant={hasVariantIssue || hasQuantityIssue ? "outline" : "secondary"} 
                        className={cn(
                          hasVariantIssue || hasQuantityIssue 
                            ? "bg-amber-50 text-amber-700 border-amber-200" 
                            : "bg-green-50 text-green-700 border-green-200"
                        )}
                      >
                        {hasVariantIssue || hasQuantityIssue ? (
                          <>
                            <AlertCircle size={12} className="mr-1" />
                            {hasVariantIssue ? "Falta variante" : "Falta cantidad"}
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
                  
                  {/* Selección de variante */}
                  {hasVariantIssue && (
                    <div className="mt-2">
                      <div className="text-xs font-medium mb-1 text-amber-700">
                        Selecciona una variante:
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {itemProduct?.variants.map((variant) => (
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
                </div>
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
