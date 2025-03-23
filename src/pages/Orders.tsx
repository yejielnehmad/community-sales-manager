
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { Order } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Link } from "react-router-dom";
import { Wand, ClipboardList, Loader2 } from "lucide-react";
import { OrderCardList } from "@/components/OrderCardList";

interface OrderFromDB {
  id: string;
  client_id: string;
  date: string | null;
  status: string;
  total: number;
  amount_paid: number;
  balance: number;
  created_at?: string | null;
  updated_at?: string | null;
}

const Orders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [clientMap, setClientMap] = useState<{ [key: string]: { name: string } }>({});
  const { toast } = useToast();

  useEffect(() => {
    const fetchOrders = async () => {
      setIsLoading(true);
      try {
        // Obtener pedidos con sus items
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false });

        if (ordersError) {
          throw ordersError;
        }

        // Fetch client names for each order
        if (ordersData) {
          const clientIds = [...new Set(ordersData.map(order => order.client_id))];
          const { data: clientsData, error: clientsError } = await supabase
            .from('clients')
            .select('id, name')
            .in('id', clientIds);

          if (clientsError) {
            throw clientsError;
          }

          // Get order items
          const orderIds = ordersData.map(order => order.id);
          const { data: orderItemsData, error: orderItemsError } = await supabase
            .from('order_items')
            .select('*')
            .in('order_id', orderIds);

          if (orderItemsError) {
            throw orderItemsError;
          }

          // Create map of order items by order ID
          const orderItemsMap: { [key: string]: any[] } = {};
          if (orderItemsData) {
            orderItemsData.forEach(item => {
              if (!orderItemsMap[item.order_id]) {
                orderItemsMap[item.order_id] = [];
              }
              orderItemsMap[item.order_id].push(item);
            });
          }

          if (clientsData) {
            const clientMap: { [key: string]: { name: string } } = {};
            clientsData.forEach(client => {
              clientMap[client.id] = { name: client.name };
            });
            setClientMap(clientMap);
            
            // Transformar los datos al formato requerido por la interfaz Order
            const transformedOrders: Order[] = ordersData.map((order: OrderFromDB) => ({
              id: order.id,
              clientId: order.client_id,
              clientName: clientMap[order.client_id]?.name || "Cliente desconocido",
              date: order.date || "",
              status: order.status as 'pending' | 'completed' | 'cancelled',
              items: orderItemsMap[order.id] || [],
              total: order.total,
              amountPaid: order.amount_paid,
              balance: order.balance
            }));
            
            setOrders(transformedOrders);
          }
        }
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [toast]);

  const handleOrderUpdate = (orderId: string, updates: Partial<Order>) => {
    setOrders(prevOrders => prevOrders.map(order => 
      order.id === orderId 
        ? { ...order, ...updates } 
        : order
    ));
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <ClipboardList className="h-7 w-7 text-primary" />
              Pedidos
            </h1>
            <p className="text-muted-foreground">Administra los pedidos de tus clientes</p>
          </div>
          <Button asChild className="flex items-center gap-2">
            <Link to="/magic-order">
              <Wand className="h-4 w-4" />
              <span>Mensaje Mágico</span>
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              Pedidos por Cliente
            </CardTitle>
            <CardDescription>
              Aquí puedes ver todos los pedidos agrupados por cliente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <OrderCardList 
                orders={orders} 
                onOrderUpdate={handleOrderUpdate}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Orders;
