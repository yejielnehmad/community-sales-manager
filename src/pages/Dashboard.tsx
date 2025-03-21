
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingBag, Users, ClipboardList, Wallet } from "lucide-react";

const DashboardCard = ({ 
  title, 
  value, 
  description, 
  icon 
}: { 
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
}) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
);

const Dashboard = () => {
  // Aquí eventualmente obtendremos datos reales de Supabase
  const stats = {
    clients: 42,
    products: 16,
    orders: 8,
    pendingBalance: 2500
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Resumen de la venta comunitaria</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <DashboardCard
            title="Clientes"
            value={stats.clients.toString()}
            description="Total de clientes registrados"
            icon={<Users className="h-4 w-4 text-muted-foreground" />}
          />
          <DashboardCard
            title="Productos"
            value={stats.products.toString()}
            description="Productos en catálogo"
            icon={<ShoppingBag className="h-4 w-4 text-muted-foreground" />}
          />
          <DashboardCard
            title="Pedidos"
            value={stats.orders.toString()}
            description="Pedidos activos"
            icon={<ClipboardList className="h-4 w-4 text-muted-foreground" />}
          />
          <DashboardCard
            title="Saldo Pendiente"
            value={`$${stats.pendingBalance.toLocaleString()}`}
            description="Total a cobrar"
            icon={<Wallet className="h-4 w-4 text-muted-foreground" />}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Pedidos Recientes</CardTitle>
              <CardDescription>Los últimos pedidos registrados</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground py-6">No hay pedidos recientes</p>
            </CardContent>
          </Card>
          <Card>
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
