
import { useEffect, useState, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ShoppingBag, Users, ClipboardList, Wallet, ChevronRight, Loader2, ArrowRight, Star } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { ProductPendingBalances } from "@/components/ProductPendingBalances";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getProductIcon } from "@/services/productIconService";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";

type DashboardStat = {
  clients: number;
  products: number;
  orders: number;
  pendingBalance: number;
};

// Hook personalizado para animación de contador
const useCountUp = (targetValue: number, duration: number = 1000, startDelay: number = 0) => {
  const [count, setCount] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);
  
  useEffect(() => {
    if (targetValue === 0) {
      setCount(0);
      return;
    }
    
    const startValue = Math.max(0, Math.floor(targetValue * 0.1));
    setCount(startValue);
    
    const timeout = setTimeout(() => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      
      const animate = (timestamp: number) => {
        if (!startTimeRef.current) {
          startTimeRef.current = timestamp;
        }
        
        const runtime = timestamp - startTimeRef.current;
        const relativeProgress = runtime / duration;
        
        if (relativeProgress < 1) {
          // Función de ease-out para hacer que la animación se desacelere al final
          const progress = 1 - Math.pow(1 - relativeProgress, 3);
          const nextCount = Math.floor(startValue + (targetValue - startValue) * progress);
          setCount(nextCount);
          frameRef.current = requestAnimationFrame(animate);
        } else {
          setCount(targetValue);
        }
      };
      
      frameRef.current = requestAnimationFrame(animate);
    }, startDelay);
    
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      clearTimeout(timeout);
    };
  }, [targetValue, duration, startDelay]);
  
  return count;
};

