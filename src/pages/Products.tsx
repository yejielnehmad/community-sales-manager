
import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Product, ProductVariant } from "@/types";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, ChevronDown, ChevronUp, ShoppingBag, Pencil, Trash, Tag, Loader2, PlusCircle, MinusCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

type ProductFormValues = {
  name: string;
  description: string;
  price: string;
};

type VariantFormValues = {
  name: string;
  price: string;
};

const Products = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [openCollapsibles, setOpenCollapsibles] = useState<{[key: string]: boolean}>({});
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openVariantDialog, setOpenVariantDialog] = useState(false);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);
  
  const form = useForm<ProductFormValues>({
    defaultValues: {
      name: "",
      description: "",
      price: ""
    }
  });
  
  const editForm = useForm<ProductFormValues>({
    defaultValues: {
      name: "",
      description: "",
      price: ""
    }
  });
  
  const variantForm = useForm<VariantFormValues>({
    defaultValues: {
      name: "",
      price: ""
    }
  });
  
  // Cargar productos
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');
      
      if (error) throw error;
      
      // Obtener variantes para cada producto
      const productsWithVariants = await Promise.all(
        (data || []).map(async (product) => {
          const { data: variantsData, error: variantsError } = await supabase
            .from('product_variants')
            .select('*')
            .eq('product_id', product.id);
          
          if (variantsError) throw variantsError;
          
          return {
            id: product.id,
            name: product.name,
            description: product.description || '',
            price: parseFloat(product.price),
            variants: variantsData?.map(v => ({
              id: v.id,
              name: v.name,
              price: parseFloat(v.price)
            })) || []
          } as Product;
        })
      );
      
      setProducts(productsWithVariants);
    } catch (error) {
      console.error('Error al cargar productos:', error);
      toast.error('Error al cargar los productos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);
  
  // Crear nuevo producto
  const handleCreateProduct = async (values: ProductFormValues) => {
    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .insert([
          { 
            name: values.name, 
            description: values.description,
            price: values.price
          }
        ])
        .select();
      
      if (error) throw error;
      
      toast.success('Producto creado correctamente');
      form.reset();
      fetchProducts();
    } catch (error) {
      console.error('Error al crear producto:', error);
      toast.error('Error al crear el producto');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Actualizar producto
  const handleUpdateProduct = async (values: ProductFormValues) => {
    if (!editingProduct) return;
    
    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .update({ 
          name: values.name, 
          description: values.description,
          price: values.price
        })
        .eq('id', editingProduct.id)
        .select();
      
      if (error) throw error;
      
      toast.success('Producto actualizado correctamente');
      setOpenEditDialog(false);
      fetchProducts();
    } catch (error) {
      console.error('Error al actualizar producto:', error);
      toast.error('Error al actualizar el producto');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Eliminar producto
  const handleDeleteProduct = async (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar este producto?')) {
      setIsDeleting(true);
      try {
        const { error } = await supabase
          .from('products')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
        
        toast.success('Producto eliminado correctamente');
        fetchProducts();
      } catch (error) {
        console.error('Error al eliminar producto:', error);
        toast.error('Error al eliminar el producto');
      } finally {
        setIsDeleting(false);
      }
    }
  };
  
  // Abrir diálogo de edición
  const openEditProductDialog = (product: Product) => {
    setEditingProduct(product);
    editForm.setValue('name', product.name);
    editForm.setValue('description', product.description);
    editForm.setValue('price', product.price.toString());
    setOpenEditDialog(true);
  };
  
  // Abrir diálogo de variantes
  const openManageVariants = (product: Product) => {
    setEditingProduct(product);
    setVariants(product.variants || []);
    variantForm.reset();
    setEditingVariant(null);
    setOpenVariantDialog(true);
  };
  
  // Crear variante
  const handleCreateVariant = async (values: VariantFormValues) => {
    if (!editingProduct) return;
    
    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from('product_variants')
        .insert([
          { 
            product_id: editingProduct.id,
            name: values.name, 
            price: values.price
          }
        ])
        .select();
      
      if (error) throw error;
      
      toast.success('Variante creada correctamente');
      variantForm.reset();
      
      // Actualizar la lista de variantes localmente
      if (data && data[0]) {
        const newVariant: ProductVariant = {
          id: data[0].id,
          name: data[0].name,
          price: parseFloat(data[0].price)
        };
        
        setVariants(prev => [...prev, newVariant]);
      }
      
      // Recargar productos
      fetchProducts();
    } catch (error) {
      console.error('Error al crear variante:', error);
      toast.error('Error al crear la variante');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Editar variante
  const editVariant = (variant: ProductVariant) => {
    setEditingVariant(variant);
    variantForm.setValue('name', variant.name);
    variantForm.setValue('price', variant.price.toString());
  };
  
  // Actualizar variante
  const handleUpdateVariant = async (values: VariantFormValues) => {
    if (!editingVariant) return;
    
    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from('product_variants')
        .update({ 
          name: values.name, 
          price: values.price
        })
        .eq('id', editingVariant.id)
        .select();
      
      if (error) throw error;
      
      toast.success('Variante actualizada correctamente');
      
      // Actualizar la lista de variantes localmente
      setVariants(prev => prev.map(v => 
        v.id === editingVariant.id 
          ? { ...v, name: values.name, price: parseFloat(values.price) } 
          : v
      ));
      
      // Recargar productos
      fetchProducts();
      
      // Restablecer formulario
      variantForm.reset();
      setEditingVariant(null);
    } catch (error) {
      console.error('Error al actualizar variante:', error);
      toast.error('Error al actualizar la variante');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Eliminar variante
  const handleDeleteVariant = async (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar esta variante?')) {
      setIsDeleting(true);
      try {
        const { error } = await supabase
          .from('product_variants')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
        
        toast.success('Variante eliminada correctamente');
        
        // Actualizar la lista de variantes localmente
        setVariants(prev => prev.filter(v => v.id !== id));
        
        // Recargar productos
        fetchProducts();
      } catch (error) {
        console.error('Error al eliminar variante:', error);
        toast.error('Error al eliminar la variante');
      } finally {
        setIsDeleting(false);
      }
    }
  };
  
  // Toggle collapsible
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
            <h1 className="text-2xl font-bold tracking-tight">Productos</h1>
            <p className="text-muted-foreground">Gestiona tus productos y variantes</p>
          </div>
        </div>
        
        <Card>
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCreateProduct)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre</FormLabel>
                        <FormControl>
                          <Input placeholder="Nombre del producto" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Precio</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Descripción del producto" {...field} />
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
                        <Plus className="mr-2 h-4 w-4" />
                        Nuevo Producto
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
          ) : products.length > 0 ? (
            products.map(product => (
              <Collapsible
                key={product.id}
                open={openCollapsibles[product.id]}
                onOpenChange={() => toggleCollapsible(product.id)}
                className="border rounded-lg overflow-hidden"
              >
                <CollapsibleTrigger asChild>
                  <div className="p-4 flex justify-between items-center cursor-pointer hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                      <ShoppingBag className="h-5 w-5 text-primary" />
                      <div>
                        <h3 className="font-medium">{product.name}</h3>
                        <p className="text-sm text-muted-foreground">${product.price.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {product.variants && product.variants.length > 0 && (
                        <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">
                          {product.variants.length} variantes
                        </span>
                      )}
                      {openCollapsibles[product.id] ? (
                        <ChevronUp className="h-5 w-5" />
                      ) : (
                        <ChevronDown className="h-5 w-5" />
                      )}
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="border-t p-4 space-y-3">
                    {product.description && (
                      <p className="text-sm">{product.description}</p>
                    )}
                    
                    {product.variants && product.variants.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">Variantes:</h4>
                        <div className="space-y-1">
                          {product.variants.map(variant => (
                            <div key={variant.id} className="flex justify-between items-center p-2 bg-muted/30 rounded text-sm">
                              <div className="flex items-center gap-2">
                                <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>{variant.name}</span>
                              </div>
                              <span>${variant.price.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openManageVariants(product)}
                      >
                        <Tag className="h-4 w-4 mr-1" />
                        Variantes
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditProductDialog(product)}
                      >
                        <Pencil className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteProduct(product.id)}
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
              <p>No hay productos registrados</p>
            </div>
          )}
        </div>
        
        {/* Diálogo de edición */}
        <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Producto</DialogTitle>
            </DialogHeader>
            
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(handleUpdateProduct)} className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input placeholder="Nombre del producto" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Precio</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Descripción del producto" {...field} />
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
                        <Pencil className="mr-2 h-4 w-4" />
                        Guardar Cambios
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        
        {/* Diálogo de variantes */}
        <Dialog open={openVariantDialog} onOpenChange={setOpenVariantDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Variantes de {editingProduct?.name}</DialogTitle>
            </DialogHeader>
            
            <Form {...variantForm}>
              <form onSubmit={variantForm.handleSubmit(editingVariant ? handleUpdateVariant : handleCreateVariant)} className="space-y-4">
                <FormField
                  control={variantForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre de la variante</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Tamaño grande" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={variantForm.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Precio</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} />
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
                    ) : editingVariant ? (
                      <>
                        <Pencil className="mr-2 h-4 w-4" />
                        Actualizar Variante
                      </>
                    ) : (
                      <>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Agregar Variante
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
            
            {editingVariant && (
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => {
                  setEditingVariant(null);
                  variantForm.reset();
                }}
              >
                <MinusCircle className="mr-2 h-4 w-4" />
                Cancelar Edición
              </Button>
            )}
            
            <ScrollArea className="max-h-64 mt-2">
              <div className="space-y-2">
                {variants.length > 0 ? (
                  variants.map(variant => (
                    <div key={variant.id} className="flex justify-between items-center p-2 border rounded">
                      <div>
                        <p className="font-medium">{variant.name}</p>
                        <p className="text-sm text-muted-foreground">${variant.price.toFixed(2)}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => editVariant(variant)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDeleteVariant(variant.id)}>
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-sm text-muted-foreground py-2">
                    Aún no hay variantes para este producto
                  </p>
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default Products;
