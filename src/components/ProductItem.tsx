
import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Edit, Trash, Loader2, Check, X, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
  swipeX: number;
  isSaving: boolean;
  editingProduct: string | null;
  productQuantities: { [key: string]: number };
  onDeleteProduct: (productKey: string, orderId: string, itemId: string) => void;
  onEditProduct: (productKey: string, currentQuantity: number, isPaid: boolean) => void;
  onSaveProductChanges: (productKey: string, orderId: string, itemId: string) => void;
  onQuantityChange: (productKey: string, newQuantity: number) => void;
  onToggleProductPaid: (productKey: string, orderId: string, itemId: string, isPaid: boolean) => void;
  registerRef: (key: string, ref: HTMLDivElement | null) => void;
}

export const ProductItem = ({
  productKey,
  product,
  isPaid,
  isLastItem,
  isFirstItem,
  swipeX,
  isSaving,
  editingProduct,
  productQuantities,
  onDeleteProduct,
  onEditProduct,
  onSaveProductChanges,
  onQuantityChange,
  onToggleProductPaid,
  registerRef
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
  
  return (
    <div 
      key={productKey} 
      data-product-key={productKey}
      className={`relative overflow-hidden transition-all duration-200 ${isPaid ? 'opacity-90' : 'opacity-100'}`}
      style={{ 
        minHeight: isEditing ? '120px' : '74px',
        borderRadius: isFirstItem ? '0.5rem 0.5rem 0 0' : isLastItem ? '0 0 0.5rem 0.5rem' : '0'
      }}
      ref={(ref) => registerRef(productKey, ref)}
    >
      <div 
        className="absolute inset-y-0 right-0 flex items-stretch h-full overflow-hidden"
        style={{ 
          width: '70px',
          borderRadius: isLastItem ? '0 0 0.5rem 0' : '0',
          zIndex: 1
        }}
      >
        <div className="flex-1 flex items-stretch h-full">
          <button 
            className="product-action-button h-full w-full bg-amber-500 hover:bg-amber-600 text-white flex flex-col items-center justify-center transition-colors"
            onClick={() => onEditProduct(productKey, product.quantity, isPaid)}
            disabled={isSaving || isPaid}
            aria-label="Editar producto"
          >
            <Edit className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 flex items-stretch h-full">
          <button 
            className="product-action-button h-full w-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors"
            onClick={() => onDeleteProduct(productKey, product.orderId, product.id || '')}
            disabled={isSaving}
            aria-label="Eliminar producto"
          >
            <Trash className="h-5 w-5" />
          </button>
        </div>
      </div>
      
      <div 
        className={`flex justify-between items-center p-4 transition-transform bg-card 
                  ${isEditing ? 'border-primary/30 bg-primary/5' : ''}
                  ${isPaid ? 'bg-green-50/50 border-green-100' : ''}`}
        style={{ 
          transform: `translateX(${isEditing ? 0 : swipeX}px)`,
          transition: 'transform 0.3s ease-out',
          height: '100%',
          position: 'relative',
          zIndex: isEditing ? 20 : (swipeX === 0 ? 10 : 5),
          borderRadius: isFirstItem ? '0.5rem 0.5rem 0 0' : isLastItem ? '0 0 0.5rem 0.5rem' : '0'
        }}
      >
        {isEditing ? (
          <div className="flex-1 flex flex-col gap-3 w-full">
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
                  className="h-8 w-8 rounded-full"
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
                  className="w-12 h-8 mx-1 text-center p-0"
                  disabled={isSaving}
                  aria-label="Cantidad"
                  min="1"
                />
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-8 w-8 rounded-full"
                  onClick={() => onQuantityChange(productKey, currentQuantity + 1)}
                  disabled={isSaving}
                  aria-label="Aumentar cantidad"
                >
                  <Check className="h-3 w-3" />
                </Button>
              </div>
              <div className="flex gap-2 edit-controls">
                <Button 
                  variant="destructive" 
                  size="sm" 
                  className="h-8 rounded-full px-3"
                  onClick={() => onDeleteProduct(productKey, product.orderId, product.id || '')}
                  disabled={isSaving}
                >
                  <Trash className="h-4 w-4 mr-1" />
                  Eliminar
                </Button>
                <Button 
                  variant="default" 
                  size="sm" 
                  className="h-8 rounded-full px-3"
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
            <div className="flex-1">
              <div className="font-medium text-sm flex items-center gap-2">
                <div className={`p-1 rounded-full ${isPaid ? 'bg-green-100' : 'bg-primary/10'}`}>
                  <Package className={`h-3 w-3 ${isPaid ? 'text-green-600' : 'text-primary'}`} />
                </div>
                {product.name}
              </div>
              {product.variant && (
                <div className="text-xs text-muted-foreground mt-1">
                  <Badge variant={isPaid ? "outline" : "secondary"} className={`font-normal ${isPaid ? 'border-green-200 bg-green-50 text-green-700' : ''}`}>
                    {product.variant}
                  </Badge>
                </div>
              )}
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <div>
                  {product.quantity} {product.quantity === 1 ? 'unidad' : 'unidades'}
                </div>
                <div className={`font-medium ${isPaid ? 'text-green-600' : 'text-foreground'}`}>
                  ${product.total.toFixed(2)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 ml-2">
              <Switch
                checked={isPaid}
                onCheckedChange={handleSwitchChange}
                disabled={isSaving}
                className={`data-[state=checked]:bg-green-500 h-4 w-7 ${isAnimating ? 'animate-pulse' : ''}`}
                aria-label={isPaid ? "Marcar como no pagado" : "Marcar como pagado"}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
