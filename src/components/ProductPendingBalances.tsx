
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight, Users, Package } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { getProductIcon } from "@/services/productIconService";

interface ProductBalance {
  id: string;
  name: string;
  pendingAmount: number;
  clientCount: number;
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
          pendingAmount: 0,
          clientCount: 0
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
        .select('id, status, client_id')
        .neq('status', 'completed');

      if (ordersError) {
        throw ordersError;
      }

      const pendingOrderIds = orders?.map(order => order.id) || [];
      const pendingOrderItems = orderItems?.filter(item => pendingOrderIds.includes(item.order_id));

      // Crear un objeto para rastrear clientes únicos por producto
      const clientsByProduct: { [key: string]: Set<string> } = {};
      
      // Inicializar para todos los productos
      products?.forEach(product => {
        clientsByProduct[product.id] = new Set();
      });
      
      // Recopilar clientes únicos por producto
      pendingOrderItems?.forEach(item => {
        const order = orders?.find(o => o.id === item.order_id);
        if (order && order.client_id) {
          const productId = item.product_id;
          clientsByProduct[productId]?.add(order.client_id);
        }
      });

      const updatedBalances: { [key: string]: ProductBalance } = { ...initialBalances };
      pendingOrderItems?.forEach(item => {
        if (updatedBalances[item.product_id]) {
          updatedBalances[item.product_id].pendingAmount += item.quantity;
        }
      });
      
      // Actualizar el conteo de clientes
      Object.keys(updatedBalances).forEach(productId => {
        if (clientsByProduct[productId]) {
          updatedBalances[productId].clientCount = clientsByProduct[productId].size;
        }
      });

      // Filtrar productos sin pedidos
      const filteredBalances: { [key: string]: ProductBalance } = {};
      Object.entries(updatedBalances).forEach(([productId, product]) => {
        if (product.pendingAmount > 0) {
          filteredBalances[productId] = product;
        }
      });

      setProductBalances(filteredBalances);
    } catch (error: any) {
      console.error("Error fetching product balances:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProductClick = (productId: string) => {
    navigate(`/product-details/${productId}`);
  };

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

  return (
    <div>
      {isLoading ? (
        <div className="flex justify-center p-8">
          Cargando...
        </div>
      ) : (
        <div className="space-y-5">
          {Object.values(productBalances).map((product) => {
            const ProductIcon = getProductIcon(product.name);
            const iconColor = getIconColor(product.name);
            
            return (
              <Card 
                key={product.id} 
                className="relative overflow-hidden transition-all duration-200 hover:shadow-md cursor-pointer border border-blue-300 w-full"
                onClick={() => handleProductClick(product.id)}
              >
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className={`bg-primary/10 p-1 rounded-full ${iconColor}`}>
                        <ProductIcon className="h-4 w-4" />
                      </div>
                      <h3 className="font-medium text-sm line-clamp-1" title={product.name}>
                        {product.name}
                      </h3>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="outline" className="flex items-center gap-1 bg-blue-50">
                        <Users className="h-3 w-3 text-blue-500" />
                        <span className="text-xs font-medium">{product.clientCount}</span>
                      </Badge>
                      <Badge variant="outline" className="flex items-center gap-1 bg-blue-50">
                        <Package className="h-3 w-3 text-blue-500" />
                        <span className="text-xs font-medium">{product.pendingAmount}</span>
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          
          {Object.keys(productBalances).length === 0 && (
            <div className="text-center p-8 bg-muted/20 rounded-lg">
              <p>No hay productos con pedidos pendientes</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
