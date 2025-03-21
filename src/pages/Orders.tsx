import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Client, Order, OrderItem } from "@/types";
import { ChevronDown, ChevronUp, ClipboardList, Package, User, Loader2, PlusCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const Orders = () => {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<{[key: string]: Client}>({});
  const [openCollapsibles, setOpenCollapsibles] = useState<{[key: string]: boolean}>({});
  
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*');
      
      if (clientsError) throw clientsError;
      
      const clientsMap: {[key: string]: Client} = {};
      clientsData.forEach(client => {
        clientsMap[client.id] = {
          id: client.id,
          name: client.name,
          phone: client.phone || '',
          createdAt: client.created_at,
          totalOrders: 0,
          balance: 0
        };
      });
      setClients(clientsMap);
      
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .order('date', { ascending: false });
      
      if (ordersError) throw ordersError;
      
      const ordersWithItems = await Promise.all(
        ordersData.map(async (order) => {
          const { data: itemsData, error: itemsError } = await supabase
            .from('order_items')
            .select('*, products(name), product_variants(name)')
            .eq('order_id', order.id);
          
          if (itemsError) throw itemsError;
          
          const items: OrderItem[] = itemsData.map(item => ({
            id: item.id,
            productId: item.product_id,
            productName: item.products?.name || 'Producto desconocido',
            variantId: item.variant_id,
            variantName: item.product_variants?.name,
            quantity: item.quantity,
            price: parseFloat(item.price),
            total: parseFloat(item.total)
          }));
          
          return {
            id: order.id,
            clientId: order.client_id,
            clientName: clientsMap[order.client_id]?.name || 'Cliente desconocido',
            date: order.date,
            status: order.status,
            total: parseFloat(order.total),
            amountPaid: parseFloat(order.amount_paid),
            balance: parseFloat(order.balance),
            items
          } as Order;
        })
      );
      
      setOrders(ordersWithItems);
    } catch (error) {
      console.error('Error al cargar pedidos:', error);
      toast.error('Error al cargar los pedidos');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchOrders();
  }, []);
  
  const toggleCollapsible = (id: string) => {
    setOpenCollapsibles(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">Pendiente</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">Completado</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">Cancelado</Badge>;
      default:
        return <Badge variant="outline">Desconocido</Badge>;
    }
  };
  
  const groupOrdersByClient = () => {
    const grouped: {[key: string]: Order[]} = {};
    
    orders.forEach(order => {
      if (!grouped[order.clientId]) {
        grouped[order.clientId] = [];
      }
      grouped[order.clientId].push(order);
    });
    
    return grouped;
  };
  
  const groupedOrders = groupOrdersByClient();

  return (
    <AppLayout>
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Pedidos</h1>
            <p className="text-muted-foreground">Gestiona tus pedidos</p>
          </div>
          
          <Link to="/magic-order">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Nuevo Pedido
            </Button>
          </Link>
        </div>
        
        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : Object.keys(groupedOrders).length > 0 ? (
          <div className="space-y-6">
            {Object.entries(groupedOrders).map(([clientId, clientOrders]) => (
              <Card key={clientId}>
                <CardContent className="pt-6 pb-2 space-y-3">
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-medium">{clients[clientId]?.name}</h3>
                  </div>
                  
                  <div className="space-y-2">
                    {clientOrders.map(order => (
                      <Collapsible
                        key={order.id}
                        open={openCollapsibles[order.id]}
                        onOpenChange={() => toggleCollapsible(order.id)}
                        className="border rounded-md overflow-hidden"
                      >
                        <CollapsibleTrigger asChild>
                          <div className="p-3 flex justify-between items-center cursor-pointer hover:bg-muted/50">
                            <div className="flex items-center gap-3">
                              <ClipboardList className="h-5 w-5 text-primary" />
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">Pedido del {format(new Date(order.date), 'PPP', { locale: es })}</span>
                                  {getStatusBadge(order.status)}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {order.items.length} {order.items.length === 1 ? 'artículo' : 'artículos'} - Total: ${order.total.toFixed(2)}
                                </p>
                              </div>
                            </div>
                            <div>
                              {openCollapsibles[order.id] ? (
                                <ChevronUp className="h-5 w-5" />
                              ) : (
                                <ChevronDown className="h-5 w-5" />
                              )}
                            </div>
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="border-t p-3 space-y-3">
                            <div className="space-y-2">
                              {order.items.map(item => (
                                <div key={item.id} className="flex justify-between items-center p-2 bg-muted/30 rounded">
                                  <div className="flex items-center gap-2">
                                    <Package className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                      <p className="font-medium">{item.productName}</p>
                                      {item.variantName && (
                                        <p className="text-xs text-muted-foreground">Variante: {item.variantName}</p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-medium">${item.total.toFixed(2)}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {item.quantity} × ${item.price.toFixed(2)}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                            
                            <div className="border-t pt-2 space-y-1">
                              <div className="flex justify-between">
                                <span>Subtotal:</span>
                                <span>${order.total.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Pagado:</span>
                                <span>${order.amountPaid.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between font-medium">
                                <span>Saldo:</span>
                                <span>${order.balance.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center p-8 bg-muted/20 rounded-lg">
            <p>No hay pedidos registrados</p>
            <Link to="/magic-order" className="block mt-4">
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Crear primer pedido
              </Button>
            </Link>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Orders;
