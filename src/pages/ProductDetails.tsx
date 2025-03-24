
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { DataTable } from "@/components/ui/data-table";
import { ShoppingBag, ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { ColumnDef } from "@tanstack/react-table";

interface ProductDetailParams {
  productId: string;
}

interface OrderDetail {
  id: string;
  clientName: string;
  quantity: number;
  isPaid: boolean;
  orderId: string;
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
          .select('id, client_id, amount_paid, total')
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
              isPaid: isPaid
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

  const columns: ColumnDef<OrderDetail>[] = [
    {
      accessorKey: "clientName",
      header: "Cliente",
    },
    {
      accessorKey: "quantity",
      header: "Cantidad",
    },
    {
      id: "isPaid",
      header: "Pagado",
      cell: ({ row }) => {
        const detail = row.original;
        return (
          <Switch 
            checked={detail.isPaid}
            onCheckedChange={(checked) => handlePaymentToggle(detail.orderId, checked)}
          />
        );
      },
    }
  ];

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
            <div className="bg-primary/10 p-2 rounded-full">
              <ShoppingBag className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">{productName}</h1>
          </div>
        </div>

        <Card>
          <CardContent className="p-4">
            <h2 className="text-xl font-semibold mb-4">Pedidos de este producto</h2>
            
            {isLoading ? (
              <div className="text-center py-8">Cargando...</div>
            ) : orderDetails.length > 0 ? (
              <DataTable columns={columns} data={orderDetails} />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No hay pedidos para este producto
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default ProductDetails;
