
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash, Loader2, MoreVertical, ShoppingBag } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  variants: ProductVariant[];
};

type ProductVariant = {
  id: string;
  name: string;
  price: number;
};

const Products = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isNewProductDialogOpen, setIsNewProductDialogOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .order('name');

      if (productsError) throw productsError;
      
      const { data: variantsData, error: variantsError } = await supabase
        .from('product_variants')
        .select('*')
        .order('name');

      if (variantsError) throw variantsError;

      // Organizar productos con sus variantes
      const productsList = (productsData || []).map(product => {
        const productVariants = (variantsData || [])
          .filter(variant => variant.product_id === product.id)
          .map(v => ({
            id: v.id,
            name: v.name,
            price: v.price
          }));
        
        return {
          id: product.id,
          name: product.name,
          description: product.description || "",
          price: product.price,
          variants: productVariants
        };
      });

      setProducts(productsList);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error("No se pudieron cargar los productos");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    setIsDeleting(true);
    try {
      // Primero eliminar las variantes
      const { error: variantsError } = await supabase
        .from('product_variants')
        .delete()
        .eq('product_id', productId);
      
      if (variantsError) throw variantsError;

      // Luego eliminar el producto
      const { error: productError } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);
      
      if (productError) throw productError;

      toast.success("Producto eliminado correctamente");
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error("Error al eliminar el producto");
    } finally {
      setIsDeleting(false);
      setIsDeleteConfirmOpen(false);
      setProductToDelete(null);
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Productos</h1>
            <p className="text-muted-foreground">Gestiona tu catálogo de productos y variantes</p>
          </div>
          <Button onClick={() => setIsNewProductDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Producto
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : products.length === 0 ? (
          <Card className="p-10 text-center">
            <div className="flex flex-col items-center justify-center gap-2">
              <ShoppingBag className="h-10 w-10 text-muted-foreground" />
              <h3 className="text-lg font-medium">No hay productos</h3>
              <p className="text-sm text-muted-foreground">
                Comienza añadiendo tu primer producto.
              </p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setIsNewProductDialogOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Añadir Producto
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard 
                key={product.id} 
                product={product} 
                onEdit={() => setSelectedProduct(product)}
                onDelete={() => {
                  setProductToDelete(product.id);
                  setIsDeleteConfirmOpen(true);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Diálogo para nuevo producto */}
      <ProductDialog 
        open={isNewProductDialogOpen} 
        onOpenChange={setIsNewProductDialogOpen}
        onSave={fetchProducts}
      />

      {/* Diálogo para editar producto */}
      {selectedProduct && (
        <ProductDialog 
          open={!!selectedProduct}
          onOpenChange={(open) => !open && setSelectedProduct(null)}
          product={selectedProduct}
          onSave={fetchProducts}
        />
      )}

      {/* Confirmación para eliminar producto */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Estás seguro?</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. Se eliminará el producto y todas sus variantes.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteConfirmOpen(false)}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive"
              onClick={() => productToDelete && handleDeleteProduct(productToDelete)}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash className="mr-2 h-4 w-4" />
                  Eliminar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

const ProductCard = ({ 
  product, 
  onEdit, 
  onDelete 
}: { 
  product: Product; 
  onEdit: () => void;
  onDelete: () => void;
}) => {
  return (
    <Card className="overflow-hidden h-full flex flex-col">
      <CardHeader className="p-4 pb-2 flex flex-row justify-between items-start gap-2">
        <div className="flex-1 overflow-hidden">
          <h3 className="font-medium truncate">{product.name}</h3>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-destructive">
              <Trash className="mr-2 h-4 w-4" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="p-4 pt-2 pb-0 flex-1">
        {product.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{product.description}</p>
        )}
        <div className="space-y-2">
          <ScrollArea className="max-h-24">
            {product.variants.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {product.variants.map((variant) => (
                  <Badge key={variant.id} variant="outline" className="mb-1">
                    {variant.name}: ${variant.price}
                  </Badge>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground italic">Sin variantes</div>
            )}
          </ScrollArea>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-3 flex justify-end">
        <Button size="sm" variant="outline" onClick={onEdit}>
          <Pencil className="mr-2 h-3 w-3" />
          Gestionar
        </Button>
      </CardFooter>
    </Card>
  );
};

const ProductDialog = ({ 
  open, 
  onOpenChange,
  product = null,
  onSave
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
  onSave: () => void;
}) => {
  const isEditing = !!product;
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });
  const [variants, setVariants] = useState<{name: string; price: string}[]>([{ name: "", price: "" }]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        description: product.description || "",
      });
      
      if (product.variants.length > 0) {
        setVariants(product.variants.map(v => ({
          name: v.name,
          price: v.price.toString()
        })));
      } else {
        setVariants([{ name: "", price: "" }]);
      }
    } else {
      setFormData({ name: "", description: "" });
      setVariants([{ name: "", price: "" }]);
    }
  }, [product]);

  const handleVariantChange = (index: number, field: 'name' | 'price', value: string) => {
    const newVariants = [...variants];
    newVariants[index][field] = value;
    setVariants(newVariants);
  };

  const addVariant = () => {
    setVariants([...variants, { name: "", price: "" }]);
  };

  const removeVariant = (index: number) => {
    if (variants.length > 1) {
      const newVariants = [...variants];
      newVariants.splice(index, 1);
      setVariants(newVariants);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("El nombre del producto es obligatorio");
      return;
    }

    // Validar variantes
    const validVariants = variants.filter(v => v.name.trim() !== "");
    if (validVariants.length === 0) {
      toast.error("Debes agregar al menos una variante");
      return;
    }

    setIsSaving(true);
    try {
      if (isEditing && product) {
        // Actualizar producto existente
        const { error: updateError } = await supabase
          .from('products')
          .update({
            name: formData.name,
            description: formData.description,
            price: 0 // Ya no usamos precio base
          })
          .eq('id', product.id);
          
        if (updateError) throw updateError;

        // Eliminar variantes existentes
        const { error: deleteError } = await supabase
          .from('product_variants')
          .delete()
          .eq('product_id', product.id);
          
        if (deleteError) throw deleteError;

        // Agregar nuevas variantes
        const { error: variantsError } = await supabase
          .from('product_variants')
          .insert(
            validVariants.map(v => ({
              product_id: product.id,
              name: v.name,
              price: parseFloat(v.price) || 0
            }))
          );
          
        if (variantsError) throw variantsError;
        
        toast.success("Producto actualizado correctamente");
      } else {
        // Crear nuevo producto
        const { data: newProduct, error: productError } = await supabase
          .from('products')
          .insert({
            name: formData.name,
            description: formData.description,
            price: 0 // Ya no usamos precio base
          })
          .select();
          
        if (productError) throw productError;
        
        if (newProduct && newProduct.length > 0) {
          // Agregar variantes
          const { error: variantsError } = await supabase
            .from('product_variants')
            .insert(
              validVariants.map(v => ({
                product_id: newProduct[0].id,
                name: v.name,
                price: parseFloat(v.price) || 0
              }))
            );
            
          if (variantsError) throw variantsError;
        }
        
        toast.success("Producto creado correctamente");
      }
      
      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error(isEditing ? "Error al actualizar el producto" : "Error al crear el producto");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Producto" : "Nuevo Producto"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Modifica el producto y sus variantes." : "Añade un nuevo producto a tu catálogo."}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre del producto</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ej: Aceite, Arroz, etc."
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Descripción (opcional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descripción del producto..."
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Variantes y precios</Label>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={addVariant}
              >
                <Plus className="h-3 w-3 mr-1" />
                Agregar
              </Button>
            </div>
            
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {variants.map((variant, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="flex-1">
                    <Input
                      value={variant.name}
                      onChange={(e) => handleVariantChange(index, 'name', e.target.value)}
                      placeholder="Nombre (ej: 1kg, 500g)"
                    />
                  </div>
                  <div className="w-24">
                    <Input
                      type="number"
                      value={variant.price}
                      onChange={(e) => handleVariantChange(index, 'price', e.target.value)}
                      placeholder="Precio"
                      step="0.01"
                    />
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => removeVariant(index)}
                    disabled={variants.length <= 1}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              isEditing ? "Actualizar" : "Crear"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default Products;
