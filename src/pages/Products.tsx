import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Plus, Trash } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

type Product = {
  id: string;
  name: string;
  description: string;
  price: string;
  variants: ProductVariant[];
};

type ProductVariant = {
  id: string;
  name: string;
  price: string;
};

type ProductFromDB = {
  id: string;
  name: string;
  description: string | null;
  price: number;
};

type ProductVariantFromDB = {
  id: string;
  product_id: string;
  name: string;
  price: number;
};

const Products = () => {
  const [products, setProducts] = useState<ProductFromDB[]>([]);
  const [productVariants, setProductVariants] = useState<ProductVariantFromDB[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("list");
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const { toast } = useToast();

  // Agrupar variantes por producto
  const productVariantsMap: Record<string, ProductVariantFromDB[]> = {};
  productVariants.forEach(variant => {
    if (!productVariantsMap[variant.product_id]) {
      productVariantsMap[variant.product_id] = [];
    }
    productVariantsMap[variant.product_id].push(variant);
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      // Obtener productos
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .order('name');

      if (productsError) throw productsError;
      
      // Obtener variantes
      const { data: variantsData, error: variantsError } = await supabase
        .from('product_variants')
        .select('*')
        .order('name');

      if (variantsError) throw variantsError;

      setProducts(productsData || []);
      setProductVariants(variantsData || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los productos",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const tableData = products.map(product => {
    const variants = productVariantsMap[product.id] || [];
    
    return {
      id: product.id,
      name: product.name,
      description: product.description || "",
      price: String(product.price || "0"),
      variants: variants.map(v => ({
        id: v.id,
        name: v.name,
        price: String(v.price || "0")
      }))
    };
  });

  const bulkImportProducts = async (products: { name: string; description: string; price: string }[]) => {
    try {
      const newProducts = products.map(p => ({
        name: p.name,
        description: p.description || "",
        price: parseFloat(p.price)
      }));

      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .insert(newProducts);

      if (productsError) throw productsError;

      toast({
        title: "Productos importados",
        description: `Se importaron ${products.length} productos correctamente`,
      });

      fetchProducts();
      setActiveTab("list");
    } catch (error) {
      console.error('Error importing products:', error);
      toast({
        title: "Error",
        description: "No se pudieron importar los productos",
        variant: "destructive",
      });
    }
  };

  const columns: ColumnDef<Product>[] = [
    {
      accessorKey: "name",
      header: "Nombre",
    },
    {
      accessorKey: "description",
      header: "Descripción",
    },
    {
      accessorKey: "price",
      header: "Precio Base",
      cell: ({ row }) => {
        return <div>{row.getValue("price")} €</div>;
      },
    },
    {
      accessorKey: "variants",
      header: "Variantes",
      cell: ({ row }) => {
        const variants: ProductVariant[] = row.getValue("variants");
        return (
          <div className="flex flex-wrap gap-1">
            {variants.length > 0 ? (
              variants.map((variant) => (
                <Badge key={variant.id} variant="outline">
                  {variant.name}: {String(variant.price)} €
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground text-sm">Sin variantes</span>
            )}
          </div>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const product = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Abrir menú</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setSelectedProduct(product.id)}>
                Gestionar variantes
              </DropdownMenuItem>
              <DropdownMenuItem className="text-red-600">
                Eliminar producto
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Productos</h1>
            <p className="text-muted-foreground">Gestiona tu catálogo de productos y variantes</p>
          </div>
          <div className="flex gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo Producto
                </Button>
              </DialogTrigger>
              <DialogContent>
                <ProductForm onSubmit={fetchProducts} />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="list">Listado</TabsTrigger>
            <TabsTrigger value="import">Importar</TabsTrigger>
          </TabsList>
          
          <TabsContent value="list" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <DataTable columns={columns} data={tableData} />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="import">
            <BulkImportForm onImport={bulkImportProducts} />
          </TabsContent>
        </Tabs>

        {selectedProduct && (
          <Dialog open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)}>
            <DialogContent className="max-w-2xl">
              <VariantsManager 
                productId={selectedProduct} 
                product={products.find(p => p.id === selectedProduct)} 
                variants={productVariantsMap[selectedProduct] || []}
                onUpdate={fetchProducts}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </AppLayout>
  );
};

const VariantsManager = ({ 
  productId, 
  product, 
  variants, 
  onUpdate 
}: { 
  productId: string; 
  product?: ProductFromDB; 
  variants: ProductVariantFromDB[]; 
  onUpdate: () => void;
}) => {
  const [formVariant, setFormVariant] = useState({
    name: "",
    price: "0" // Asegurarnos que es string para el input
  });
  const { toast } = useToast();

  const handleAddVariant = async () => {
    try {
      if (!formVariant.name) {
        toast({
          title: "Error",
          description: "El nombre de la variante es obligatorio",
          variant: "destructive",
        });
        return;
      }

      const newVariants = variants.map(v => ({
        product_id: productId,
        name: v.name,
        price: parseFloat(v.price)
      }));

      const { data: variantsData, error: variantsError } = await supabase
        .from('product_variants')
        .insert(newVariants);

      if (variantsError) throw variantsError;

      toast({
        title: "Variante añadida",
        description: "La variante se ha añadido correctamente",
      });

      setFormVariant({ name: "", price: "0" });
      onUpdate();
    } catch (error) {
      console.error('Error adding variant:', error);
      toast({
        title: "Error",
        description: "No se pudo añadir la variante",
        variant: "destructive",
      });
    }
  };

  const handleDeleteVariant = async (variantId: string) => {
    try {
      const { error } = await supabase
        .from('product_variants')
        .delete()
        .eq('id', variantId);

      if (error) throw error;

      toast({
        title: "Variante eliminada",
        description: "La variante se ha eliminado correctamente",
      });

      onUpdate();
    } catch (error) {
      console.error('Error deleting variant:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la variante",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Gestionar Variantes: {product?.name}</DialogTitle>
        <DialogDescription>
          Añade o elimina variantes para este producto
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <Label htmlFor="variant-name">Nombre de la variante</Label>
            <Input
              id="variant-name"
              value={formVariant.name}
              onChange={(e) => setFormVariant({ ...formVariant, name: e.target.value })}
              placeholder="Ej: 500g, 1kg, Rojo, etc."
            />
          </div>
          <div>
            <Label htmlFor="variant-price">Precio (€)</Label>
            <Input
              id="variant-price"
              type="number"
              value={formVariant.price}
              onChange={(e) => setFormVariant({ ...formVariant, price: e.target.value })}
              step="0.01"
            />
          </div>
        </div>

        <Button onClick={handleAddVariant} className="w-full">
          <Plus className="mr-2 h-4 w-4" />
          Añadir Variante
        </Button>

        <div className="space-y-2">
          <Label>Variantes existentes</Label>
          {variants.length > 0 ? (
            <div className="space-y-2">
              {variants.map((variant) => (
                <div key={variant.id} className="flex justify-between items-center p-2 border rounded-md">
                  <div>
                    <span className="font-medium">{variant.name}</span>
                    <span className="ml-2 text-muted-foreground">{variant.price} €</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteVariant(variant.id)}
                  >
                    <Trash className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-4 border rounded-md text-muted-foreground">
              No hay variantes para este producto
            </div>
          )}
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => onUpdate()}>
          Cerrar
        </Button>
      </DialogFooter>
    </>
  );
};

const ProductForm = ({ onSubmit }: { onSubmit: () => void }) => {
  const [formProduct, setFormProduct] = useState({
    name: "",
    description: "",
    price: "0" // Asegurarnos que es string para el input
  });
  const { toast } = useToast();

  const handleSubmit = async () => {
    try {
      if (!formProduct.name) {
        toast({
          title: "Error",
          description: "El nombre del producto es obligatorio",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase
        .from('products')
        .insert([
          {
            name: formProduct.name,
            description: formProduct.description,
            price: parseFloat(formProduct.price),
          }
        ]);

      if (error) throw error;

      toast({
        title: "Producto creado",
        description: "El producto se ha creado correctamente",
      });

      setFormProduct({ name: "", description: "", price: "0" });
      onSubmit();
    } catch (error) {
      console.error('Error creating product:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el producto",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Crear Nuevo Producto</DialogTitle>
        <DialogDescription>
          Añade un nuevo producto a tu catálogo
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nombre del producto</Label>
          <Input
            id="name"
            value={formProduct.name}
            onChange={(e) => setFormProduct({ ...formProduct, name: e.target.value })}
            placeholder="Ej: Leche, Pan, etc."
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Descripción (opcional)</Label>
          <Textarea
            id="description"
            value={formProduct.description}
            onChange={(e) => setFormProduct({ ...formProduct, description: e.target.value })}
            placeholder="Descripción del producto..."
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="price">Precio base (€)</Label>
          <Input
            id="price"
            type="number"
            value={formProduct.price}
            onChange={(e) => setFormProduct({ ...formProduct, price: e.target.value })}
            step="0.01"
          />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={handleSubmit}>Crear Producto</Button>
      </DialogFooter>
    </>
  );
};

const BulkImportForm = ({ onImport }: { onImport: (products: any[]) => void }) => {
  const [importText, setImportText] = useState("");
  const { toast } = useToast();

  const handleImport = () => {
    try {
      // Intentar parsear el JSON
      const products = JSON.parse(importText);
      
      if (!Array.isArray(products)) {
        toast({
          title: "Error de formato",
          description: "El formato debe ser un array de productos",
          variant: "destructive",
        });
        return;
      }
      
      onImport(products);
    } catch (error) {
      toast({
        title: "Error de formato",
        description: "El JSON no es válido",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Importar Productos</CardTitle>
        <CardDescription>
          Importa múltiples productos desde un archivo JSON
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Textarea
          className="min-h-[300px] font-mono"
          placeholder={`[
  {
    "name": "Leche",
    "description": "Leche entera",
    "price": "1.20"
  },
  {
    "name": "Pan",
    "description": "Pan de molde",
    "price": "1.50"
  }
]`}
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
        />
      </CardContent>
      <CardFooter>
        <Button onClick={handleImport}>Importar Productos</Button>
      </CardFooter>
    </Card>
  );
};

export default Products;
