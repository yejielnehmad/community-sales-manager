
import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/use-toast";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Loader2 } from "lucide-react";
import { ProductForm } from "@/components/ProductForm";
import { Product, ProductCard } from "@/components/ProductCard";

interface ProductFormData {
  name: string;
  description: string;
  variants: { name: string; price: number; }[];
}

const Products = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);

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

  const handleOpenDialog = (product?: Product) => {
    setSelectedProduct(product || null);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setSelectedProduct(null);
    setIsDialogOpen(false);
  };

  const handleOpenDeleteDialog = (productId: string) => {
    setProductToDelete(productId);
    setIsDeleteDialogOpen(true);
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
      
      handleCloseDialog();
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
      const variants = formData.variants.map(variant => ({
        product_id: selectedProduct.id,
        name: variant.name,
        price: variant.price
      }));
      
      const { error: variantsError } = await supabase
        .from('product_variants')
        .insert(variants);
        
      if (variantsError) throw variantsError;

      toast({
        title: "Producto actualizado",
        description: "El producto ha sido actualizado exitosamente",
      });
      
      handleCloseDialog();
      fetchProducts();
    } catch (error) {
      console.error("Error updating product:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el producto",
        variant: "destructive",
      });
    }
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    
    try {
      // Eliminar variantes primero (por restricción de clave foránea)
      const { error: variantsError } = await supabase
        .from('product_variants')
        .delete()
        .eq('product_id', productToDelete);
        
      if (variantsError) throw variantsError;
      
      // Eliminar producto
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
      fetchProducts();
    } catch (error) {
      console.error("Error deleting product:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el producto",
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary">Productos</h1>
            <p className="text-muted-foreground">Gestiona los productos disponibles para la venta</p>
          </div>
          <Button onClick={() => handleOpenDialog()} className="flex items-center gap-1">
            <Plus className="h-4 w-4" />
            Nuevo
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {products.map((product) => (
              <ProductCard 
                key={product.id} 
                product={product} 
                onEdit={(p) => handleOpenDialog(p)} 
                onDelete={(id) => handleOpenDeleteDialog(id)} 
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border rounded-lg bg-muted/30">
            <p className="text-muted-foreground">No hay productos registrados</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => handleOpenDialog()}
            >
              Agregar producto
            </Button>
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedProduct ? "Editar" : "Crear"} Producto</DialogTitle>
          </DialogHeader>
          <ProductForm
            initialData={selectedProduct || undefined}
            onSubmit={handleSubmit}
            onCancel={handleCloseDialog}
          />
        </DialogContent>
      </Dialog>

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
    </AppLayout>
  );
};

export default Products;
