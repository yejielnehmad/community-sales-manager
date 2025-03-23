
import { useEffect, useState, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingBag, Users, ClipboardList, Wallet, ChevronRight, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { ProductPendingBalances } from "@/components/ProductPendingBalances";
import { VersionInfo } from "@/components/VersionInfo";

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
      <div className="text-2xl font-bold">{isLoading ? '...' : animatedValue !== undefined ? animatedValue : value}</div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStat>({
    clients: 0,
    products: 0,
    orders: 0,
    pendingBalance: 0
  });
  const [isLoading, setIsLoading] = useState(true);

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

    fetchStats();
  }, []);

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary">Dashboard</h1>
            <p className="text-muted-foreground">Resumen de la venta comunitaria</p>
          </div>
          <VersionInfo />
        </div>

        {/* Productos con saldos pendientes - Ahora en la parte superior */}
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
      </div>
    </AppLayout>
  );
};

export default Dashboard;
