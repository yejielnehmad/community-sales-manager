
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Phone, Edit, Trash, ChevronDown, ChevronUp } from "lucide-react";
import { useState, useEffect } from "react";
import { Client } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { Badge } from "@/components/ui/badge";

const Clients = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [isEditingClient, setIsEditingClient] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  
  const addClientForm = useForm({
    defaultValues: {
      name: "",
      phone: "",
    }
  });

  const editClientForm = useForm({
    defaultValues: {
      name: "",
      phone: "",
    }
  });
  
  // Cargar clientes desde Supabase
  const fetchClients = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*');
      
      if (error) throw error;
      
      // Obtener total de pedidos y saldo por cliente
      const clientsWithStats = await Promise.all(
        (data || []).map(async (client) => {
          // Contar pedidos
          const { count: totalOrders, error: countError } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('client_id', client.id);
          
          // Obtener suma de balances
          const { data: ordersData, error: balanceError } = await supabase
            .from('orders')
            .select('balance')
            .eq('client_id', client.id);
          
          const balance = ordersData?.reduce((sum, order) => sum + parseFloat(order.balance), 0) || 0;
          
          return {
            id: client.id,
            name: client.name,
            phone: client.phone || '',
            createdAt: client.created_at,
            totalOrders: totalOrders || 0,
            balance
          } as Client;
        })
      );
      
      setClients(clientsWithStats);
    } catch (error) {
      console.error('Error al cargar clientes:', error);
      toast.error('Error al cargar los clientes');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchClients();
  }, []);
  
  // Filtrar clientes según el término de búsqueda
  const filteredClients = clients.filter(
    client => client.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Función para añadir un nuevo cliente
  const handleAddClient = async (data: { name: string, phone: string }) => {
    try {
      const { data: newClient, error } = await supabase
        .from('clients')
        .insert([
          { name: data.name, phone: data.phone || null }
        ])
        .select()
        .single();
      
      if (error) throw error;
      
      toast.success('Cliente añadido correctamente');
      addClientForm.reset();
      setIsAddingClient(false);
      
      // Añadir el nuevo cliente a la lista
      setClients(prev => [...prev, {
        id: newClient.id,
        name: newClient.name,
        phone: newClient.phone || '',
        createdAt: newClient.created_at,
        totalOrders: 0,
        balance: 0
      }]);
    } catch (error) {
      console.error('Error al añadir cliente:', error);
      toast.error('Error al añadir el cliente');
    }
  };
  
  // Función para editar un cliente
  const handleEditClient = async (data: { name: string, phone: string }) => {
    if (!isEditingClient) return;
    
    try {
      const { error } = await supabase
        .from('clients')
        .update({ 
          name: data.name, 
          phone: data.phone || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', isEditingClient);
      
      if (error) throw error;
      
      toast.success('Cliente actualizado correctamente');
      setIsEditingClient(null);
      
      // Actualizar cliente en la lista
      setClients(prev => prev.map(client => 
        client.id === isEditingClient 
          ? { ...client, name: data.name, phone: data.phone || '' }
          : client
      ));
    } catch (error) {
      console.error('Error al actualizar cliente:', error);
      toast.error('Error al actualizar el cliente');
    }
  };
  
  // Iniciar edición de cliente
  const startEditingClient = (client: Client) => {
    editClientForm.reset({
      name: client.name,
      phone: client.phone || ""
    });
    setIsEditingClient(client.id);
  };
  
  // Función para eliminar un cliente
  const handleDeleteClient = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este cliente? Esta acción no se puede deshacer.')) return;
    
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success('Cliente eliminado correctamente');
      
      // Eliminar cliente de la lista
      setClients(prev => prev.filter(client => client.id !== id));
    } catch (error) {
      console.error('Error al eliminar cliente:', error);
      toast.error('Error al eliminar el cliente');
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
            <p className="text-muted-foreground">Gestiona los clientes de la venta comunitaria</p>
          </div>
          <Button onClick={() => setIsAddingClient(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Añadir Cliente
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar clientes..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {isAddingClient && (
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-medium mb-4">Añadir Nuevo Cliente</h3>
              <Form {...addClientForm}>
                <form onSubmit={addClientForm.handleSubmit(handleAddClient)} className="space-y-4">
                  <FormField
                    control={addClientForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre</FormLabel>
                        <FormControl>
                          <Input placeholder="Nombre del cliente" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={addClientForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Teléfono (opcional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Teléfono" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" type="button" onClick={() => setIsAddingClient(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit">
                      Guardar
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        {isEditingClient && (
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-medium mb-4">Editar Cliente</h3>
              <Form {...editClientForm}>
                <form onSubmit={editClientForm.handleSubmit(handleEditClient)} className="space-y-4">
                  <FormField
                    control={editClientForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editClientForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Teléfono (opcional)</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" type="button" onClick={() => setIsEditingClient(null)}>
                      Cancelar
                    </Button>
                    <Button type="submit">
                      Actualizar
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        <Accordion type="multiple" className="space-y-2">
          {loading ? (
            <div className="flex justify-center p-6">
              <p>Cargando clientes...</p>
            </div>
          ) : filteredClients.length > 0 ? (
            filteredClients.map((client) => (
              <Card key={client.id} className="overflow-hidden">
                <AccordionItem value={client.id} className="border-none">
                  <AccordionTrigger className="px-4 py-3 hover:bg-muted/50 w-full flex justify-between">
                    <div className="flex flex-1 justify-between items-center">
                      <div className="font-medium text-left">{client.name}</div>
                      <div className="flex items-center gap-2 mr-4">
                        {client.balance > 0 && (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                            Saldo: ${client.balance}
                          </Badge>
                        )}
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {client.totalOrders} {client.totalOrders === 1 ? 'pedido' : 'pedidos'}
                        </Badge>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{client.phone || "No disponible"}</span>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex items-center gap-1"
                          onClick={() => startEditingClient(client)}
                        >
                          <Edit className="h-4 w-4" />
                          Editar
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          className="flex items-center gap-1"
                          onClick={() => handleDeleteClient(client.id)}
                        >
                          <Trash className="h-4 w-4" />
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Card>
            ))
          ) : (
            <div className="text-center p-6 bg-muted/20 rounded-lg">
              <p>No se encontraron clientes.</p>
            </div>
          )}
        </Accordion>
      </div>
    </AppLayout>
  );
};

export default Clients;
