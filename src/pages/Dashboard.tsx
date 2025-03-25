
import { useEffect, useState, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { ShoppingBag, Users, ClipboardList, Wallet, ChevronRight, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStat>({
    clients: 0,
    products: 0,
    orders: 0,
    pendingBalance: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [openCards, setOpenCards] = useState<{[key: string]: boolean}>({});

  // Valores animados
  const animatedClients = useCountUp(stats.clients, 1200, 100);
  const animatedProducts = useCountUp(stats.products, 1200, 200);
  const animatedOrders = useCountUp(stats.orders, 1200, 300);
  const animatedBalance = useCountUp(stats.pendingBalance, 1500, 400);

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);
      try {
        const { count: clientsCount, error: clientsError } = await supabase
          .from('clients')
          .select('*', { count: 'exact', head: true });

        const { count: productsCount, error: productsError } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true });

        const { count: ordersCount, error: ordersError } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true });

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

  const toggleCard = (key: string) => {
    setOpenCards(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary">Dashboard</h1>
          </div>
        </div>

        <div className="space-y-3">
          <Collapsible 
            open={openCards['clients']} 
            onOpenChange={() => toggleCard('clients')}
            className="border rounded-lg overflow-hidden transition-all duration-200 hover:shadow-sm"
          >
            <CollapsibleTrigger className="w-full p-0">
              <div className="p-4 flex justify-between items-center cursor-pointer hover:bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-500/10 rounded-full p-2">
                    <Users className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-medium">Clientes</h3>
                    <div className="text-2xl font-bold">{isLoading ? '...' : animatedClients}</div>
                  </div>
                </div>
                <div className="flex items-center">
                  {openCards['clients'] ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="border-t p-4 bg-muted/10">
                <p className="text-sm text-muted-foreground">Total de clientes registrados</p>
                <div className="flex justify-end mt-2">
                  <button 
                    className="text-sm flex items-center gap-1 text-primary hover:underline"
                    onClick={() => navigate('/clients')}
                  >
                    Ver todos <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Collapsible 
            open={openCards['products']} 
            onOpenChange={() => toggleCard('products')}
            className="border rounded-lg overflow-hidden transition-all duration-200 hover:shadow-sm"
          >
            <CollapsibleTrigger className="w-full p-0">
              <div className="p-4 flex justify-between items-center cursor-pointer hover:bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="bg-green-500/10 rounded-full p-2">
                    <ShoppingBag className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <h3 className="font-medium">Productos</h3>
                    <div className="text-2xl font-bold">{isLoading ? '...' : animatedProducts}</div>
                  </div>
                </div>
                <div className="flex items-center">
                  {openCards['products'] ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="border-t p-4 bg-muted/10">
                <p className="text-sm text-muted-foreground">Productos en catálogo</p>
                <div className="flex justify-end mt-2">
                  <button 
                    className="text-sm flex items-center gap-1 text-primary hover:underline"
                    onClick={() => navigate('/products')}
                  >
                    Ver todos <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Collapsible 
            open={openCards['orders']} 
            onOpenChange={() => toggleCard('orders')}
            className="border rounded-lg overflow-hidden transition-all duration-200 hover:shadow-sm"
          >
            <CollapsibleTrigger className="w-full p-0">
              <div className="p-4 flex justify-between items-center cursor-pointer hover:bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="bg-orange-500/10 rounded-full p-2">
                    <ClipboardList className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <h3 className="font-medium">Pedidos</h3>
                    <div className="text-2xl font-bold">{isLoading ? '...' : animatedOrders}</div>
                  </div>
                </div>
                <div className="flex items-center">
                  {openCards['orders'] ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="border-t p-4 bg-muted/10">
                <p className="text-sm text-muted-foreground">Pedidos activos</p>
                <div className="flex justify-end mt-2">
                  <button 
                    className="text-sm flex items-center gap-1 text-primary hover:underline"
                    onClick={() => navigate('/orders')}
                  >
                    Ver todos <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Collapsible 
            open={openCards['balance']} 
            onOpenChange={() => toggleCard('balance')}
            className="border rounded-lg overflow-hidden transition-all duration-200 hover:shadow-sm"
          >
            <CollapsibleTrigger className="w-full p-0">
              <div className="p-4 flex justify-between items-center cursor-pointer hover:bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="bg-purple-500/10 rounded-full p-2">
                    <Wallet className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <h3 className="font-medium">Saldo Pendiente</h3>
                    <div className="text-2xl font-bold">
                      {isLoading ? '...' : `$${animatedBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center">
                  {openCards['balance'] ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="border-t p-4 bg-muted/10">
                <p className="text-sm text-muted-foreground">Total a cobrar</p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
