
import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, Plus, ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ProductVariant } from "./ProductCard";
import { ScrollArea } from "@/components/ui/scroll-area";

const productSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional(),
});

interface ProductFormValues {
  name: string;
  description: string;
}

interface ProductFormProps {
  initialData?: {
    id?: string;
    name: string;
    description: string;
    variants: ProductVariant[];
  };
  onSubmit: (data: ProductFormValues & { variants: ProductVariant[] }) => void;
  onCancel: () => void;
}

export function ProductForm({ initialData, onSubmit, onCancel }: ProductFormProps) {
  const [variants, setVariants] = useState<ProductVariant[]>(
    initialData?.variants || [{ name: "", price: 0 }]
  );

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
    },
  });

  // Prevenir scroll del body cuando el formulario está activo
  useEffect(() => {
    // El formulario ahora es pantalla completa, aseguramos scroll dentro del form
    document.body.classList.add('overflow-hidden');
    
    return () => {
      document.body.classList.remove('overflow-hidden');
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
      document.body.style.pointerEvents = '';
    };
  }, []);

  const handleAddVariant = () => {
    setVariants([...variants, { name: "", price: 0 }]);
  };

  const handleRemoveVariant = (index: number) => {
    if (variants.length > 1) {
      setVariants(variants.filter((_, i) => i !== index));
    }
  };

  const handleVariantChange = (index: number, field: keyof ProductVariant, value: string) => {
    const newVariants = [...variants];
    if (field === 'price') {
      newVariants[index][field] = parseFloat(value) || 0;
    } else {
      // @ts-ignore: Fix para manejar campo name como string
      newVariants[index][field] = value;
    }
    setVariants(newVariants);
  };

  const handleFormSubmit = (data: ProductFormValues) => {
    // Validar que todas las variantes tengan nombre
    const allVariantsValid = variants.every(v => v.name.trim());
    
    if (!allVariantsValid) {
      return; // No permitir enviar si hay variantes sin nombre
    }
    
    onSubmit({
      ...data,
      variants
    });
  };

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Header con botón de regreso */}
      <div className="py-4 px-4 border-b flex items-center justify-between">
        <button 
          onClick={onCancel}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Volver</span>
        </button>
        <h2 className="text-lg font-semibold">
          {initialData?.id ? "Editar" : "Crear"} Producto
        </h2>
        <div className="w-20"></div> {/* Espacio para equilibrar el header */}
      </div>
      
      {/* Contenido con ScrollArea para garantizar scroll */}
      <ScrollArea className="flex-1 overflow-y-auto">
        <div className="p-4 max-w-xl mx-auto">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre del Producto</FormLabel>
                    <FormControl>
                      <Input placeholder="Nombre del producto" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
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

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <FormLabel>Variantes</FormLabel>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={handleAddVariant}
                    className="text-xs flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    Agregar
                  </Button>
                </div>
                
                {variants.map((variant, index) => (
                  <Card key={index} className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <FormItem>
                          <FormLabel className="text-xs">Nombre</FormLabel>
                          <Input
                            value={variant.name}
                            onChange={(e) => handleVariantChange(index, 'name', e.target.value)}
                            placeholder="Ej: Talle M"
                            className="text-sm"
                          />
                        </FormItem>
                      </div>
                      <div className="w-24">
                        <FormItem>
                          <FormLabel className="text-xs">Precio</FormLabel>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={variant.price}
                            onChange={(e) => handleVariantChange(index, 'price', e.target.value)}
                            className="text-sm"
                          />
                        </FormItem>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 mt-5"
                        onClick={() => handleRemoveVariant(index)}
                        disabled={variants.length === 1}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>

              <div className="pt-6 pb-4">
                <Button type="submit" className="w-full">
                  {initialData?.id ? "Actualizar" : "Crear"} Producto
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </ScrollArea>
    </div>
  );
}
