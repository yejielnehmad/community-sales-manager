
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from '@/components/ui/collapsible';
import { 
  MessageItem, 
  MessageClient, 
  OrderCard as OrderCardType,
  MessageAlternative
} from '@/types';
import { 
  ChevronDown, 
  ChevronUp, 
  Check, 
  AlertCircle, 
  ShoppingCart, 
  User, 
  Package, 
  Info,
  CreditCard,
  Tag,
  AlertTriangle,
  HelpCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { PriceDisplay } from '@/components/ui/price-display';
import { cn } from '@/lib/utils';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface OrderCardProps {
  order: OrderCardType;
  onUpdate: (updatedOrder: OrderCardType) => void;
  onSave?: (order: OrderCardType) => Promise<boolean>;
  isPreliminary?: boolean;
  simplified?: boolean;
}

/**
 * Componente de tarjeta de pedido
 * v1.0.6
 */
export const OrderCard = ({ order, onUpdate, onSave, isPreliminary = false, simplified = false }: OrderCardProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  
  const handleItemUpdate = (index: number, updatedItem: MessageItem) => {
    const updatedItems = [...order.items];
    updatedItems[index] = updatedItem;
    onUpdate({
      ...order,
      items: updatedItems
    });
    
    console.log('Item actualizado:', updatedItem);
  };

  const handleTogglePaid = (checked: boolean) => {
    onUpdate({
      ...order,
      isPaid: checked
    });
    
    console.log('Estado de pago actualizado:', checked);
  };

  const handleSaveOrder = async () => {
    if (!onSave) return;
    
    setIsSaving(true);
    console.log('Intentando guardar pedido:', order);
    
    try {
      const success = await onSave(order);
      if (success) {
        setIsOpen(false);
        console.log('Pedido guardado con éxito');
      } else {
        console.error('Error al guardar el pedido');
      }
    } catch (error) {
      console.error('Error en handleSaveOrder:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectAlternative = (itemIndex: number, alternativeId: string) => {
    const item = order.items[itemIndex];
    if (item.alternatives) {
      const selected = item.alternatives.find(alt => alt.id === alternativeId);
      if (selected) {
        handleItemUpdate(itemIndex, {
          ...item,
          status: 'confirmado',
          variant: {
            id: selected.id,
            name: selected.name,
            price: selected.price || 0
          },
          price: selected.price || item.product.price || 0
        });
        
        console.log('Alternativa seleccionada:', selected);
      }
    }
  };

  const handleUpdateQuantity = (itemIndex: number, quantity: number) => {
    const item = order.items[itemIndex];
    handleItemUpdate(itemIndex, {
      ...item,
      quantity: quantity
    });
    
    console.log('Cantidad actualizada:', quantity);
  };

  const hasUncertainItems = order.items.some(item => item.status === 'duda');
  
  // Nuevo estilo simplificado para las tarjetas preliminares, siguiendo el diseño de la imagen
  if (simplified && isPreliminary) {
    return (
      <Card className={cn(
        "overflow-hidden transition-all duration-200 mb-2 border",
        hasUncertainItems || order.client.matchConfidence !== 'alto' 
          ? "border-amber-300" 
          : "border-green-300",
        "shadow-none hover:shadow-sm rounded-md"
      )}>
        <Collapsible defaultOpen={hasUncertainItems}>
          <div className="grid grid-cols-12 border-b">
            <div className="col-span-3 border-r p-2 flex items-center justify-center bg-primary/5">
              <div className="font-medium text-sm flex items-center gap-1">
                <User className="h-4 w-4 text-primary/70" />
                {order.client.name}
              </div>
            </div>
            
            <CollapsibleTrigger className="col-span-8 text-left p-2 flex items-center">
              <div className="flex-1">
                {hasUncertainItems && (
                  <div className="flex items-center text-amber-700 text-sm">
                    <HelpCircle className="h-4 w-4 mr-1 text-amber-500" />
                    {order.items.find(item => item.status === 'duda')?.notes || 
                      `¿Qué variante de ${order.items.find(item => item.status === 'duda')?.product.name || 'producto'}?`}
                  </div>
                )}
                {!hasUncertainItems && (
                  <div className="flex items-center text-green-700 text-sm">
                    <Check className="h-4 w-4 mr-1 text-green-500" />
                    Pedido completo
                  </div>
                )}
              </div>
            </CollapsibleTrigger>
            
            <div className="col-span-1 flex items-center justify-center border-l">
              <CollapsibleTrigger className="h-full w-full flex items-center justify-center">
                <ChevronDown className="h-4 w-4 transition-transform ui-open:rotate-180" />
              </CollapsibleTrigger>
            </div>
          </div>
          
          <CollapsibleContent>
            <div className="p-3 space-y-3">
              {order.items.map((item, index) => (
                <div key={index} className={cn(
                  "p-2 rounded-md text-sm",
                  item.status === 'duda' ? "bg-amber-50" : "bg-green-50"
                )}>
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-medium">{item.quantity}x </span>
                      <span>{item.product.name}</span>
                      {item.variant && (
                        <span className="text-muted-foreground ml-1">
                          ({item.variant.name})
                        </span>
                      )}
                    </div>
                    
                    {item.status === 'duda' ? (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                        <AlertCircle size={12} className="mr-1" />
                        Duda
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        <Check size={12} className="mr-1" />
                        OK
                      </Badge>
                    )}
                  </div>
                  
                  {item.status === 'duda' && item.alternatives && item.alternatives.length > 0 && (
                    <div className="mt-2">
                      <div className="text-xs font-medium mb-1 text-amber-700">
                        Selecciona una variante:
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {item.alternatives.map((alt) => (
                          <Badge 
                            key={alt.id} 
                            variant={item.variant?.id === alt.id ? "default" : "outline"}
                            className={cn(
                              "cursor-pointer transition-colors text-xs",
                              item.variant?.id === alt.id 
                                ? "bg-primary text-primary-foreground" 
                                : "hover:bg-primary/10"
                            )}
                            onClick={() => handleSelectAlternative(index, alt.id)}
                          >
                            {alt.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    );
  }
  
  // Vista normal/completa
  return (
    <Card className={cn(
      "mb-2 overflow-hidden transition-all duration-200 hover:shadow-md rounded-xl shadow-sm relative",
      hasUncertainItems || order.client.matchConfidence !== 'alto' 
        ? "border-amber-200" 
        : "border-green-200"
    )}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full text-left">
          <div className="p-4 flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="font-medium text-lg">{order.client.name}</div>
              {order.client.matchConfidence && order.client.matchConfidence !== 'alto' && (
                <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                  <User className="h-3 w-3 mr-1" />
                  Coincidencia: {order.client.matchConfidence}
                </Badge>
              )}
              {order.status === 'saved' && (
                <Badge className="bg-green-500 text-white">
                  <Check className="h-3 w-3 mr-1" />
                  Guardado
                </Badge>
              )}
              {hasUncertainItems && (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                  <AlertCircle size={12} className="mr-1" />
                  Requiere confirmación
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3">
              {!isPreliminary && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-2">
                        <Switch 
                          checked={order.isPaid} 
                          onCheckedChange={handleTogglePaid}
                          disabled={order.status === 'saved'}
                          className="data-[state=checked]:bg-green-500"
                        />
                        <CreditCard className={`h-4 w-4 ${order.isPaid ? 'text-green-500' : 'text-muted-foreground'}`} />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>{order.isPaid ? 'Pedido pagado' : 'Marcar como pagado'}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <div className="h-8 w-8 rounded-full flex items-center justify-center bg-muted/20">
                {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </div>
            </div>
          </div>
        </CollapsibleTrigger>
        
        <div className="px-4 py-2 bg-muted/10 border-t border-b">
          <div className="text-sm text-muted-foreground flex items-center gap-1">
            <ShoppingCart size={14} />
            {order.items.length} {order.items.length === 1 ? 'producto' : 'productos'}
            {hasUncertainItems && (
              <span className="ml-2 text-amber-600">
                <AlertCircle size={14} className="inline mr-1" />
                Requiere atención
              </span>
            )}
          </div>
        </div>

        <CollapsibleContent>
          <CardContent className="pt-3">
            <div className="space-y-3">
              {order.items.map((item, index) => {                
                return (
                  <div key={index} className={cn(
                    "relative overflow-hidden rounded-md border",
                    item.status === 'duda' ? "border-amber-300 bg-amber-50/30" : "border-gray-200"
                  )}>
                    <div className="p-3">
                      <div className="grid grid-cols-12 gap-1">
                        <div className="col-span-3 bg-primary/5 p-2 flex items-center justify-center rounded-l-md">
                          <div className="font-medium text-sm text-center">
                            {item.product.name.split(' ')[0]}
                          </div>
                        </div>
                        
                        <div className="col-span-9 p-2">
                          <div className="flex justify-between items-center">
                            <div className="font-medium flex items-center gap-2">
                              {item.product.name}
                              {item.status === 'duda' && (
                                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                  <AlertCircle size={12} className="mr-1" />
                                  Requiere confirmar
                                </Badge>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Select 
                                value={item.quantity.toString()} 
                                onValueChange={(value) => handleUpdateQuantity(index, parseInt(value))}
                              >
                                <SelectTrigger className="w-20 h-8">
                                  <SelectValue placeholder="Cantidad" />
                                </SelectTrigger>
                                <SelectContent>
                                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                                    <SelectItem key={num} value={num.toString()}>
                                      {num}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          
                          {item.variant && (
                            <div className="text-sm mt-1">
                              <Badge variant="outline" className="ml-1 flex items-center gap-1">
                                <Tag size={12} />
                                {item.variant.name}
                              </Badge>
                            </div>
                          )}
                          
                          <div className="border-t my-1 border-gray-100"></div>
                          
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Total:</span>
                            <PriceDisplay 
                              value={(item.price || item.variant?.price || item.product.price || 0) * (item.quantity || 1)} 
                              className="font-medium"
                            />
                          </div>
                        </div>
                      </div>
                      
                      {item.notes && (
                        <div className="flex items-center mt-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <Info className="h-3.5 w-3.5" />
                                  <span>Nota: {item.notes}</span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="bottom">
                                <div className="max-w-xs p-1 text-sm">
                                  {item.notes}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      )}
                    </div>
                    
                    {item.status === 'duda' && item.alternatives && item.alternatives.length > 0 && (
                      <div className="p-3 pt-0">
                        <div className="text-sm font-medium mb-2 flex items-center">
                          <Tag size={14} className="mr-1 text-amber-700" />
                          Selecciona una variante:
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {item.alternatives.map((alt) => (
                            <Badge 
                              key={alt.id} 
                              variant={item.variant?.id === alt.id ? "default" : "outline"}
                              className={cn(
                                "cursor-pointer transition-colors",
                                item.variant?.id === alt.id 
                                  ? "bg-primary text-primary-foreground" 
                                  : "hover:bg-primary/10"
                              )}
                              onClick={() => handleSelectAlternative(index, alt.id)}
                            >
                              {alt.name} {alt.price !== undefined ? `($${alt.price.toFixed(2)})` : ''}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
          
          <CardFooter className="justify-end pt-0">
            {!isPreliminary && order.status !== 'saved' && onSave && (
              <Button 
                onClick={handleSaveOrder}
                disabled={isSaving || hasUncertainItems}
                className="transition-all duration-200 hover:scale-105"
              >
                {isSaving ? (
                  <>Guardando...</>
                ) : (
                  <>
                    <Check size={16} className="mr-1" />
                    Guardar Pedido
                  </>
                )}
              </Button>
            )}
          </CardFooter>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
