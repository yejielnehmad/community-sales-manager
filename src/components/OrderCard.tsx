
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  MessageItem, 
  MessageClient, 
  OrderCard as OrderCardType,
  MessageAlternative
} from '@/types';
import { ChevronDown, ChevronUp, Check, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface OrderCardProps {
  order: OrderCardType;
  onUpdate: (updatedOrder: OrderCardType) => void;
  onSave: (order: OrderCardType) => Promise<boolean>;
}

export const OrderCard = ({ order, onUpdate, onSave }: OrderCardProps) => {
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

  const hasUncertainItems = order.items.some(item => item.status === 'duda');
  
  return (
    <Card className="mb-4 border-l-4 relative" style={{ 
      borderLeftColor: hasUncertainItems ? 'var(--warning)' : 'var(--primary)' 
    }}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
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
              <div className="flex items-center gap-2">
                <span className="text-sm">Pagado</span>
                <Switch 
                  checked={order.isPaid} 
                  onCheckedChange={handleTogglePaid}
                  disabled={order.status === 'saved'}
                />
              </div>
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
          <div className="text-sm text-muted-foreground">
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
                    <div className="font-medium">{item.product.name}</div>
                    <div className="font-medium">
                      Cantidad: {item.quantity}
                    </div>
                  </div>
                  
                  {item.variant && (
                    <div className="text-sm mt-1">
                      Variante: {item.variant.name}
                    </div>
                  )}
                  
                  {item.notes && (
                    <div className="text-sm text-muted-foreground mt-2 bg-muted p-2 rounded-md">
                      <strong>Nota:</strong> {item.notes}
                    </div>
                  )}
                  
                  {item.status === 'duda' && item.alternatives && item.alternatives.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="text-sm font-medium mb-2">Seleccionar opción correcta:</div>
                      <RadioGroup 
                        defaultValue={item.variant?.id || ""}
                        onValueChange={(value) => {
                          const selected = item.alternatives?.find(alt => alt.id === value);
                          if (selected) {
                            handleItemUpdate(index, {
                              ...item,
                              status: 'confirmado',
                              variant: {
                                id: selected.id,
                                name: selected.name
                              }
                            });
                          }
                        }}
                      >
                        {item.alternatives.map((alt) => (
                          <div key={alt.id} className="flex items-center space-x-2 text-sm">
                            <RadioGroupItem value={alt.id} id={`alt-${index}-${alt.id}`} />
                            <label htmlFor={`alt-${index}-${alt.id}`}>{alt.name}</label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
          
          <CardFooter className="justify-end pt-0">
            {order.status !== 'saved' && (
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
          </CardFooter>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
