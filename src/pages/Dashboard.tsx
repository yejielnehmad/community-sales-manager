
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingBag, Users, ClipboardList, Wallet, ChevronRight, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";

type DashboardStat = {
  clients: number;
  products: number;
  orders: number;
  pendingBalance: number;
};

const DashboardCard = ({ 
  title, 
  value, 
  description, 
  icon,
  onClick,
  isLoading = false
}: { 
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  onClick?: () => void;
  isLoading?: boolean;
}) => (
  <Card 
    className={`transition-all hover:shadow-md rounded-xl ${onClick ? 'cursor-pointer card-hover' : ''}`}
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
      <div className="text-2xl font-bold">{isLoading ? '...' : value}</div>
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
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Dashboard</h1>
          <p className="text-muted-foreground">Resumen de la venta comunitaria</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <DashboardCard
            title="Clientes"
            value={stats.clients.toString()}
            description="Total de clientes registrados"
            icon={<Users className="h-4 w-4 text-blue-500" />}
            onClick={() => navigate('/clients')}
            isLoading={isLoading}
          />
          <DashboardCard
            title="Productos"
            value={stats.products.toString()}
            description="Productos en catálogo"
            icon={<ShoppingBag className="h-4 w-4 text-green-500" />}
            onClick={() => navigate('/products')}
            isLoading={isLoading}
          />
          <DashboardCard
            title="Pedidos"
            value={stats.orders.toString()}
            description="Pedidos activos"
            icon={<ClipboardList className="h-4 w-4 text-orange-500" />}
            onClick={() => navigate('/orders')}
            isLoading={isLoading}
          />
          <DashboardCard
            title="Saldo Pendiente"
            value={`$${stats.pendingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            description="Total a cobrar"
            icon={<Wallet className="h-4 w-4 text-purple-500" />}
            isLoading={isLoading}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="rounded-xl shadow-sm">
            <CardHeader>
              <CardTitle>Pedidos Recientes</CardTitle>
              <CardDescription>Los últimos pedidos registrados</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground py-6">No hay pedidos recientes</p>
            </CardContent>
          </Card>
          <Card className="rounded-xl shadow-sm">
            <CardHeader>
              <CardTitle>Productos Populares</CardTitle>
              <CardDescription>Los productos más solicitados</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground py-6">No hay datos suficientes</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
