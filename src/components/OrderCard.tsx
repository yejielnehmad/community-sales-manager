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
  Edit,
  Trash
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { useSwipe } from '@/hooks/use-swipe';
import { PriceDisplay } from '@/components/ui/price-display';

interface OrderCardProps {
  order: OrderCardType;
  onUpdate: (updatedOrder: OrderCardType) => void;
  onSave: (order: OrderCardType) => Promise<boolean>;
  isPreliminary?: boolean;
}

export const OrderCard = ({ order, onUpdate, onSave, isPreliminary = false }: OrderCardProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [swipeStates, setSwipeStates] = useState<{[key: number]: number}>({});

  const handleItemUpdate = (index: number, updatedItem: MessageItem) => {
    const updatedItems = [...order.items];
    updatedItems[index] = updatedItem;
    onUpdate({
      ...order,
      items: updatedItems
    });
  };

  const handleTogglePaid = (checked: boolean) => {
    onUpdate({
      ...order,
      isPaid: checked
    });
  };

  const handleSaveOrder = async () => {
    setIsSaving(true);
    try {
      const success = await onSave(order);
      if (success) {
        setIsOpen(false);
      }
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
      }
    }
  };
  
  const updateSwipeState = (index: number, swipeX: number) => {
    setSwipeStates(prev => ({
      ...prev,
      [index]: swipeX
    }));
  };

  const resetAllSwipes = (exceptIndex?: number) => {
    setSwipeStates(prev => {
      const newState = { ...prev };
      Object.keys(newState).forEach(key => {
        const keyNum = parseInt(key);
        if (exceptIndex === undefined || keyNum !== exceptIndex) {
          newState[keyNum] = 0;
        }
      });
      return newState;
    });
  };

  const hasUncertainItems = order.items.some(item => item.status === 'duda');
  
  return (
    <Card className="mb-2 overflow-hidden transition-all duration-200 hover:shadow-md rounded-xl shadow-sm relative">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full text-left">
          <div className="p-4 flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="font-medium text-lg">{order.client.name}</div>
              {order.client.matchConfidence && order.client.matchConfidence !== 'alto' && (
                <Badge variant="outline" className="text-xs">
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
          </div>
        </div>

        <CollapsibleContent>
          <CardContent className="pt-3">
            <div className="space-y-3">
              {order.items.map((item, index) => {
                const { swipeX, resetSwipe, getMouseProps, getTouchProps } = useSwipe({
                  maxSwipe: -100,
                  onSwipeStart: () => {
                    resetAllSwipes(index);
                  },
                  onSwipeMove: (x) => {
                    updateSwipeState(index, x);
                  },
                  onSwipeEnd: (completed) => {
                    if (!completed) {
                      resetSwipe();
                      updateSwipeState(index, 0);
                    }
                  }
                });
                
                const isEditing = editingItemIndex === index;
                
                return (
                  <div key={index} className="relative overflow-hidden">
                    <div 
                      className="absolute inset-y-0 right-0 flex items-stretch h-full"
                      style={{ 
                        width: '100px',
                        zIndex: 1
                      }}
                    >
                      <button 
                        className="w-1/2 bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center transition-colors"
                        onClick={() => setEditingItemIndex(index)}
                        aria-label="Editar producto"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button 
                        className="w-1/2 bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors"
                        onClick={() => {
                          const updatedItems = order.items.filter((_, i) => i !== index);
                          onUpdate({
                            ...order,
                            items: updatedItems
                          });
                        }}
                        aria-label="Eliminar producto"
                      >
                        <Trash className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div 
                      {...(item.status !== 'duda' && !isEditing ? { ...getMouseProps(), ...getTouchProps() } : {})}
                      className={`border rounded-md transition-all ${item.status === 'duda' ? 'border-amber-300 bg-amber-50' : ''} overflow-hidden`}
                      style={{ 
                        transform: `translateX(${swipeStates[index] || 0}px)`,
                        transition: 'transform 0.3s ease-out',
                        touchAction: 'pan-y'
                      }}
                    >
                      <div className={`p-3 ${isEditing ? 'bg-primary/5' : ''}`}>
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
                              </div>
                              <div className="font-medium">
                                x{item.quantity}
                              </div>
                            </div>
                            
                            {item.variant && (
                              <div className="text-sm mt-1">
                                <Badge variant="outline" className="ml-1">{item.variant.name}</Badge>
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
                          <div className="text-sm font-medium mb-2">Opciones disponibles:</div>
                          <div className="flex flex-wrap gap-2">
                            {item.alternatives.map((alt) => (
                              <Badge 
                                key={alt.id} 
                                variant={item.variant?.id === alt.id ? "default" : "outline"}
                                className="cursor-pointer hover:bg-primary/90 hover:text-primary-foreground transition-colors"
                                onClick={() => handleSelectAlternative(index, alt.id)}
                              >
                                {alt.name} {alt.price !== undefined ? `($${alt.price.toFixed(2)})` : ''}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
          
          <CardFooter className="justify-end pt-0">
            {!isPreliminary && order.status !== 'saved' && (
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
            {isPreliminary && order.status !== 'saved' && !hasUncertainItems && (
              <Button 
                onClick={handleSaveOrder}
                disabled={isSaving}
                className="transition-all duration-200 hover:scale-105"
              >
                {isSaving ? (
                  <>Confirmando...</>
                ) : (
                  <>
                    <Check size={16} className="mr-1" />
                    Confirmar Pedido
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
