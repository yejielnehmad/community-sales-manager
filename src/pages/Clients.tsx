import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Client } from "@/types";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, User, ChevronDown, ChevronUp, Phone, Edit, Trash, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type ClientFormValues = {
  name: string;
  phone: string;
};

const Clients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [openCollapsibles, setOpenCollapsibles] = useState<{[key: string]: boolean}>({});
  const [openEditDialog, setOpenEditDialog] = useState(false);
  
  const form = useForm<ClientFormValues>({
    defaultValues: {
      name: "",
      phone: ""
    }
  });
  
  const editForm = useForm<ClientFormValues>({
    defaultValues: {
      name: "",
      phone: ""
    }
  });

  const fetchClients = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name');
      
      if (error) throw error;
      
      const clientsWithStats = await Promise.all(
        data.map(async (client) => {
          const { count: ordersCount, error: ordersError } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('client_id', client.id);
          
          const { data: balanceData, error: balanceError } = await supabase
            .from('orders')
            .select('balance')
            .eq('client_id', client.id);
          
          const totalBalance = balanceData?.reduce((sum, order) => sum + parseFloat(order.balance.toString()), 0) || 0;
          
          return {
            id: client.id,
            name: client.name,
            phone: client.phone || '',
            createdAt: client.created_at,
            totalOrders: ordersCount || 0,
            balance: totalBalance
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

  const handleCreateClient = async (values: ClientFormValues) => {
    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .insert([
          { name: values.name, phone: values.phone }
        ])
        .select();
      
      if (error) throw error;
      
      toast.success('Cliente creado correctamente');
      form.reset();
      fetchClients();
    } catch (error) {
      console.error('Error al crear cliente:', error);
      toast.error('Error al crear el cliente');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleUpdateClient = async (values: ClientFormValues) => {
    if (!editingClient) return;
    
    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .update({ name: values.name, phone: values.phone })
        .eq('id', editingClient.id)
        .select();
      
      if (error) throw error;
      
      toast.success('Cliente actualizado correctamente');
      setOpenEditDialog(false);
      fetchClients();
    } catch (error) {
      console.error('Error al actualizar cliente:', error);
      toast.error('Error al actualizar el cliente');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleDeleteClient = async (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar este cliente?')) {
      setIsDeleting(true);
      try {
        const { error } = await supabase
          .from('clients')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
        
        toast.success('Cliente eliminado correctamente');
        fetchClients();
      } catch (error) {
        console.error('Error al eliminar cliente:', error);
        toast.error('Error al eliminar el cliente');
      } finally {
        setIsDeleting(false);
      }
    }
  };
  
  const openEditClientDialog = (client: Client) => {
    setEditingClient(client);
    editForm.setValue('name', client.name);
    editForm.setValue('phone', client.phone);
    setOpenEditDialog(true);
  };
  
  const toggleCollapsible = (id: string) => {
    setOpenCollapsibles(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
            <p className="text-muted-foreground">Gestiona tus clientes</p>
          </div>
        </div>
        
        <Card>
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCreateClient)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
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
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Teléfono</FormLabel>
                        <FormControl>
                          <Input placeholder="Teléfono del cliente" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="flex justify-end">
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Nuevo Cliente
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
        
        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : clients.length > 0 ? (
            clients.map(client => (
              <Collapsible
                key={client.id}
                open={openCollapsibles[client.id]}
                onOpenChange={() => toggleCollapsible(client.id)}
                className="border rounded-lg overflow-hidden"
              >
                <CollapsibleTrigger asChild>
                  <div className="p-4 flex justify-between items-center cursor-pointer hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                      <User className="h-5 w-5 text-primary" />
                      <div>
                        <h3 className="font-medium">{client.name}</h3>
                        <p className="text-sm text-muted-foreground">{client.phone || 'Sin teléfono'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {openCollapsibles[client.id] ? (
                        <ChevronUp className="h-5 w-5" />
                      ) : (
                        <ChevronDown className="h-5 w-5" />
                      )}
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="border-t p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-sm font-medium">Pedidos totales</p>
                        <p className="text-lg">{client.totalOrders}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Saldo pendiente</p>
                        <p className="text-lg">${client.balance.toFixed(2)}</p>
                      </div>
                    </div>
                    
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditClientDialog(client)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteClient(client.id)}
                        disabled={isDeleting}
                      >
                        <Trash className="h-4 w-4 mr-1" />
                        Eliminar
                      </Button>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))
          ) : (
            <div className="text-center p-8 bg-muted/20 rounded-lg">
              <p>No hay clientes registrados</p>
            </div>
          )}
        </div>
        
        <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Cliente</DialogTitle>
            </DialogHeader>
            
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(handleUpdateClient)} className="space-y-4">
                <FormField
                  control={editForm.control}
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
                  control={editForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono</FormLabel>
                      <FormControl>
                        <Input placeholder="Teléfono del cliente" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end">
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Edit className="mr-2 h-4 w-4" />
                        Actualizar Cliente
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default Clients;
