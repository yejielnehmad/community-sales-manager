
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ShoppingBag, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";

interface ProductBalance {
  id: string;
  name: string;
  pendingAmount: number;
}

export const ProductPendingBalances = () => {
  const [productBalances, setProductBalances] = useState<{ [key: string]: ProductBalance }>({});
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProductBalances();
  }, []);

  const fetchProductBalances = async () => {
    setIsLoading(true);
    try {
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name');

      if (productsError) {
        throw productsError;
      }

      const initialBalances: { [key: string]: ProductBalance } = {};
      products?.forEach(product => {
        initialBalances[product.id] = {
          id: product.id,
          name: product.name,
          pendingAmount: 0
        };
      });
      setProductBalances(initialBalances);

      const { data: orderItems, error: orderItemsError } = await supabase
        .from('order_items')
        .select('product_id, quantity, order_id')
        .not('order_id', 'is', null);

      if (orderItemsError) {
        throw orderItemsError;
      }

      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, status')
        .neq('status', 'completed');

      if (ordersError) {
        throw ordersError;
      }

      const pendingOrderIds = orders?.map(order => order.id) || [];
      const pendingOrderItems = orderItems?.filter(item => pendingOrderIds.includes(item.order_id));

      const updatedBalances: { [key: string]: ProductBalance } = { ...initialBalances };
      pendingOrderItems?.forEach(item => {
        if (updatedBalances[item.product_id]) {
          updatedBalances[item.product_id].pendingAmount += item.quantity;
        }
      });

      setProductBalances(updatedBalances);
    } catch (error: any) {
      console.error("Error fetching product balances:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProductClick = (productId: string) => {
    navigate(`/product-details/${productId}`);
  };

  return (
    <div>
      {isLoading ? (
        <div className="flex justify-center p-8">
          Cargando...
        </div>
      ) : (
        <div className="space-y-2">
          {Object.values(productBalances).map((product) => (
            <Card 
              key={product.id} 
              className="relative overflow-hidden transition-all duration-200 hover:shadow-md cursor-pointer border-l-4 w-full"
              style={{
                borderLeftColor: 'var(--primary)'
              }}
              onClick={() => handleProductClick(product.id)}
            >
              <CardContent className="p-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="bg-primary/10 p-1 rounded-full">
                      <ShoppingBag className="h-4 w-4 text-primary" />
                    </div>
                    <h3 className="font-medium text-sm line-clamp-1" title={product.name}>
                      {product.name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-lg font-bold">
                      {product.pendingAmount}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {Object.keys(productBalances).length === 0 && (
            <div className="text-center p-8 bg-muted/20 rounded-lg">
              <p>No hay productos registrados</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
