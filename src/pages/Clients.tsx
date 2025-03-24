
import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { supabase } from "@/lib/supabase";
import { Client } from "@/types";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, User, ChevronDown, ChevronUp, Edit, Trash, Loader2, Phone, Search, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type ClientFormValues = {
  name: string;
  phone: string;
};

const Clients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [openCollapsibles, setOpenCollapsibles] = useState<{[key: string]: boolean}>({});
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
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
      
      const formattedClients = data.map(client => ({
        id: client.id,
        name: client.name,
        phone: client.phone || '',
        createdAt: client.created_at
      }));
      
      setClients(formattedClients);
      setFilteredClients(formattedClients);
    } catch (error) {
      console.error('Error al cargar clientes:', error);
      alert('Error al cargar los clientes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    if (searchTerm.trim()) {
      const filtered = clients.filter(client => 
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (client.phone && client.phone.includes(searchTerm))
      );
      setFilteredClients(filtered);
    } else {
      setFilteredClients(clients);
    }
  }, [searchTerm, clients]);

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
      
      alert('Cliente creado correctamente');
      form.reset();
      setOpenAddDialog(false);
      fetchClients();
    } catch (error) {
      console.error('Error al crear cliente:', error);
      alert('Error al crear el cliente');
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
      
      alert('Cliente actualizado correctamente');
      setOpenEditDialog(false);
      fetchClients();
    } catch (error) {
      console.error('Error al actualizar cliente:', error);
      alert('Error al actualizar el cliente');
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
        
        alert('Cliente eliminado correctamente');
        fetchClients();
      } catch (error) {
        console.error('Error al eliminar cliente:', error);
        alert('Error al eliminar el cliente');
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
  
  const openAddClientDialog = () => {
    form.reset();
    setOpenAddDialog(true);
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
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-3">Clientes</h1>
          <div className="relative mb-4">
            <Input
              placeholder="Buscar cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-8 rounded-lg"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm("")}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        
        <div className="flex justify-end">
          <Button onClick={openAddClientDialog} className="rounded-lg">
            <Plus className="mr-2 h-4 w-4" />
            Agregar
          </Button>
        </div>
        
        <div className="space-y-2">
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredClients.length > 0 ? (
            filteredClients.map(client => (
              <Collapsible
                key={client.id}
                open={openCollapsibles[client.id]}
                onOpenChange={() => toggleCollapsible(client.id)}
                className="border rounded-lg overflow-hidden transition-all duration-200 hover:shadow-sm"
              >
                <CollapsibleTrigger asChild>
                  <div className="p-3 flex justify-between items-center cursor-pointer hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 rounded-full p-2">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium">{client.name}</h3>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          {client.phone ? (
                            <>
                              <Phone className="h-3 w-3" />
                              {client.phone}
                            </>
                          ) : (
                            'Sin teléfono'
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {openCollapsibles[client.id] ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="border-t p-3 space-y-3 bg-muted/10">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs rounded-lg"
                        onClick={() => openEditClientDialog(client)}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-7 px-2 text-xs rounded-lg"
                        onClick={() => handleDeleteClient(client.id)}
                        disabled={isDeleting}
                      >
                        <Trash className="h-3 w-3 mr-1" />
                        Eliminar
                      </Button>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))
          ) : (
            <div className="text-center p-8 bg-muted/20 rounded-lg">
              {searchTerm ? (
                <p>No se encontraron clientes que coincidan con "{searchTerm}"</p>
              ) : (
                <p>No hay clientes registrados</p>
              )}
            </div>
          )}
        </div>
        
        {/* Diálogo para agregar cliente */}
        <Dialog open={openAddDialog} onOpenChange={setOpenAddDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuevo Cliente</DialogTitle>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCreateClient)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input placeholder="Nombre del cliente" {...field} className="rounded-lg" />
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
                        <Input placeholder="Teléfono del cliente" {...field} className="rounded-lg" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end">
                  <Button type="submit" disabled={isSaving} className="rounded-lg">
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Crear Cliente
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        
        {/* Diálogo para editar cliente */}
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
                        <Input placeholder="Nombre del cliente" {...field} className="rounded-lg" />
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
                        <Input placeholder="Teléfono del cliente" {...field} className="rounded-lg" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end">
                  <Button type="submit" disabled={isSaving} className="rounded-lg">
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
