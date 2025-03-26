
import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/use-toast";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, AlertTriangle, Search, X } from "lucide-react";
import { ProductForm } from "@/components/ProductForm";
import { Product, ProductCard } from "@/components/ProductCard";
import { Input } from "@/components/ui/input";

interface ProductFormData {
  name: string;
  description: string;
  variants: { name: string; price: number; }[];
}

const Products = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDependencyDialogOpen, setIsDependencyDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [deleteDependencies, setDeleteDependencies] = useState<{count: number, items: any[]}>({count: 0, items: []});
  const [searchTerm, setSearchTerm] = useState("");

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Obtener variantes para cada producto
      const productsWithVariants = await Promise.all(
        (data || []).map(async (product) => {
          const { data: variants, error: variantsError } = await supabase
            .from('product_variants')
            .select('*')
            .eq('product_id', product.id);
          
          if (variantsError) {
            console.error("Error fetching variants:", variantsError);
            return { ...product, variants: [] };
          }
          
          return { ...product, variants: variants || [] };
        })
      );

      setProducts(productsWithVariants);
      setFilteredProducts(productsWithVariants);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los productos",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (searchTerm.trim()) {
      const filtered = products.filter(product => 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.variants.some(variant => 
          variant.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts(products);
    }
  }, [searchTerm, products]);

  const handleOpenForm = (product?: Product) => {
    setSelectedProduct(product || null);
    setIsFormOpen(true);
    // Cuando abrimos el formulario, aseguramos que sea a pantalla completa
    document.body.classList.add('overflow-hidden');
  };

  const handleCloseForm = () => {
    setSelectedProduct(null);
    setIsFormOpen(false);
    // Restauramos el scroll cuando se cierra
    document.body.classList.remove('overflow-hidden');
    document.body.style.overflow = '';
  };

  // Verificar dependencias antes de abrir el diálogo de eliminación
  const handleOpenDeleteDialog = async (productId: string) => {
    try {
      // Verificar si el producto tiene pedidos asociados
      const { data: orderItems, error: orderItemsError, count } = await supabase
        .from('order_items')
        .select('*', { count: 'exact' })
        .eq('product_id', productId)
        .limit(5);
      
      if (orderItemsError) throw orderItemsError;
      
      if (count && count > 0) {
        // El producto tiene dependencias, mostrar diálogo de advertencia
        setDeleteDependencies({
          count: count || 0,
          items: orderItems || []
        });
        setProductToDelete(productId);
        setIsDependencyDialogOpen(true);
      } else {
        // No hay dependencias, proceder con el diálogo de confirmación normal
        setProductToDelete(productId);
        setIsDeleteDialogOpen(true);
      }
    } catch (error) {
      console.error("Error checking product dependencies:", error);
      toast({
        title: "Error",
        description: "No se pudo verificar las dependencias del producto",
        variant: "destructive",
      });
    }
  };

  const handleCreateProduct = async (formData: ProductFormData) => {
    try {
      // Calculamos el precio base del producto (podemos usar el precio promedio de las variantes)
      const basePrice = formData.variants.length > 0 
        ? formData.variants.reduce((sum, variant) => sum + variant.price, 0) / formData.variants.length 
        : 0;
      
      // Crear producto con el precio requerido
      const { data: productData, error: productError } = await supabase
        .from('products')
        .insert({
          name: formData.name,
          description: formData.description,
          price: basePrice // Añadimos el precio base calculado
        })
        .select();

      if (productError) throw productError;
      
      const productId = productData[0]?.id;
      
      if (productId) {
        // Crear variantes
        const variants = formData.variants.map(variant => ({
          product_id: productId,
          name: variant.name,
          price: variant.price
        }));
        
        const { error: variantsError } = await supabase
          .from('product_variants')
          .insert(variants);
          
        if (variantsError) throw variantsError;
      }

      toast({
        title: "Producto creado",
        description: "El producto ha sido creado exitosamente",
      });
      
      handleCloseForm();
      fetchProducts();
    } catch (error) {
      console.error("Error creating product:", error);
      toast({
        title: "Error",
        description: "No se pudo crear el producto",
        variant: "destructive",
      });
    }
  };

  const handleUpdateProduct = async (formData: ProductFormData) => {
    if (!selectedProduct) return;
    
    try {
      // Calculamos el precio actualizado (promedio de variantes)
      const updatedPrice = formData.variants.length > 0 
        ? formData.variants.reduce((sum, variant) => sum + variant.price, 0) / formData.variants.length 
        : 0;
      
      // Actualizar producto
      const { error: productError } = await supabase
        .from('products')
        .update({
          name: formData.name,
          description: formData.description,
          price: updatedPrice // Actualizamos también el precio base
        })
        .eq('id', selectedProduct.id);

      if (productError) throw productError;
      
      // Eliminar variantes existentes
      const { error: deleteError } = await supabase
        .from('product_variants')
        .delete()
        .eq('product_id', selectedProduct.id);
        
      if (deleteError) throw deleteError;
      
      // Crear nuevas variantes
      if (formData.variants.length > 0) {
        const variants = formData.variants.map(variant => ({
          product_id: selectedProduct.id,
          name: variant.name,
          price: variant.price
        }));
        
        const { error: variantsError } = await supabase
          .from('product_variants')
          .insert(variants);
          
        if (variantsError) throw variantsError;
      }

      toast({
        title: "Producto actualizado",
        description: "El producto ha sido actualizado exitosamente",
      });
      
      handleCloseForm();
      // Actualizamos la lista de productos inmediatamente después de la actualización
      fetchProducts();
    } catch (error) {
      console.error("Error updating product:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el producto. Verifica que no tenga pedidos asociados.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    
    try {
      // Verificar si hay order_items que usan este producto
      const { count: orderItemsCount } = await supabase
        .from('order_items')
        .select('*', { count: 'exact', head: true })
        .eq('product_id', productToDelete);
        
      if (orderItemsCount && orderItemsCount > 0) {
        toast({
          title: "No se puede eliminar",
          description: "Este producto tiene pedidos asociados. No puede ser eliminado.",
          variant: "destructive",
        });
        setIsDeleteDialogOpen(false);
        return;
      }
      
      // Primero eliminar variantes
      const { error: variantsError } = await supabase
        .from('product_variants')
        .delete()
        .eq('product_id', productToDelete);
        
      if (variantsError) throw variantsError;
      
      // Luego eliminar producto
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productToDelete);

      if (error) throw error;

      toast({
        title: "Producto eliminado",
        description: "El producto ha sido eliminado exitosamente",
      });
      
      setIsDeleteDialogOpen(false);
      setIsDependencyDialogOpen(false);
      fetchProducts();
    } catch (error) {
      console.error("Error deleting product:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el producto. Verifica que no tenga pedidos asociados.",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = (formData: ProductFormData) => {
    if (selectedProduct) {
      handleUpdateProduct(formData);
    } else {
      handleCreateProduct(formData);
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary mb-3">Catálogo</h1>
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1">
              <Input
                placeholder="Buscar producto..."
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
            <Button onClick={() => handleOpenForm()} className="flex items-center gap-1">
              <Plus className="h-4 w-4" />
              Nuevo
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map((product) => (
              <ProductCard 
                key={product.id} 
                product={product} 
                onEdit={(p) => handleOpenForm(p)} 
                onDelete={(id) => handleOpenDeleteDialog(id)} 
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border rounded-lg bg-muted/30">
            {searchTerm ? (
              <p className="text-muted-foreground">No se encontraron productos que coincidan con "{searchTerm}"</p>
            ) : (
              <p className="text-muted-foreground">No hay productos registrados</p>
            )}
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => handleOpenForm()}
            >
              Agregar producto
            </Button>
          </div>
        )}
      </div>

      {/* Formulario a pantalla completa */}
      {isFormOpen && (
        <ProductForm
          initialData={selectedProduct || undefined}
          onSubmit={handleSubmit}
          onCancel={handleCloseForm}
        />
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El producto se eliminará permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProduct}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Diálogo para mostrar cuando un producto tiene dependencias */}
      <AlertDialog open={isDependencyDialogOpen} onOpenChange={setIsDependencyDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-amber-500">
              <AlertTriangle className="h-5 w-5" />
              <AlertDialogTitle>No se puede eliminar este producto</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="mt-4">
              Este producto está siendo usado en {deleteDependencies.count} pedido(s).
              <div className="mt-2 p-3 bg-muted rounded-md text-sm">
                Para mantener el historial de pedidos, no es posible eliminar productos que estén asociados a pedidos existentes.
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Entendido</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}

export default Products;
