
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Package, DollarSign } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getProductIcon } from "@/services/productIconService";

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

const ProductDetails = () => {
  const { productId } = useParams<keyof ProductDetailParams>() as ProductDetailParams;
  const navigate = useNavigate();
  const [productName, setProductName] = useState('');
  const [orderDetails, setOrderDetails] = useState<OrderDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (productId) {
      fetchProductDetails();
    }
  }, [productId]);

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
        .select('id, order_id, quantity')
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
            const isPaid = order ? Number(order.amount_paid) >= Number(order.total) : false;
            
            return {
              id: item.id,
              orderId: item.order_id,
              clientName: client?.name || 'Cliente desconocido',
              quantity: Number(item.quantity),
              isPaid: isPaid,
              balance: order?.balance || 0
            };
          });

          setOrderDetails(details);
        }
      }
    } catch (error) {
      console.error('Error fetching product details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentToggle = async (orderId: string, isPaid: boolean) => {
    try {
      // Get current order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('total, amount_paid')
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;

      const newAmountPaid = isPaid ? order.total : 0;
      
      const { error: updateError } = await supabase
        .from('orders')
        .update({ amount_paid: newAmountPaid })
        .eq('id', orderId);

      if (updateError) throw updateError;

      // Update local state
      setOrderDetails(prev => prev.map(detail => 
        detail.orderId === orderId ? { ...detail, isPaid } : detail
      ));
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
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Pedidos de este producto</h2>
          
          {isLoading ? (
            <div className="text-center py-8">Cargando...</div>
          ) : orderDetails.length > 0 ? (
            <div className="space-y-3">
              {orderDetails.map(detail => (
                <div key={detail.id} className="p-4 border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{detail.clientName}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="flex items-center gap-1 bg-blue-50">
                        <Package className="h-3 w-3" />
                        <span>{detail.quantity}</span>
                      </Badge>
                      <Badge variant="outline" className="flex items-center gap-1 bg-blue-50">
                        <DollarSign className="h-3 w-3" />
                        <span>{detail.balance}</span>
                      </Badge>
                      <div className="relative inline-flex h-4 w-8 cursor-pointer rounded-full bg-gray-200 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary" onClick={() => handlePaymentToggle(detail.orderId, !detail.isPaid)}>
                        <span
                          className={`${
                            detail.isPaid ? 'translate-x-4 bg-primary' : 'translate-x-0 bg-gray-400'
                          } pointer-events-none inline-block h-4 w-4 transform rounded-full shadow-lg transition duration-200 ease-in-out`}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No hay pedidos para este producto
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default ProductDetails;
