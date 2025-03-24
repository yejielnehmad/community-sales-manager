
import { AppLayout } from "@/components/layout/AppLayout";
import { useEffect, useState, useCallback } from "react";
import { Order } from "@/types";
import { supabase } from "@/lib/supabase";
import { ClipboardList, Loader2, Search, X, Ban } from "lucide-react";
import { OrderCardList } from "@/components/OrderCardList";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [clientMap, setClientMap] = useState<{ [key: string]: { name: string } }>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchOrders = useCallback(async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);
    
    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (ordersError) {
        throw ordersError;
      }

      if (ordersData && ordersData.length > 0) {
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
        const { data: productsData, error: productsError } = productIds.length > 0 
          ? await supabase
              .from('products')
              .select('id, name')
              .in('id', productIds)
          : { data: [], error: null };
          
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
      } else {
        // Si no hay órdenes, establecer un array vacío
        setOrders([]);
      }
    } catch (error: any) {
      console.error("Error al cargar pedidos:", error);
      setError(error.message || "Error al cargar pedidos");
      toast({
        title: "Error al cargar los pedidos",
        description: error.message || "Ha ocurrido un error al cargar los pedidos. Intente nuevamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

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

  const handleRefresh = () => {
    fetchOrders(true);
  };

  const clearSearch = () => {
    setSearchTerm("");
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
          
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Input
                placeholder="Buscar por cliente o producto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-8 rounded-full"
                aria-label="Buscar"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              {searchTerm && (
                <button 
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Limpiar búsqueda"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={handleRefresh}
              className="rounded-full"
              title="Actualizar pedidos"
              disabled={isRefreshing}
              aria-label="Actualizar"
            >
              <Loader2 className={`h-4 w-4 ${isRefreshing || isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        <div>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
              <p className="text-muted-foreground text-sm">Cargando pedidos...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center p-8 bg-muted/20 rounded-lg">
              <Ban className="h-8 w-8 text-destructive mb-2" />
              <p className="text-muted-foreground text-sm">{error}</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2"
                onClick={handleRefresh}
              >
                Reintentar
              </Button>
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
