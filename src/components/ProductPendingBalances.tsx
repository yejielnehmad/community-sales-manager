
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { Loader2, ShoppingBag, Search, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Product {
  id: string;
  name: string;
  pendingBalance: number;
  pendingOrders: number;
  iconColor: string;
}

export const ProductPendingBalances = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPendingBalances();
  }, []);

  const fetchPendingBalances = async () => {
    setIsLoading(true);
    try {
      // Primero obtenemos todos los order_items con sus pedidos
      const { data: orderItems, error: orderItemsError } = await supabase
        .from("order_items")
        .select(`
          *,
          orders:order_id(id, status, balance, total, amount_paid)
        `);

      if (orderItemsError) throw orderItemsError;

      // Obtenemos todos los productos
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("*");

      if (productsError) throw productsError;

      // Calcular saldos pendientes por producto
      const productBalances: Record<string, { pendingBalance: number; pendingOrders: number; name: string; id: string }> = {};

      // Función para generar colores aleatorios pero armoniosos
      const generatePastelColor = () => {
        const hue = Math.floor(Math.random() * 360);
        return `hsl(${hue}, 70%, 80%)`;
      };

      orderItems?.forEach((item: any) => {
        const order = item.orders;
        // Solo consideramos órdenes pendientes con balance pendiente
        if (order && order.status !== 'cancelled' && order.balance > 0) {
          const productId = item.product_id;
          
          if (!productBalances[productId]) {
            const product = productsData?.find((p: any) => p.id === productId);
            if (product) {
              productBalances[productId] = {
                id: productId,
                name: product.name,
                pendingBalance: 0,
                pendingOrders: 0
              };
            }
          }
          
          if (productBalances[productId]) {
            // Calculamos la proporción del balance total que corresponde a este producto
            const itemTotal = Number(item.total) || 0;
            const orderTotal = Number(order.total) || 0;
            const orderBalance = Number(order.balance) || 0;
            
            if (orderTotal > 0) {
              const proportion = itemTotal / orderTotal;
              const itemBalance = orderBalance * proportion;
              
              productBalances[productId].pendingBalance += itemBalance;
              productBalances[productId].pendingOrders += 1;
            }
          }
        }
      });

      const productsWithBalances = Object.values(productBalances)
        .filter(product => product.pendingBalance > 0)
        .map(product => ({
          ...product,
          iconColor: generatePastelColor()
        }))
        .sort((a, b) => b.pendingBalance - a.pendingBalance);

      setProducts(productsWithBalances);
    } catch (error) {
      console.error("Error al cargar saldos pendientes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProductClick = (productId: string) => {
    navigate(`/product-details/${productId}`);
  };

  const filteredProducts = searchTerm
    ? products.filter(product => 
        product.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : products;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Productos con Pedidos Pendientes</h2>
        <div className="flex items-center gap-2">
          {showSearch && (
            <div className="relative w-[250px]">
              <Input
                placeholder="Buscar producto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-8 rounded-full"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
          <Button
            size="icon"
            variant="outline"
            className="rounded-full"
            onClick={() => setShowSearch(!showSearch)}
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredProducts.map((product) => (
            <div 
              key={product.id}
              onClick={() => handleProductClick(product.id)}
              className="flex flex-col p-4 border rounded-xl transition-all duration-200 hover:scale-[1.02] hover:border-primary cursor-pointer bg-card"
            >
              <div className="flex items-center gap-3 mb-2">
                <div 
                  className="p-2 rounded-full min-w-[40px] min-h-[40px] flex items-center justify-center" 
                  style={{ backgroundColor: product.iconColor }}
                >
                  <ShoppingBag className="h-5 w-5 text-white" />
                </div>
                <div className="font-medium line-clamp-1">{product.name}</div>
              </div>
              
              <div className="mt-auto pt-2 flex justify-between items-center">
                <span className="text-sm bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  {product.pendingOrders} {product.pendingOrders === 1 ? 'pedido' : 'pedidos'}
                </span>
                <span className="font-bold">${product.pendingBalance.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center p-8 border rounded-lg bg-muted/10">
          <p>No hay productos con saldos pendientes</p>
        </div>
      )}
    </div>
  );
};
