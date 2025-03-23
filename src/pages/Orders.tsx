
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { Order } from "@/types";
import { supabase } from "@/lib/supabase";
import { Link } from "react-router-dom";
import { Wand, ClipboardList, Loader2, Trash } from "lucide-react";
import { OrderCardList } from "@/components/OrderCardList";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const [isDeleting, setIsDeleting] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

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
      alert(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOrderUpdate = (orderId: string, updates: Partial<Order>) => {
    setOrders(prevOrders => prevOrders.map(order => 
      order.id === orderId 
        ? { ...order, ...updates } 
        : order
    ));
  };

  const handleDeleteOrder = async () => {
    if (!orderToDelete) return;
    
    setIsDeleting(true);
    try {
      // Primero eliminar los items del pedido
      const { error: itemsError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', orderToDelete);
      
      if (itemsError) throw itemsError;
      
      // Luego eliminar el pedido
      const { error: orderError } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderToDelete);
        
      if (orderError) throw orderError;
      
      // Actualizar la lista de pedidos
      setOrders(prevOrders => prevOrders.filter(order => order.id !== orderToDelete));
      alert('Pedido eliminado correctamente');
    } catch (error: any) {
      alert(`Error al eliminar el pedido: ${error.message}`);
    } finally {
      setIsDeleting(false);
      setOrderToDelete(null);
    }
  };

  const confirmDeleteOrder = (orderId: string) => {
    setOrderToDelete(orderId);
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
            ) : orders.length > 0 ? (
              <div className="space-y-4">
                {orders.map(order => (
                  <div key={order.id} className="border rounded-lg p-4 relative">
                    <div className="mb-2">
                      <h3 className="font-medium">{order.clientName}</h3>
                      <p className="text-sm text-muted-foreground">
                        Fecha: {new Date(order.date).toLocaleDateString()}
                      </p>
                      <p className="text-sm font-semibold">
                        Total: ${order.total.toFixed(2)}
                      </p>
                    </div>
                    
                    <div className="mt-2 space-y-1">
                      <h4 className="text-sm font-medium">Productos:</h4>
                      <ul className="text-sm">
                        {order.items.map((item, idx) => (
                          <li key={idx} className="flex justify-between">
                            <span>{item.product_id} - {item.quantity} unidades</span>
                            <span>${item.total.toFixed(2)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="absolute top-2 right-2">
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={() => confirmDeleteOrder(order.id)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-8">
                <p>No hay pedidos registrados</p>
                <Button asChild variant="outline" className="mt-4">
                  <Link to="/magic-order">Crear pedido</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <AlertDialog open={!!orderToDelete} onOpenChange={() => setOrderToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente el pedido
              y todos sus detalles.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteOrder}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default Orders;
