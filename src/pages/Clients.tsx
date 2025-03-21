
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search } from "lucide-react";
import { useState } from "react";
import { Client } from "@/types";

const Clients = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  
  // Mock data - eventualmente vendrá de Supabase
  const mockClients: Client[] = [
    {
      id: "1",
      name: "María López",
      phone: "555-1234",
      createdAt: "2023-06-10",
      totalOrders: 5,
      balance: 850
    },
    {
      id: "2",
      name: "Juan Pérez",
      phone: "555-5678",
      createdAt: "2023-06-12",
      totalOrders: 3,
      balance: 320
    },
  ];

  // Filtrar clientes según el término de búsqueda
  const filteredClients = mockClients.filter(
    client => client.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Función para añadir un nuevo cliente (mock)
  const handleAddClient = () => {
    if (newClientName.trim()) {
      // Aquí eventualmente añadiremos el cliente a Supabase
      console.log("Añadiendo cliente:", { name: newClientName, phone: newClientPhone });
      setNewClientName("");
      setNewClientPhone("");
      setIsAddingClient(false);
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
            <p className="text-muted-foreground">Gestiona los clientes de la venta comunitaria</p>
          </div>
          <Button onClick={() => setIsAddingClient(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Añadir Cliente
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar clientes..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {isAddingClient && (
          <div className="flex flex-col gap-4 p-4 border rounded-lg bg-card">
            <h3 className="font-medium">Añadir Nuevo Cliente</h3>
            <div className="flex flex-col gap-4">
              <Input
                placeholder="Nombre del cliente"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
              />
              <Input
                placeholder="Teléfono (opcional)"
                value={newClientPhone}
                onChange={(e) => setNewClientPhone(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddingClient(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAddClient}>
                  Guardar
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Pedidos</TableHead>
                <TableHead>Saldo Pendiente</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.length > 0 ? (
                filteredClients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell>{client.phone || "-"}</TableCell>
                    <TableCell>{client.totalOrders}</TableCell>
                    <TableCell>${client.balance}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        Ver detalles
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No se encontraron clientes.
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

export default Clients;
