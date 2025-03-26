
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Package, DollarSign, CheckCircle, Search } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getProductIcon } from "@/services/productIconService";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

interface ProductDetailParams {
  productId: string;
}

interface OrderDetail {
  id: string;
  clientName: string;
  quantity: number;
  isPaid: boolean;
  orderId: string;
  balance: number;
}

interface ClientOrders {
  clientName: string;
  clientId: string;
  orderItems: {
    id: string;
    orderId: string;
    quantity: number;
    isPaid: boolean;
  }[];
  totalQuantity: number;
  balance: number;
}

const ProductDetails = () => {
  const { productId } = useParams<keyof ProductDetailParams>() as ProductDetailParams;
  const navigate = useNavigate();
  const [productName, setProductName] = useState('');
  const [orderDetails, setOrderDetails] = useState<OrderDetail[]>([]);
  const [clientOrders, setClientOrders] = useState<ClientOrders[]>([]);
  const [filteredClients, setFilteredClients] = useState<ClientOrders[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (productId) {
      fetchProductDetails();
    }
  }, [productId]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredClients(clientOrders);
    } else {
      const filtered = clientOrders.filter(client => 
        client.clientName.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredClients(filtered);
    }
  }, [searchQuery, clientOrders]);

  const fetchProductDetails = async () => {
    setIsLoading(true);
    try {
      // Fetch product name
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('name')
        .eq('id', productId)
        .single();

      if (productError) throw productError;
      setProductName(product?.name || '');

      // Fetch order details for this product
      const { data: orderItems, error: orderItemsError } = await supabase
        .from('order_items')
        .select('id, order_id, quantity, is_paid')
        .eq('product_id', productId);

      if (orderItemsError) throw orderItemsError;

      if (orderItems && orderItems.length > 0) {
        const orderIds = orderItems.map(item => item.order_id);
        
        // Fetch orders with client info
        const { data: orders, error: ordersError } = await supabase
          .from('orders')
          .select('id, client_id, amount_paid, total, balance')
          .in('id', orderIds);

        if (ordersError) throw ordersError;

        if (orders && orders.length > 0) {
          const clientIds = orders.map(order => order.client_id);
          
          // Fetch client info
          const { data: clients, error: clientsError } = await supabase
            .from('clients')
            .select('id, name')
            .in('id', clientIds);

          if (clientsError) throw clientsError;

          // Combine all data
          const details: OrderDetail[] = orderItems.map(item => {
            const order = orders.find(o => o.id === item.order_id);
            const client = clients?.find(c => c.id === order?.client_id);
            
            return {
              id: item.id,
              orderId: item.order_id,
              clientName: client?.name || 'Cliente desconocido',
              clientId: client?.id || '',
              quantity: Number(item.quantity),
              isPaid: item.is_paid === true,
              balance: order?.balance || 0
            };
          });

          setOrderDetails(details);
          
          // Agrupar por cliente
          const clientOrdersMap: { [clientId: string]: ClientOrders } = {};
          
          details.forEach(detail => {
            if (!detail.clientId) return;
            
            if (!clientOrdersMap[detail.clientId]) {
              clientOrdersMap[detail.clientId] = {
                clientId: detail.clientId,
                clientName: detail.clientName,
                orderItems: [],
                totalQuantity: 0,
                balance: 0
              };
            }
            
            clientOrdersMap[detail.clientId].orderItems.push({
              id: detail.id,
              orderId: detail.orderId,
              quantity: detail.quantity,
              isPaid: detail.isPaid
            });
            
            clientOrdersMap[detail.clientId].totalQuantity += detail.quantity;
            if (!detail.isPaid) {
              clientOrdersMap[detail.clientId].balance += detail.balance;
            }
          });
          
          const groupedClients = Object.values(clientOrdersMap);
          setClientOrders(groupedClients);
          setFilteredClients(groupedClients);
        }
      }
    } catch (error) {
      console.error('Error fetching product details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentToggle = async (client: ClientOrders, isPaid: boolean) => {
    try {
      // Actualizar todos los items de este cliente para este producto
      for (const item of client.orderItems) {
        // Actualizar el estado de pago del item
        const { error: itemError } = await supabase
          .from('order_items')
          .update({ is_paid: isPaid })
          .eq('id', item.id);

        if (itemError) throw itemError;

        // Obtener todos los items de esta orden para recalcular el total pagado
        const { data: orderItems, error: itemsError } = await supabase
          .from('order_items')
          .select('price, quantity, is_paid')
          .eq('order_id', item.orderId);

        if (itemsError) throw itemsError;

        // Obtener el pedido actual
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .select('total')
          .eq('id', item.orderId)
          .single();

        if (orderError) throw orderError;

        // Calcular el nuevo monto pagado basado en todos los items pagados
        let newAmountPaid = 0;
        orderItems?.forEach(orderItem => {
          if (orderItem.is_paid) {
            newAmountPaid += (orderItem.price || 0) * (orderItem.quantity || 0);
          }
        });

        // Redondear para evitar problemas de precisión
        newAmountPaid = Math.round(newAmountPaid * 100) / 100;
        const newBalance = Math.max(0, order.total - newAmountPaid);

        // Actualizar el pedido con el nuevo monto pagado
        const { error: updateError } = await supabase
          .from('orders')
          .update({ 
            amount_paid: newAmountPaid,
            balance: newBalance
          })
          .eq('id', item.orderId);

        if (updateError) throw updateError;
      }

      // Actualizar estado local
      setClientOrders(prevClients => {
        const updated = prevClients.map(c => 
          c.clientId === client.clientId 
            ? { 
                ...c, 
                orderItems: c.orderItems.map(item => ({ ...item, isPaid })),
                balance: isPaid ? 0 : c.balance
              } 
            : c
        );
        setFilteredClients(updated.filter(c => 
          c.clientName.toLowerCase().includes(searchQuery.toLowerCase())
        ));
        return updated;
      });
    } catch (error) {
      console.error('Error updating payment status:', error);
    }
  };

  const ProductIcon = getProductIcon(productName);

  const getIconColor = (productName: string) => {
    // Asignar colores basados en el nombre del producto
    const colors = ['text-blue-500', 'text-green-500', 'text-purple-500', 'text-orange-500', 'text-red-500', 'text-pink-500', 'text-amber-500', 'text-teal-500'];
    let hash = 0;
    for (let i = 0; i < productName.length; i++) {
      hash = productName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  const iconColor = getIconColor(productName);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <div className={`bg-primary/10 p-2 rounded-full ${iconColor}`}>
              <ProductIcon className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold">{productName}</h1>
          </div>
          <div className="ml-auto">
            <Button 
              variant="ghost" 
              size="icon"
              className="rounded-full"
              onClick={() => setSearchOpen(!searchOpen)}
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {searchOpen && (
          <div className="animate-in fade-in slide-in-from-top duration-300">
            <Input
              placeholder="Buscar cliente..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>
        )}

        <div>
          <h2 className="text-xl font-semibold mb-4">Clientes con este producto</h2>
          
          {isLoading ? (
            <div className="text-center py-8">Cargando...</div>
          ) : filteredClients.length > 0 ? (
            <div className="space-y-3">
              {filteredClients.map(client => {
                const allItemsPaid = client.orderItems.every(item => item.isPaid);
                
                return (
                  <div key={client.clientId} className="p-4 border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all dark:border-gray-700 dark:bg-gray-800">
                    <div className="flex justify-between items-center">
                      <span className="font-medium flex items-center gap-2">
                        {client.clientName}
                        {allItemsPaid && (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/30">
                          <Package className="h-3 w-3" />
                          <span>{client.totalQuantity}</span>
                        </Badge>
                        {!allItemsPaid && (
                          <Badge variant="outline" className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/30">
                            <DollarSign className="h-3 w-3" />
                            <span>{client.balance}</span>
                          </Badge>
                        )}
                        <div 
                          className="relative inline-flex h-4 w-8 cursor-pointer rounded-full bg-gray-200 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary dark:bg-gray-700" 
                          onClick={() => handlePaymentToggle(client, !allItemsPaid)}
                        >
                          <span
                            className={`${
                              allItemsPaid ? 'translate-x-4 bg-primary' : 'translate-x-0 bg-gray-400'
                            } pointer-events-none inline-block h-4 w-4 transform rounded-full shadow-lg transition duration-200 ease-in-out`}
                          />
                        </div>
                      </div>
                    </div>
                    
                    {client.orderItems.length > 1 && (
                      <div className="mt-2 pl-2">
                        <Separator className="my-2" />
                        <div className="text-sm text-muted-foreground">
                          {client.orderItems.map((item, index) => (
                            <div key={item.id} className="flex justify-between items-center py-1">
                              <span>Cantidad: {item.quantity}</span>
                              <span className={item.isPaid ? "text-green-500" : ""}>
                                {item.isPaid ? "Pagado" : "Pendiente"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? "No se encontraron clientes" : "No hay pedidos para este producto"}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default ProductDetails;
