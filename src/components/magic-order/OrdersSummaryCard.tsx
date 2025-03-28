
import { useMemo } from 'react';
import { Package, ChevronUp, ChevronDown, Check, User } from 'lucide-react';
import { Card, CardHeader, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from 'lucide-react';
import { OrderCard as OrderCardType } from "@/types";
import { SimpleOrderCardNew } from "@/components/SimpleOrderCardNew";

interface OrdersSummaryCardProps {
  orders: OrderCardType[];
  showOrderSummary: boolean;
  onToggleOrderSummary: () => void;
  onUpdateOrder: (index: number, updatedOrder: OrderCardType) => void;
  onDeleteOrder: (index: number) => void;
  isSavingAllOrders: boolean;
  onSaveAllOrders: () => void;
  clients: any[];
  products: any[];
}

export const OrdersSummaryCard = ({
  orders,
  showOrderSummary,
  onToggleOrderSummary,
  onUpdateOrder,
  onDeleteOrder,
  isSavingAllOrders,
  onSaveAllOrders,
  clients,
  products
}: OrdersSummaryCardProps) => {
  const incompleteOrders = orders.filter(order => 
    !order.client.id || 
    order.client.matchConfidence !== 'alto' || 
    order.items.some(item => item.status === 'duda' || !item.product.id || !item.quantity)
  );
  
  const completeOrders = orders.filter(order => 
    order.client.id && 
    order.client.matchConfidence === 'alto' && 
    !order.items.some(item => item.status === 'duda' || !item.product.id || !item.quantity)
  );
  
  const allOrdersComplete = orders.length > 0 && 
    orders.every(order => 
      order.client.id && 
      order.client.matchConfidence === 'alto' && 
      !order.items.some(item => item.status === 'duda' || !item.product.id || !item.quantity)
    );

  const ordersByClient = useMemo(() => {
    return orders.reduce((acc, order, index) => {
      const clientId = order.client.id || `unknown-${index}`;
      const clientName = order.client.name;
      
      if (!acc[clientId]) {
        acc[clientId] = {
          clientName,
          orders: [],
          indices: []
        };
      }
      
      acc[clientId].orders.push(order);
      acc[clientId].indices.push(index);
      
      return acc;
    }, {} as Record<string, { clientName: string, orders: OrderCardType[], indices: number[] }>);
  }, [orders]);

  if (orders.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Pedidos detectados
          </CardTitle>
          <CardDescription>
            Se {orders.length === 1 ? 'ha' : 'han'} detectado {orders.length} {orders.length === 1 ? 'pedido' : 'pedidos'}
          </CardDescription>
        </div>
        
        <Button 
          variant="outline"
          size="sm"
          onClick={onToggleOrderSummary}
          className="flex items-center gap-1"
        >
          {showOrderSummary ? (
            <>
              <ChevronUp className="h-4 w-4" />
              Ocultar
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              Mostrar
            </>
          )}
        </Button>
      </CardHeader>
      
      {showOrderSummary && (
        <CardContent className="py-0">
          <div className="mb-2 grid grid-cols-2 gap-2">
            <div>
              <p className="text-sm font-medium">
                Pedidos con dudas: {incompleteOrders.length}
              </p>
              <p className="text-xs text-muted-foreground">
                Requieren revisión
              </p>
            </div>
            <div>
              <p className="text-sm font-medium">
                Pedidos listos: {completeOrders.length}
              </p>
              <p className="text-xs text-muted-foreground">
                Listos para guardar
              </p>
            </div>
          </div>
          
          {/* Botón para guardar todos los pedidos */}
          {orders.length > 0 && (
            <div className="mt-4 mb-6">
              <Button 
                className="w-full flex items-center justify-center gap-2"
                disabled={!allOrdersComplete || isSavingAllOrders}
                onClick={onSaveAllOrders}
              >
                {isSavingAllOrders ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Guardando pedidos...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Guardar todos los pedidos
                  </>
                )}
              </Button>
              
              {!allOrdersComplete && (
                <p className="text-xs text-center mt-1 text-muted-foreground">
                  Hay pedidos con dudas. Resuelve todas las dudas para habilitar el guardado.
                </p>
              )}
            </div>
          )}
          
          {/* Mostrar los pedidos agrupados por cliente */}
          <div className="space-y-6">
            {Object.entries(ordersByClient).map(([clientId, { clientName, orders: clientOrders, indices }]) => (
              <div key={clientId} className="border rounded-lg overflow-hidden">
                <div className="bg-muted px-4 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    <span className="font-medium">{clientName}</span>
                    
                    {clientOrders.some(o => !o.client.id || o.client.matchConfidence !== 'alto') && (
                      <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-600 border-yellow-200">
                        Cliente con dudas
                      </Badge>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {clientOrders.length} {clientOrders.length === 1 ? 'pedido' : 'pedidos'}
                  </span>
                </div>
                
                <div className="divide-y">
                  {indices.map(index => (
                    <div key={index} className="p-4">
                      <SimpleOrderCardNew 
                        order={orders[index]}
                        clients={clients}
                        products={products}
                        onUpdate={(updatedOrder) => onUpdateOrder(index, updatedOrder)}
                        onDelete={() => onDeleteOrder(index)}
                        index={index}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
};
