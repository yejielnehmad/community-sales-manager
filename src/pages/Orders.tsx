
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
import { MessageSquarePlus } from "lucide-react";

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
          .select('*');

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

  const tableData = orders.map(order => {
    return {
      id: order.id,
      client_name: clientMap[order.clientId]?.name || "Cliente desconocido",
      date: order.date || "",
      status: order.status || "Pendiente",
      total: String(order.total || "0"),
      amount_paid: String(order.amountPaid || "0"),
      balance: String(order.balance || "0")
    };
  });

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Órdenes</h1>
            <p className="text-muted-foreground">Administra las órdenes de tus clientes</p>
          </div>
          <Button asChild className="flex items-center gap-2">
            <Link to="/magic-order">
              <MessageSquarePlus className="h-4 w-4" />
              <span>Pedido Mágico</span>
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Órdenes</CardTitle>
            <CardDescription>
              Aquí puedes ver todas las órdenes registradas en el sistema.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">ID</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Pagado</TableHead>
                  <TableHead>Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableData.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.id}</TableCell>
                    <TableCell>{row.client_name}</TableCell>
                    <TableCell>{row.date}</TableCell>
                    <TableCell>{row.status}</TableCell>
                    <TableCell>{row.total}</TableCell>
                    <TableCell>{row.amount_paid}</TableCell>
                    <TableCell>{row.balance}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Orders;
