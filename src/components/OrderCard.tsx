
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
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
  MessageSquare
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';

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
            name: selected.name
          }
        });
      }
    }
  };

  const hasUncertainItems = order.items.some(item => item.status === 'duda');
  
  return (
    <Card className="mb-4 border-l-4 relative" style={{ 
      borderLeftColor: hasUncertainItems ? 'var(--warning)' : 'var(--primary)' 
    }}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">
                {order.client.name}
              </CardTitle>
              {order.client.matchConfidence && order.client.matchConfidence !== 'alto' && (
                <Badge variant="outline" className="text-xs">
                  Coincidencia: {order.client.matchConfidence}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3">
              {!isPreliminary && (
                <div className="flex items-center gap-2">
                  <span className="text-sm">Pagado</span>
                  <Switch 
                    checked={order.isPaid} 
                    onCheckedChange={handleTogglePaid}
                    disabled={order.status === 'saved'}
                  />
                </div>
              )}
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
          {order.status === 'saved' && (
            <Badge className="absolute top-2 right-2 bg-green-500">
              Guardado
            </Badge>
          )}
        </CardHeader>
        
        <CardContent className="pt-0 pb-2">
          <div className="text-sm text-muted-foreground flex items-center gap-1">
            <ShoppingCart size={14} />
            {order.items.length} {order.items.length === 1 ? 'producto' : 'productos'}
            {hasUncertainItems && (
              <Badge variant="outline" className="ml-2 bg-amber-50 text-amber-700 border-amber-200">
                <AlertCircle size={12} className="mr-1" />
                Requiere confirmación
              </Badge>
            )}
          </div>
        </CardContent>

        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="space-y-4">
              {order.items.map((item, index) => (
                <div key={index} className={`p-3 border rounded-md ${item.status === 'duda' ? 'border-amber-300 bg-amber-50' : ''}`}>
                  <div className="flex justify-between">
                    <div className="font-medium flex items-center gap-2">
                      <Package className="h-4 w-4 text-primary" />
                      {item.product.name}
                    </div>
                    <div className="font-medium">
                      Cantidad: {item.quantity}
                    </div>
                  </div>
                  
                  {item.variant && (
                    <div className="text-sm mt-1">
                      Variante: <Badge variant="outline" className="ml-1">{item.variant.name}</Badge>
                    </div>
                  )}
                  
                  {item.notes && (
                    <div className="flex items-center mt-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-full">
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom">
                            <div className="max-w-xs p-1 text-sm">
                              <strong>Nota:</strong> {item.notes}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <span className="text-sm text-muted-foreground ml-1">
                        <MessageSquare className="h-3 w-3 inline mr-1" />
                        Nota disponible
                      </span>
                    </div>
                  )}
                  
                  {item.status === 'duda' && item.alternatives && item.alternatives.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="text-sm font-medium mb-2">Opciones disponibles:</div>
                      <div className="flex flex-wrap gap-2">
                        {item.alternatives.map((alt) => (
                          <Badge 
                            key={alt.id} 
                            variant={item.variant?.id === alt.id ? "default" : "outline"}
                            className="cursor-pointer hover:bg-primary/90 hover:text-primary-foreground transition-colors"
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
          </CardContent>
          
          <CardFooter className="justify-end pt-0">
            {!isPreliminary && order.status !== 'saved' && (
              <Button 
                onClick={handleSaveOrder}
                disabled={isSaving || hasUncertainItems}
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
