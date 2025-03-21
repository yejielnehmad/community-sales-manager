
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search } from "lucide-react";
import { useState } from "react";
import { Product } from "@/types";

const Products = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [newProductPrice, setNewProductPrice] = useState("");
  const [newProductDescription, setNewProductDescription] = useState("");
  
  // Mock data - eventualmente vendrá de Supabase
  const mockProducts: Product[] = [
    {
      id: "1",
      name: "Pañales Talla 1",
      description: "Paquete con 50 unidades",
      price: 250
    },
    {
      id: "2",
      name: "Queso Fresco",
      description: "Precio por kilo",
      price: 120
    },
    {
      id: "3",
      name: "Pollo Entero",
      description: "Precio aproximado por pieza",
      price: 180
    },
  ];

  // Filtrar productos según el término de búsqueda
  const filteredProducts = mockProducts.filter(
    product => product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Función para añadir un nuevo producto (mock)
  const handleAddProduct = () => {
    if (newProductName.trim() && newProductPrice.trim()) {
      // Aquí eventualmente añadiremos el producto a Supabase
      console.log("Añadiendo producto:", { 
        name: newProductName, 
        price: parseFloat(newProductPrice), 
        description: newProductDescription 
      });
      setNewProductName("");
      setNewProductPrice("");
      setNewProductDescription("");
      setIsAddingProduct(false);
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Productos</h1>
            <p className="text-muted-foreground">Gestiona el catálogo de productos</p>
          </div>
          <Button onClick={() => setIsAddingProduct(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Añadir Producto
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar productos..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {isAddingProduct && (
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-medium mb-4">Añadir Nuevo Producto</h3>
              <div className="flex flex-col gap-4">
                <Input
                  placeholder="Nombre del producto"
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                />
                <Input
                  placeholder="Precio"
                  type="number"
                  value={newProductPrice}
                  onChange={(e) => setNewProductPrice(e.target.value)}
                />
                <Input
                  placeholder="Descripción (opcional)"
                  value={newProductDescription}
                  onChange={(e) => setNewProductDescription(e.target.value)}
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsAddingProduct(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleAddProduct}>
                    Guardar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.description || "-"}</TableCell>
                    <TableCell>${product.price}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    No se encontraron productos.
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

export default Products;
