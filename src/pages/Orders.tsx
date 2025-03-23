
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useEffect, useState } from "react";
import { Order } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Link } from "react-router-dom";
import { Wand, ClipboardList, User, Calendar, Tag, DollarSign, PiggyBank, CheckCircle, XCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface OrderFromDB {
  id: string;
  client_id: string;
  date: string | null;
  status: string;
  total: number;
  amount_paid: number;
  balance: number;
  created_at?: string | null;
  updated_at?: string | null;
}

const Orders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [clientMap, setClientMap] = useState<{ [key: string]: { name: string } }>({});
  const { toast } = useToast();

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false });

        if (ordersError) {
          throw ordersError;
        }

        // Fetch client names for each order
        if (ordersData) {
          const clientIds = [...new Set(ordersData.map(order => order.client_id))];
          const { data: clientsData, error: clientsError } = await supabase
            .from('clients')
            .select('id, name')
            .in('id', clientIds);

          if (clientsError) {
            throw clientsError;
          }

          if (clientsData) {
            const clientMap: { [key: string]: { name: string } } = {};
            clientsData.forEach(client => {
              clientMap[client.id] = { name: client.name };
            });
            setClientMap(clientMap);
            
            // Transformar los datos al formato requerido por la interfaz Order
            const transformedOrders: Order[] = ordersData.map((order: OrderFromDB) => ({
              id: order.id,
              clientId: order.client_id,
              clientName: clientMap[order.client_id]?.name || "Cliente desconocido",
              date: order.date || "",
              status: order.status as 'pending' | 'completed' | 'cancelled',
              items: [], // No tenemos los items en esta consulta
              total: order.total,
              amountPaid: order.amount_paid,
              balance: order.balance
            }));
            
            setOrders(transformedOrders);
          }
        }
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    };

    fetchOrders();
  }, [toast]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Completado</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-500 flex items-center gap-1"><XCircle className="h-3 w-3" /> Cancelado</Badge>;
      default:
        return <Badge className="bg-yellow-500 flex items-center gap-1"><Clock className="h-3 w-3" /> Pendiente</Badge>;
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <ClipboardList className="h-7 w-7 text-primary" />
              Pedidos
            </h1>
            <p className="text-muted-foreground">Administra los pedidos de tus clientes</p>
          </div>
          <Button asChild className="flex items-center gap-2">
            <Link to="/magic-order">
              <Wand className="h-4 w-4" />
              <span>Mensaje Mágico</span>
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              Lista de Pedidos
            </CardTitle>
            <CardDescription>
              Aquí puedes ver todos los pedidos registrados en el sistema.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">ID</TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      Cliente
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Fecha
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      <Tag className="h-4 w-4" />
                      Estado
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      Total
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-4 w-4" />
                      Pagado
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      <PiggyBank className="h-4 w-4" />
                      Balance
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.id}</TableCell>
                    <TableCell>{order.clientName}</TableCell>
                    <TableCell>{order.date}</TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell>${order.total.toFixed(2)}</TableCell>
                    <TableCell>${order.amountPaid.toFixed(2)}</TableCell>
                    <TableCell>${order.balance.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                {orders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                      No hay pedidos registrados
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Orders;
