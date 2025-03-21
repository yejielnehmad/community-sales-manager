
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, User, Calendar, CreditCard, Package, Eye, Trash } from "lucide-react";
import { useState, useEffect } from "react";
import { Order, OrderItem } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useNavigate } from "react-router-dom";

const OrderStatusBadge = ({ status }: { status: Order['status'] }) => {
  const statusConfig = {
    pending: { label: 'Pendiente', className: 'bg-yellow-500 hover:bg-yellow-600' },
    completed: { label: 'Completado', className: 'bg-green-500 hover:bg-green-600' },
    cancelled: { label: 'Cancelado', className: 'bg-red-500 hover:bg-red-600' },
  };
  
  const config = statusConfig[status];
  
  return (
    <Badge className={config.className}>
      {config.label}
    </Badge>
  );
};

const Orders = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  // Cargar pedidos desde Supabase
  const fetchOrders = async () => {
    setLoading(true);
    try {
      // Obtener pedidos
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          client_id,
          date,
          status,
          total,
          amount_paid,
          balance,
          clients (
            name
          )
        `)
        .order('date', { ascending: false });
      
      if (ordersError) throw ordersError;
      
      // Obtener items de cada pedido
      const ordersWithItems = await Promise.all(
        (ordersData || []).map(async (order) => {
          const { data: itemsData, error: itemsError } = await supabase
            .from('order_items')
            .select(`
              id,
              product_id,
              variant_id,
              quantity,
              price,
              total,
              products (
                name
              ),
              product_variants (
                name
              )
            `)
            .eq('order_id', order.id);
          
          if (itemsError) throw itemsError;
          
          const items: OrderItem[] = (itemsData || []).map(item => ({
            id: item.id,
            productId: item.product_id,
            productName: item.products.name,
            variantId: item.variant_id || undefined,
            variantName: item.product_variants?.name || undefined,
            quantity: parseFloat(item.quantity),
            price: parseFloat(item.price),
            total: parseFloat(item.total)
          }));
          
          return {
            id: order.id,
            clientId: order.client_id,
            clientName: order.clients.name,
            date: order.date,
            status: order.status,
            items,
            total: parseFloat(order.total),
            amountPaid: parseFloat(order.amount_paid),
            balance: parseFloat(order.balance)
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
  
  // Filtrar pedidos según el término de búsqueda
  const filteredOrders = orders.filter(
    order => 
      order.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id.includes(searchTerm)
  );
  
  // Función para eliminar un pedido
  const handleDeleteOrder = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este pedido? Esta acción no se puede deshacer.')) return;
    
    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success('Pedido eliminado correctamente');
      
      // Eliminar pedido de la lista
      setOrders(prev => prev.filter(order => order.id !== id));
    } catch (error) {
      console.error('Error al eliminar pedido:', error);
      toast.error('Error al eliminar el pedido');
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Pedidos</h1>
            <p className="text-muted-foreground">Gestiona los pedidos de la venta comunitaria</p>
          </div>
          <Button onClick={() => navigate('/magic-order')}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Pedido
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar por cliente o ID..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <Accordion type="multiple" className="space-y-2">
          {loading ? (
            <div className="flex justify-center p-6">
              <p>Cargando pedidos...</p>
            </div>
          ) : filteredOrders.length > 0 ? (
            filteredOrders.map((order) => (
              <Card key={order.id} className="overflow-hidden">
                <AccordionItem value={order.id} className="border-none">
                  <AccordionTrigger className="px-4 py-3 hover:bg-muted/50 w-full flex justify-between">
                    <div className="flex flex-1 justify-between items-center">
                      <div className="font-medium text-left flex items-center gap-2">
                        <OrderStatusBadge status={order.status} />
                        <span>{order.clientName}</span>
                      </div>
                      <div className="mr-4 text-right">
                        ${order.total.toFixed(2)}
                        {order.balance > 0 && (
                          <div className="text-sm text-red-600">
                            Saldo: ${order.balance.toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>Cliente: {order.clientName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>Fecha: {new Date(order.date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span>Artículos: {order.items.length}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-muted-foreground" />
                          <span>Pagado: ${order.amountPaid.toFixed(2)}</span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">Artículos:</h4>
                        <div className="space-y-1 bg-muted/20 p-2 rounded-md">
                          {order.items.map((item) => (
                            <div key={item.id} className="grid grid-cols-[1fr,auto] text-sm">
                              <div>
                                {item.quantity} × {item.productName}
                                {item.variantName && <span className="text-muted-foreground ml-1">({item.variantName})</span>}
                              </div>
                              <div className="text-right">${item.total.toFixed(2)}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex items-center gap-1"
                        >
                          <Eye className="h-4 w-4" />
                          Ver detalles
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          className="flex items-center gap-1"
                          onClick={() => handleDeleteOrder(order.id)}
                        >
                          <Trash className="h-4 w-4" />
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Card>
            ))
          ) : (
            <div className="text-center p-6 bg-muted/20 rounded-lg">
              <p>No se encontraron pedidos.</p>
            </div>
          )}
        </Accordion>
      </div>
    </AppLayout>
  );
};

export default Orders;
