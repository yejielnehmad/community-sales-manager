
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Edit, Trash, ChevronDown, ChevronUp, PlusCircle, X } from "lucide-react";
import { useState, useEffect } from "react";
import { Product, ProductVariant } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { Textarea } from "@/components/ui/textarea";

const Products = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [isEditingProduct, setIsEditingProduct] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para manejar variantes en el formulario
  const [newVariants, setNewVariants] = useState<{name: string, price: string}[]>([]);
  const [editVariants, setEditVariants] = useState<(ProductVariant & {deleted?: boolean})[]>([]);
  
  const addProductForm = useForm({
    defaultValues: {
      name: "",
      description: "",
      price: "",
    }
  });

  const editProductForm = useForm({
    defaultValues: {
      name: "",
      description: "",
      price: "",
    }
  });
  
  // Cargar productos desde Supabase
  const fetchProducts = async () => {
    setLoading(true);
    try {
      // Obtener productos
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*');
      
      if (productsError) throw productsError;
      
      // Obtener variantes para cada producto
      const productsWithVariants = await Promise.all(
        (productsData || []).map(async (product) => {
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
  
  // Filtrar productos según el término de búsqueda
  const filteredProducts = products.filter(
    product => product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Agregar nueva variante en formulario
  const addVariant = () => {
    setNewVariants([...newVariants, {name: '', price: ''}]);
  };
  
  // Eliminar variante en formulario
  const removeVariant = (index: number) => {
    setNewVariants(newVariants.filter((_, i) => i !== index));
  };
  
  // Actualizar variante en formulario
  const updateVariant = (index: number, field: 'name' | 'price', value: string) => {
    const updated = [...newVariants];
    updated[index][field] = value;
    setNewVariants(updated);
  };
  
  // Agregar variante en formulario de edición
  const addEditVariant = () => {
    setEditVariants([...editVariants, {id: `new-${Date.now()}`, name: '', price: 0}]);
  };
  
  // Actualizar variante en formulario de edición
  const updateEditVariant = (index: number, field: 'name' | 'price', value: any) => {
    const updated = [...editVariants];
    if (field === 'price') {
      updated[index].price = parseFloat(value) || 0;
    } else {
      updated[index].name = value;
    }
    setEditVariants(updated);
  };
  
  // Marcar variante para eliminar
  const markEditVariantForDeletion = (index: number) => {
    const updated = [...editVariants];
    updated[index].deleted = true;
    setEditVariants(updated);
  };
  
  // Restaurar variante marcada para eliminar
  const unmarkEditVariantForDeletion = (index: number) => {
    const updated = [...editVariants];
    updated[index].deleted = false;
    setEditVariants(updated);
  };
  
  // Función para añadir un nuevo producto
  const handleAddProduct = async (data: { name: string, description: string, price: string }) => {
    try {
      // Insertar producto
      const { data: newProduct, error: productError } = await supabase
        .from('products')
        .insert([{
          name: data.name,
          description: data.description || null,
          price: parseFloat(data.price) || 0
        }])
        .select()
        .single();
      
      if (productError) throw productError;
      
      // Insertar variantes si existen
      if (newVariants.length > 0) {
        const variantsToInsert = newVariants
          .filter(v => v.name.trim() && parseFloat(v.price))
          .map(v => ({
            product_id: newProduct.id,
            name: v.name,
            price: parseFloat(v.price)
          }));
        
        if (variantsToInsert.length > 0) {
          const { error: variantsError } = await supabase
            .from('product_variants')
            .insert(variantsToInsert);
          
          if (variantsError) throw variantsError;
        }
      }
      
      toast.success('Producto añadido correctamente');
      addProductForm.reset();
      setNewVariants([]);
      setIsAddingProduct(false);
      
      // Recargar productos
      await fetchProducts();
    } catch (error) {
      console.error('Error al añadir producto:', error);
      toast.error('Error al añadir el producto');
    }
  };
  
  // Iniciar edición de producto
  const startEditingProduct = (product: Product) => {
    editProductForm.reset({
      name: product.name,
      description: product.description || "",
      price: product.price.toString()
    });
    setEditVariants(product.variants?.map(v => ({...v})) || []);
    setIsEditingProduct(product.id);
  };
  
  // Función para editar un producto
  const handleEditProduct = async (data: { name: string, description: string, price: string }) => {
    if (!isEditingProduct) return;
    
    try {
      // Actualizar producto
      const { error: productError } = await supabase
        .from('products')
        .update({
          name: data.name,
          description: data.description || null,
          price: parseFloat(data.price) || 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', isEditingProduct);
      
      if (productError) throw productError;
      
      // Procesar variantes
      // 1. Eliminar variantes marcadas
      const variantsToDelete = editVariants
        .filter(v => v.deleted && v.id.toString().indexOf('new-') !== 0)
        .map(v => v.id);
      
      if (variantsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('product_variants')
          .delete()
          .in('id', variantsToDelete);
        
        if (deleteError) throw deleteError;
      }
      
      // 2. Actualizar variantes existentes
      const variantsToUpdate = editVariants
        .filter(v => !v.deleted && v.id.toString().indexOf('new-') !== 0)
        .map(v => ({
          id: v.id,
          name: v.name,
          price: v.price,
          updated_at: new Date().toISOString()
        }));
      
      if (variantsToUpdate.length > 0) {
        for (const variant of variantsToUpdate) {
          const { error: updateError } = await supabase
            .from('product_variants')
            .update({
              name: variant.name,
              price: variant.price,
              updated_at: variant.updated_at
            })
            .eq('id', variant.id);
          
          if (updateError) throw updateError;
        }
      }
      
      // 3. Insertar nuevas variantes
      const variantsToInsert = editVariants
        .filter(v => !v.deleted && v.id.toString().indexOf('new-') === 0)
        .map(v => ({
          product_id: isEditingProduct,
          name: v.name,
          price: v.price
        }));
      
      if (variantsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('product_variants')
          .insert(variantsToInsert);
        
        if (insertError) throw insertError;
      }
      
      toast.success('Producto actualizado correctamente');
      setIsEditingProduct(null);
      
      // Recargar productos
      await fetchProducts();
    } catch (error) {
      console.error('Error al actualizar producto:', error);
      toast.error('Error al actualizar el producto');
    }
  };
  
  // Función para eliminar un producto
  const handleDeleteProduct = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este producto? Esta acción no se puede deshacer.')) return;
    
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success('Producto eliminado correctamente');
      
      // Eliminar producto de la lista
      setProducts(prev => prev.filter(product => product.id !== id));
    } catch (error) {
      console.error('Error al eliminar producto:', error);
      toast.error('Error al eliminar el producto');
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Productos</h1>
            <p className="text-muted-foreground">Gestiona el catálogo de productos</p>
          </div>
          <Button onClick={() => setIsAddingProduct(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Añadir Producto
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar productos..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {isAddingProduct && (
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-medium mb-4">Añadir Nuevo Producto</h3>
              <Form {...addProductForm}>
                <form onSubmit={addProductForm.handleSubmit(handleAddProduct)} className="space-y-4">
                  <FormField
                    control={addProductForm.control}
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
                    control={addProductForm.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Precio base</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={addProductForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descripción (opcional)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Descripción del producto" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <FormLabel>Variantes (opcional)</FormLabel>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={addVariant}
                        className="h-8"
                      >
                        <PlusCircle className="h-4 w-4 mr-1" />
                        Añadir variante
                      </Button>
                    </div>
                    
                    {newVariants.map((variant, index) => (
                      <div key={index} className="flex gap-2 items-start">
                        <div className="flex-1">
                          <Input
                            placeholder="Nombre de variante"
                            value={variant.name}
                            onChange={(e) => updateVariant(index, 'name', e.target.value)}
                          />
                        </div>
                        <div className="w-1/3">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="Precio"
                            value={variant.price}
                            onChange={(e) => updateVariant(index, 'price', e.target.value)}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeVariant(index)}
                          className="h-10 w-10"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" type="button" onClick={() => {
                      setIsAddingProduct(false);
                      setNewVariants([]);
                    }}>
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

        {isEditingProduct && (
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-medium mb-4">Editar Producto</h3>
              <Form {...editProductForm}>
                <form onSubmit={editProductForm.handleSubmit(handleEditProduct)} className="space-y-4">
                  <FormField
                    control={editProductForm.control}
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
                    control={editProductForm.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Precio base</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" min="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editProductForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descripción (opcional)</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <FormLabel>Variantes</FormLabel>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={addEditVariant}
                        className="h-8"
                      >
                        <PlusCircle className="h-4 w-4 mr-1" />
                        Añadir variante
                      </Button>
                    </div>
                    
                    {editVariants.map((variant, index) => (
                      <div key={variant.id} className={`flex gap-2 items-start ${variant.deleted ? 'opacity-50' : ''}`}>
                        <div className="flex-1">
                          <Input
                            placeholder="Nombre de variante"
                            value={variant.name}
                            onChange={(e) => updateEditVariant(index, 'name', e.target.value)}
                            disabled={variant.deleted}
                          />
                        </div>
                        <div className="w-1/3">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="Precio"
                            value={variant.price}
                            onChange={(e) => updateEditVariant(index, 'price', e.target.value)}
                            disabled={variant.deleted}
                          />
                        </div>
                        {variant.deleted ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => unmarkEditVariantForDeletion(index)}
                            className="h-10 w-10"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => markEditVariantForDeletion(index)}
                            className="h-10 w-10"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex justify-end gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      type="button" 
                      onClick={() => {
                        setIsEditingProduct(null);
                        setEditVariants([]);
                      }}
                    >
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
              <p>Cargando productos...</p>
            </div>
          ) : filteredProducts.length > 0 ? (
            filteredProducts.map((product) => (
              <Card key={product.id} className="overflow-hidden">
                <AccordionItem value={product.id} className="border-none">
                  <AccordionTrigger className="px-4 py-3 hover:bg-muted/50 w-full flex justify-between">
                    <div className="flex flex-1 justify-between items-center">
                      <div className="font-medium text-left">{product.name}</div>
                      <div className="mr-4 text-right">
                        ${product.price.toFixed(2)}
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="space-y-4">
                      {product.description && (
                        <p className="text-sm text-muted-foreground">{product.description}</p>
                      )}
                      
                      {product.variants && product.variants.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">Variantes:</h4>
                          <div className="space-y-1">
                            {product.variants.map((variant) => (
                              <div key={variant.id} className="flex justify-between text-sm">
                                <span>{variant.name}</span>
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
                          className="flex items-center gap-1"
                          onClick={() => startEditingProduct(product)}
                        >
                          <Edit className="h-4 w-4" />
                          Editar
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          className="flex items-center gap-1"
                          onClick={() => handleDeleteProduct(product.id)}
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
              <p>No se encontraron productos.</p>
            </div>
          )}
        </Accordion>
      </div>
    </AppLayout>
  );
};

export default Products;
