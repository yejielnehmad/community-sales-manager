
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search } from "lucide-react";
import { useState } from "react";
import { Order } from "@/types";

const OrderStatusBadge = ({ status }: { status: Order['status'] }) => {
  const statusConfig = {
    pending: { label: 'Pendiente', className: 'bg-yellow-500 hover:bg-yellow-600' },
    completed: { label: 'Completado', className: 'bg-green-500 hover:bg-green-600' },
    cancelled: { label: 'Cancelado', className: 'bg-red-500 hover:bg-red-600' },
  };
  
  const config = statusConfig[status];
  
  return (
    <Badge className={config.className}>
      {config.label}
    </Badge>
  );
};

const Orders = () => {
  const [searchTerm, setSearchTerm] = useState("");
  
  // Mock data - eventualmente vendrá de Supabase
  const mockOrders: Order[] = [
    {
      id: "1",
      clientId: "1",
      clientName: "María López",
      date: "2023-07-10",
      status: 'pending',
      items: [
        {
          id: "item1",
          productId: "1",
          productName: "Pañales Talla 1",
          quantity: 2,
          price: 250,
          total: 500
        }
      ],
      total: 500,
      amountPaid: 200,
      balance: 300
    },
    {
      id: "2",
      clientId: "2",
      clientName: "Juan Pérez",
      date: "2023-07-12",
      status: 'completed',
      items: [
        {
          id: "item2",
          productId: "2",
          productName: "Queso Fresco",
          quantity: 1.5,
          price: 120,
          total: 180
        }
      ],
      total: 180,
      amountPaid: 180,
      balance: 0
    }
  ];

  // Filtrar pedidos según el término de búsqueda
  const filteredOrders = mockOrders.filter(
    order => 
      order.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id.includes(searchTerm)
  );

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Pedidos</h1>
            <p className="text-muted-foreground">Gestiona los pedidos de la venta comunitaria</p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Pedido
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar por cliente o ID..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Saldo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.id}</TableCell>
                    <TableCell>{order.clientName}</TableCell>
                    <TableCell>{new Date(order.date).toLocaleDateString()}</TableCell>
                    <TableCell>${order.total}</TableCell>
                    <TableCell>${order.balance}</TableCell>
                    <TableCell>
                      <OrderStatusBadge status={order.status} />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        Ver detalles
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    No se encontraron pedidos.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  );
};

export default Orders;
