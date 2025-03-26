import { useState, useEffect, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, Plus, ArrowLeft, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ProductVariant } from "./ProductCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PriceInput } from "@/components/ui/price-input";
import { useToast } from "@/hooks/use-toast";
import { logValidation, logOperation, logError, logUserAction } from "@/lib/debug-utils";
import { cn } from "@/lib/utils";

const productSchema = z.object({
  name: z.string()
    .min(1, "El nombre es requerido")
    .max(100, "El nombre es demasiado largo"),
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
  
  const [variantErrors, setVariantErrors] = useState<{[key: number]: {name?: string, price?: string}}>({}); 
  const [submitting, setSubmitting] = useState(false);
  
  const newVariantRef = useRef<HTMLInputElement>(null);
  const { toast, error, success } = useToast();

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
    },
  });

  useEffect(() => {
    logUserAction('Formulario de producto abierto', { 
      isEditing: !!initialData?.id,
      productId: initialData?.id,
      variantsCount: variants.length 
    });
    
    document.body.classList.add('overflow-hidden');
    
    return () => {
      document.body.classList.remove('overflow-hidden');
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
      document.body.style.pointerEvents = '';
    };
  }, [initialData?.id, variants.length]);

  const handleAddVariant = () => {
    setVariants([{ name: "", price: 0 }, ...variants]);
    logUserAction('Variante de producto agregada', { variantsCount: variants.length + 1 });
    
    setTimeout(() => {
      if (newVariantRef.current) {
        newVariantRef.current.focus();
      }
    }, 0);
  };

  const handleRemoveVariant = (index: number) => {
    if (variants.length > 1) {
      logUserAction('Variante de producto eliminada', { variantName: variants[index].name });
      setVariants(variants.filter((_, i) => i !== index));
      
      const newErrors = {...variantErrors};
      delete newErrors[index];
      setVariantErrors(newErrors);
    } else {
      error("No se puede eliminar", "Debe haber al menos una variante");
    }
  };

  const handleVariantChange = (index: number, field: keyof ProductVariant, value: string | number) => {
    const newVariants = [...variants];
    if (field === 'name') {
      newVariants[index].name = value as string;
    } else if (field === 'price') {
      newVariants[index].price = typeof value === 'number' ? value : 0;
    }
    setVariants(newVariants);
    
    if (variantErrors[index] && variantErrors[index][field]) {
      const newErrors = {...variantErrors};
      delete newErrors[index][field];
      if (Object.keys(newErrors[index]).length === 0) {
        delete newErrors[index];
      }
      setVariantErrors(newErrors);
    }
  };

  const validateVariants = (): boolean => {
    const newErrors: {[key: number]: {name?: string, price?: string}} = {};
    let hasErrors = false;
    
    variants.forEach((variant, index) => {
      if (!variant.name.trim()) {
        if (!newErrors[index]) newErrors[index] = {};
        newErrors[index].name = "El nombre es requerido";
        hasErrors = true;
      }
      
      if (variant.price <= 0) {
        if (!newErrors[index]) newErrors[index] = {};
        newErrors[index].price = "El precio debe ser mayor a 0";
        hasErrors = true;
      }
    });
    
    setVariantErrors(newErrors);
    logValidation('ProductVariants', !hasErrors, newErrors);
    return !hasErrors;
  };

  const handleFormSubmit = (data: ProductFormValues) => {
    setSubmitting(true);
    
    logUserAction('Intento de guardar producto', { 
      productName: data.name, 
      variantsCount: variants.length 
    });
    
    const variantsValid = validateVariants();
    
    if (!variantsValid) {
      error("Error de validación", "Revisa los campos marcados en rojo");
      setSubmitting(false);
      return;
    }
    
    try {
      logOperation('validación_producto', 'success', { 
        productName: data.name,
        variantsCount: variants.length
      });
      
      onSubmit({
        ...data,
        variants
      });
      
      logOperation('guardar_producto', 'success', { 
        productName: data.name,
        variantsCount: variants.length,
        isEditing: !!initialData?.id
      });
      
      success(
        initialData?.id ? "Producto actualizado" : "Producto creado", 
        `${data.name} ha sido ${initialData?.id ? "actualizado" : "creado"} correctamente`
      );
    } catch (err) {
      logError('ProductForm', err, { data, variants });
      error("Error al guardar", "No se pudo completar la operación");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      <div className="py-4 px-4 border-b flex items-center justify-between">
        <button 
          onClick={() => {
            logUserAction('Cancelar formulario de producto');
            onCancel();
          }}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Volver</span>
        </button>
        <h2 className="text-lg font-semibold">
          {initialData?.id ? "Editar" : "Crear"} Producto
        </h2>
        <div className="w-20"></div>
      </div>
      
      <ScrollArea className="flex-1 overflow-y-auto">
        <div className="p-4 max-w-xl mx-auto">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Nombre del Producto</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Nombre del producto" 
                        {...field} 
                        className={cn(
                          "rounded-xl",
                          fieldState.invalid && "input-error"
                        )} 
                      />
                    </FormControl>
                    <FormMessage className="text-red-500" />
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
                      <Textarea placeholder="Descripción del producto" {...field} className="rounded-xl" />
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
                    className="text-xs flex items-center gap-1 rounded-xl"
                  >
                    <Plus className="h-3 w-3" />
                    Agregar
                  </Button>
                </div>
                
                {variants.map((variant, index) => (
                  <Card key={index} className={cn(
                    "p-3 rounded-xl",
                    variantErrors[index] && "border-red-200 bg-red-50/30"
                  )}>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <FormItem>
                          <FormLabel className="text-xs">Nombre</FormLabel>
                          <Input
                            ref={index === 0 ? newVariantRef : undefined}
                            value={variant.name}
                            onChange={(e) => handleVariantChange(index, 'name', e.target.value)}
                            placeholder="Ej: Talle M"
                            className={cn(
                              "text-sm rounded-xl",
                              variantErrors[index]?.name && "input-error"
                            )}
                          />
                          {variantErrors[index]?.name && (
                            <div className="error-text">{variantErrors[index]?.name}</div>
                          )}
                        </FormItem>
                      </div>
                      <div className="w-24 relative">
                        <FormItem>
                          <FormLabel className="text-xs">Precio</FormLabel>
                          <PriceInput
                            value={variant.price}
                            onChange={(value) => handleVariantChange(index, 'price', value)}
                            className={cn(
                              "text-sm rounded-xl",
                              variantErrors[index]?.price && "input-error"
                            )}
                          />
                          {variantErrors[index]?.price && (
                            <div className="error-text">{variantErrors[index]?.price}</div>
                          )}
                        </FormItem>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 mt-5 rounded-full"
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
                <Button 
                  type="submit" 
                  className="w-full rounded-xl"
                  disabled={submitting}
                >
                  {submitting ? "Guardando..." : (initialData?.id ? "Actualizar" : "Crear")} Producto
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </ScrollArea>
    </div>
  );
}
