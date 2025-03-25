
import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Edit, Trash, Loader2, Check, X, Package, CircleCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PriceDisplay } from "@/components/ui/price-display";

interface ProductItemProps {
  productKey: string;
  product: {
    id?: string;
    name: string;
    variant?: string;
    quantity: number;
    price: number;
    total: number;
    orderId: string;
  };
  isPaid: boolean;
  isLastItem: boolean;
  isFirstItem: boolean;
  isSaving: boolean;
  editingProduct: string | null;
  productQuantities: { [key: string]: number };
  onDeleteProduct: (productKey: string, orderId: string, itemId: string) => void;
  onEditProduct: (productKey: string, currentQuantity: number, isPaid: boolean) => void;
  onSaveProductChanges: (productKey: string, orderId: string, itemId: string) => void;
  onQuantityChange: (productKey: string, newQuantity: number) => void;
  onToggleProductPaid: (productKey: string, orderId: string, itemId: string, isPaid: boolean) => void;
}

export const ProductItemNew = ({
  productKey,
  product,
  isPaid,
  isLastItem,
  isFirstItem,
  isSaving,
  editingProduct,
  productQuantities,
  onDeleteProduct,
  onEditProduct,
  onSaveProductChanges,
  onQuantityChange,
  onToggleProductPaid
}: ProductItemProps) => {
  const isEditing = editingProduct === productKey;
  const [isAnimating, setIsAnimating] = useState(false);
  const currentQuantity = productQuantities[productKey] || product.quantity;
  
  // Manejar el cambio del switch con animación
  const handleSwitchChange = (checked: boolean) => {
    setIsAnimating(true);
    onToggleProductPaid(productKey, product.orderId, product.id || '', checked);
    
    // Desactivar la animación después de 500ms
    setTimeout(() => {
      setIsAnimating(false);
    }, 500);
  };

  // Restaurar el scroll cuando se abre el editor
  useEffect(() => {
    if (isEditing) {
      window.scrollTo({
        top: window.scrollY,
        behavior: 'smooth'
      });
    }
  }, [isEditing]);
  
  // Calcular el total basado en el precio y la cantidad actual
  const calculateTotal = () => {
    if (isEditing) {
      return product.price * currentQuantity;
    }
    return product.price * product.quantity;
  };
  
  // Extraer el nombre y las variantes para el diseño según la imagen
  const productName = product.name.split(' ')[0] || product.name; // Ejemplo: "Leche" de "Leche Entera"
  const variantName = product.variant || (product.name.includes(' ') ? product.name.substring(productName.length).trim() : '');
  
  return (
    <div 
      key={productKey} 
      data-product-key={productKey}
      className={`relative overflow-hidden transition-all duration-200 ${isPaid ? 'opacity-100' : 'opacity-100'}`}
      style={{ 
        minHeight: isEditing ? '120px' : '64px', // Altura reducida para hacerla más compacta
        borderRadius: isFirstItem ? '0.5rem 0.5rem 0 0' : isLastItem ? '0 0 0.5rem 0.5rem' : '0',
        touchAction: 'pan-y' // Permitir scroll vertical pero capturar horizontal
      }}
    >
      {/* Contenido del producto sin capacidad de swipe para Mensaje Mágico */}
      <div 
        className={`flex flex-col justify-between transition-transform bg-card 
                  ${isEditing ? 'border-primary/30 bg-primary/5' : ''}
                  ${isPaid ? 'bg-green-50 border-green-100' : ''}`}
        style={{ 
          transition: 'transform 0.3s ease-out',
          height: '100%',
          position: 'relative',
          zIndex: isEditing ? 20 : 10,
          borderRadius: isFirstItem ? '0.5rem 0.5rem 0 0' : isLastItem ? '0 0 0.5rem 0.5rem' : '0'
        }}
      >
        {isEditing ? (
          <div className="flex-1 flex flex-col gap-2 w-full p-3">
            <div className="flex-1">
              <div className="font-medium text-sm flex items-center gap-2">
                <div className="bg-primary/10 p-1 rounded-full">
                  <Package className="h-3 w-3 text-primary" />
                </div>
                {product.name}
              </div>
              {product.variant && (
                <div className="text-xs text-muted-foreground mt-1">
                  {product.variant}
                </div>
              )}
            </div>
            <div className="flex items-center justify-between edit-controls">
              <div className="flex items-center">
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-7 w-7 rounded-full"
                  onClick={() => onQuantityChange(productKey, currentQuantity - 1)}
                  disabled={isSaving || currentQuantity <= 1}
                  aria-label="Reducir cantidad"
                >
                  <X className="h-3 w-3" />
                </Button>
                <Input
                  type="number"
                  value={currentQuantity}
                  onChange={(e) => onQuantityChange(productKey, parseInt(e.target.value) || 1)}
                  className="w-12 h-7 mx-1 text-center p-0"
                  disabled={isSaving}
                  aria-label="Cantidad"
                  min="1"
                />
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-7 w-7 rounded-full"
                  onClick={() => onQuantityChange(productKey, currentQuantity + 1)}
                  disabled={isSaving}
                  aria-label="Aumentar cantidad"
                >
                  <Check className="h-3 w-3" />
                </Button>
              </div>
              <div className="flex gap-2 edit-controls">
                <Button 
                  variant="default" 
                  size="sm" 
                  className="h-7 rounded-full px-3"
                  onClick={() => onSaveProductChanges(productKey, product.orderId, product.id || '')}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Check className="h-4 w-4 mr-1" />
                  )}
                  Guardar
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Nuevo diseño según la imagen proporcionada */}
            <div className="border border-amber-200 bg-amber-50/50 rounded-md m-2 overflow-hidden">
              <div className="grid grid-cols-12 gap-0">
                {/* Nombre del producto (columna izquierda) */}
                <div className="col-span-3 bg-primary/5 p-2 flex items-center justify-center border-r border-amber-200">
                  <div className="font-medium text-sm text-center">{productName}</div>
                </div>
                
                {/* Variantes y detalles (columna derecha) */}
                <div className="col-span-9 p-2">
                  {/* Variante 1 (si existe) */}
                  {variantName && (
                    <div className="flex justify-between items-center text-sm mb-1">
                      <div className="flex items-center">
                        <span className="font-medium">{variantName}</span>
                        <span className="text-muted-foreground ml-1">x {product.quantity}</span>
                      </div>
                      <div className="font-medium">
                        <PriceDisplay value={Math.round(product.price)} />
                      </div>
                    </div>
                  )}
                  
                  {/* Si no hay variante, mostrar el producto principal */}
                  {!variantName && (
                    <div className="flex justify-between items-center text-sm mb-1">
                      <div className="flex items-center">
                        <span className="font-medium">{product.name}</span>
                        <span className="text-muted-foreground ml-1">x {product.quantity}</span>
                      </div>
                      <div className="font-medium">
                        <PriceDisplay value={Math.round(product.price)} />
                      </div>
                    </div>
                  )}
                  
                  {/* Línea divisoria */}
                  <div className="border-t border-amber-200 my-1"></div>
                  
                  {/* Total */}
                  <div className="flex justify-between items-center">
                    <div className="text-sm font-medium text-muted-foreground">
                      Total:
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`font-medium text-sm ${isPaid ? 'text-green-600' : ''}`}>
                        <PriceDisplay value={Math.round(calculateTotal())} />
                      </span>
                      <Switch
                        checked={isPaid}
                        onCheckedChange={handleSwitchChange}
                        disabled={isSaving}
                        className={`data-[state=checked]:bg-green-500 h-4 w-6 focus-visible:ring-0`}
                        aria-label={isPaid ? "Marcar como no pagado" : "Marcar como pagado"}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
