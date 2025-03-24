
import { AppLayout } from "@/components/layout/AppLayout";
import { useEffect, useState } from "react";
import { Order } from "@/types";
import { supabase } from "@/lib/supabase";
import { ClipboardList, Loader2, Search, X } from "lucide-react";
import { OrderCardList } from "@/components/OrderCardList";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

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
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (ordersError) {
        throw ordersError;
      }

      if (ordersData) {
        const clientIds = [...new Set(ordersData.map(order => order.client_id))];
        const { data: clientsData, error: clientsError } = await supabase
          .from('clients')
          .select('id, name')
          .in('id', clientIds);

        if (clientsError) {
          throw clientsError;
        }

        const orderIds = ordersData.map(order => order.id);
        const { data: orderItemsData, error: orderItemsError } = await supabase
          .from('order_items')
          .select('*')
          .in('order_id', orderIds);

        if (orderItemsError) {
          throw orderItemsError;
        }

        const productIds = orderItemsData?.map(item => item.product_id) || [];
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('id, name')
          .in('id', productIds);
          
        if (productsError) {
          throw productsError;
        }
        
        const variantIds = orderItemsData?.filter(item => item.variant_id).map(item => item.variant_id) || [];
        let variantsData = [];
        
        if (variantIds.length > 0) {
          const { data: variants, error: variantsError } = await supabase
            .from('product_variants')
            .select('id, name')
            .in('id', variantIds);
            
          if (variantsError) {
            throw variantsError;
          }
          
          variantsData = variants || [];
        }

        const productMap: { [key: string]: string } = {};
        productsData?.forEach(product => {
          productMap[product.id] = product.name;
        });
        
        const variantMap: { [key: string]: string } = {};
        variantsData?.forEach(variant => {
          variantMap[variant.id] = variant.name;
        });

        const orderItemsMap: { [key: string]: any[] } = {};
        if (orderItemsData) {
          orderItemsData.forEach(item => {
            if (!orderItemsMap[item.order_id]) {
              orderItemsMap[item.order_id] = [];
            }
            
            orderItemsMap[item.order_id].push({
              ...item,
              name: productMap[item.product_id] || `Producto`,
              variant: item.variant_id ? variantMap[item.variant_id] || `Variante` : null
            });
          });
        }

        if (clientsData) {
          const clientMap: { [key: string]: { name: string } } = {};
          clientsData.forEach(client => {
            clientMap[client.id] = { name: client.name };
          });
          setClientMap(clientMap);
          
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
      console.error("Error al cargar pedidos:", error);
      toast({
        title: "Error al cargar los pedidos",
        description: error.message || "Ha ocurrido un error al cargar los pedidos. Intente nuevamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOrderUpdate = (orderId: string, updates: Partial<Order>) => {
    setOrders(prevOrders => {
      // Si el pedido ha sido eliminado, filtrarlo de la lista
      if (updates.deleted) {
        return prevOrders.filter(order => order.id !== orderId);
      }
      
      // De lo contrario, actualizar los campos correspondientes
      return prevOrders.map(order => 
        order.id === orderId 
          ? { ...order, ...updates } 
          : order
      );
    });
  };

  const filteredOrders = searchTerm
    ? orders.filter(order => 
        order.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.items.some(item => 
          (item.name && item.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (item.variant && item.variant.toLowerCase().includes(searchTerm.toLowerCase()))
        )
      )
    : orders;

  return (
    <AppLayout>
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2 mb-3">
            <ClipboardList className="h-7 w-7 text-primary" />
            Pedidos
          </h1>
          
          <div className="relative mb-4">
            <Input
              placeholder="Buscar por cliente o producto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-8 rounded-full"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <OrderCardList orders={filteredOrders} onOrderUpdate={handleOrderUpdate} />
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Orders;