const DashboardCard = ({ 
  title, 
  value, 
  description, 
  icon,
  onClick,
  isLoading = false,
  animatedValue = 0
}: { 
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  onClick?: () => void;
  isLoading?: boolean;
  animatedValue?: number;
}) => (
  <Card 
    className={`transition-all hover:shadow-md rounded-xl ${onClick ? 'cursor-pointer hover:bg-muted/20' : ''}`}
    onClick={onClick}
  >
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <div className="flex items-center">
        {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin text-muted-foreground" /> : icon}
        {onClick && <ChevronRight className="h-4 w-4 ml-2 text-muted-foreground" />}
      </div>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{isLoading ? '...' : animatedValue !== undefined ? animatedValue.toString() : value}</div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
);

interface ProductSummaryCardProps {
  product: any;
  onCardClick: (productId: string) => void;
}

const ProductSummaryCard = ({ product, onCardClick }: ProductSummaryCardProps) => {
  const [ordersCount, setOrdersCount] = useState<number | null>(null);
  const [totalSales, setTotalSales] = useState<number | null>(null);
  const [pendingPayments, setPendingPayments] = useState<number | null>(null);
  const IconComponent = getProductIcon(product.name);
  
  useEffect(() => {
    const fetchProductStats = async () => {
      try {
        // Obtener items de pedido para este producto
        const { data: orderItems, error: itemsError } = await supabase
          .from('order_items')
          .select('*, orders(*)')
          .eq('product_id', product.id);
          
        if (itemsError) throw itemsError;
        
        // Contar pedidos únicos
        const uniqueOrderIds = new Set(orderItems?.map(item => item.order_id) || []);
        setOrdersCount(uniqueOrderIds.size);
        
        // Calcular ventas totales
        const sales = orderItems?.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0) || 0;
        setTotalSales(sales);
        
        // Calcular pagos pendientes
        const pending = orderItems?.reduce((sum, item) => {
          const order = item.orders;
          if (order && order.status !== 'completed') {
            // Calculamos la parte proporcional del balance pendiente para este item
            const orderTotal = orderItems
              .filter(oi => oi.order_id === item.order_id)
              .reduce((t, oi) => t + (parseFloat(oi.price) * oi.quantity), 0);
            
            const itemPercentage = (parseFloat(item.price) * item.quantity) / orderTotal;
            const itemPending = parseFloat(order.balance) * itemPercentage;
            
            return sum + itemPending;
          }
          return sum;
        }, 0) || 0;
        
        setPendingPayments(pending);
      } catch (error) {
        console.error(`Error obteniendo stats para producto ${product.id}:`, error);
      }
    };
    
    fetchProductStats();
  }, [product.id]);
  
  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-all"
      onClick={() => onCardClick(product.id)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
              <IconComponent className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{product.name}</CardTitle>
              <CardDescription className="text-xs line-clamp-1">
                {product.description || "Sin descripción"}
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="ml-2">
            {product.variants?.length || 0} variantes
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-sm font-medium">
              {ordersCount === null ? (
                <Loader2 className="h-3 w-3 animate-spin inline" />
              ) : (
                ordersCount
              )}
            </div>
            <div className="text-xs text-muted-foreground">Pedidos</div>
          </div>
          <div>
            <div className="text-sm font-medium">
              {totalSales === null ? (
                <Loader2 className="h-3 w-3 animate-spin inline" />
              ) : (
                `$${totalSales.toFixed(0)}`
              )}
            </div>
            <div className="text-xs text-muted-foreground">Ventas</div>
          </div>
          <div>
            <div className="text-sm font-medium">
              {pendingPayments === null ? (
                <Loader2 className="h-3 w-3 animate-spin inline" />
              ) : (
                `$${pendingPayments.toFixed(0)}`
              )}
            </div>
            <div className="text-xs text-muted-foreground">Pendiente</div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-0">
        <Button variant="ghost" size="sm" className="w-full text-xs justify-between">
          Ver detalles <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </CardFooter>
    </Card>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [stats, setStats] = useState<DashboardStat>({
    clients: 0,
    products: 0,
    orders: 0,
    pendingBalance: 0
  });
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  // Valores animados
  const animatedClients = useCountUp(stats.clients, 1200, 100);
  const animatedProducts = useCountUp(stats.products, 1200, 200);
  const animatedOrders = useCountUp(stats.orders, 1200, 300);
  const animatedBalance = useCountUp(stats.pendingBalance, 1500, 400);

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);
      try {
        // Obtener conteo de clientes
        const { count: clientsCount, error: clientsError } = await supabase
          .from('clients')
          .select('*', { count: 'exact', head: true });

        // Obtener conteo de productos
        const { count: productsCount, error: productsError } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true });

        // Obtener conteo de pedidos
        const { count: ordersCount, error: ordersError } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true });

        // Obtener balance pendiente total
        const { data: ordersData, error: balanceError } = await supabase
          .from('orders')
          .select('balance')
          .neq('status', 'completed');

        const pendingBalance = ordersData 
          ? ordersData.reduce((sum, order) => sum + (parseFloat(order.balance?.toString() || '0')), 0)
          : 0;

        setStats({
          clients: clientsCount || 0,
          products: productsCount || 0,
          orders: ordersCount || 0,
          pendingBalance: pendingBalance
        });
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    const fetchProducts = async () => {
      setIsLoadingProducts(true);
      try {
        // Obtener productos
        const { data, error } = await supabase
          .from('products')
          .select('*, variants:product_variants(*)')
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        
        setProducts(data || []);
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setIsLoadingProducts(false);
      }
    };

    fetchStats();
    fetchProducts();
  }, []);

  const navigateToProductDetail = (productId: string) => {
    navigate(`/product/${productId}`);
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center mb-2">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary">Dashboard</h1>
            <p className="text-muted-foreground">Resumen de la venta comunitaria</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <DashboardCard
            title="Clientes"
            value={stats.clients.toString()}
            description="Total de clientes registrados"
            icon={<Users className="h-4 w-4 text-blue-500" />}
            onClick={() => navigate('/clients')}
            isLoading={isLoading}
            animatedValue={animatedClients}
          />
          <DashboardCard
            title="Productos"
            value={stats.products.toString()}
            description="Productos en catálogo"
            icon={<ShoppingBag className="h-4 w-4 text-green-500" />}
            onClick={() => navigate('/products')}
            isLoading={isLoading}
            animatedValue={animatedProducts}
          />
          <DashboardCard
            title="Pedidos"
            value={stats.orders.toString()}
            description="Pedidos activos"
            icon={<ClipboardList className="h-4 w-4 text-orange-500" />}
            onClick={() => navigate('/orders')}
            isLoading={isLoading}
            animatedValue={animatedOrders}
          />
          <DashboardCard
            title="Saldo Pendiente"
            value={`$${stats.pendingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            description="Total a cobrar"
            icon={<Wallet className="h-4 w-4 text-purple-500" />}
            isLoading={isLoading}
            animatedValue={isLoading ? 0 : animatedBalance}
          />
        </div>

        {/* Productos con saldos pendientes */}
        <Card className="rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              Saldos Pendientes por Producto
            </CardTitle>
            <CardDescription>
              Total de dinero que falta recaudar por cada producto
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProductPendingBalances />
          </CardContent>
        </Card>

        {/* Tarjetas de productos */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Productos</h2>
            <Button size="sm" variant="outline" onClick={() => navigate('/products')}>
              Ver todos <ShoppingBag className="h-4 w-4 ml-2" />
            </Button>
          </div>
          
          {isLoadingProducts ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <ScrollArea className={isMobile ? "h-[500px]" : "h-auto"}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pr-2">
                {products.map((product) => (
                  <ProductSummaryCard 
                    key={product.id} 
                    product={product} 
                    onCardClick={navigateToProductDetail}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
