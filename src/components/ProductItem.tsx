
import { useState, useEffect, useRef } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Edit, Trash, Loader2, Check, X, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useSwipe } from "@/hooks/use-swipe";
import { SwipeActionButton } from "@/components/ui/swipe-action-button";

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
    is_paid?: boolean;
    variants?: Array<{
      variant: string;
      quantity: number;
      id?: string;
      price?: number;
      total?: number;
    }>;
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
  const elRef = useRef<HTMLDivElement>(null);
  
  // Usar nuestro custom hook para el swipe
  const { swipeX: localSwipeX, resetSwipe, getMouseProps, getTouchProps } = useSwipe({
    maxSwipe: -70,
    disabled: isPaid || isEditing, // Deshabilitar swipe si está pagado o editando
    onSwipeEnd: (completed) => {
      if (!completed) {
        resetSwipe();
      }
    }
  });
  
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

  // Referencia para el elemento padre
  useEffect(() => {
    if (elRef.current) {
      registerRef(productKey, elRef.current);
    }
    
    return () => {
      registerRef(productKey, null);
    };
  }, [productKey, registerRef]);
  
  // Total de todas las variantes
  const totalVariants = product.variants?.reduce((sum, v) => sum + (v.quantity || 0), 0) || 0;
  const totalQuantity = totalVariants > 0 ? totalVariants : product.quantity;
  
  // Determinar si aplicamos las props de swipe
  const swipeProps = (!isPaid && !isEditing) ? {
    ...getMouseProps(),
    ...getTouchProps()
  } : {};
  
  // Usar el swipe local si estamos en control directo, sino usar el proporcionado por el padre
  const effectiveSwipeX = localSwipeX !== 0 ? localSwipeX : swipeX;
  
  return (
    <div 
      key={productKey} 
      ref={elRef}
      data-product-key={productKey}
      className={`relative overflow-hidden transition-all duration-200 ${isPaid ? 'opacity-90' : 'opacity-100'}`}
      style={{ 
        minHeight: isEditing ? '120px' : '74px',
        borderRadius: isFirstItem ? '0.5rem 0.5rem 0 0' : isLastItem ? '0 0 0.5rem 0.5rem' : '0',
        touchAction: 'pan-y' // Permitir scroll vertical pero capturar horizontal
      }}
    >
      {/* Botones de acción en el fondo - solo visibles cuando NO está en modo edición */}
      {!isEditing && (
        <div 
          className="absolute inset-y-0 right-0 flex items-stretch h-full overflow-hidden"
          style={{ 
            width: '70px',
            borderRadius: isLastItem ? '0 0 0.5rem 0' : '0',
            zIndex: 1
          }}
        >
          <div className="flex-1 flex items-stretch h-full">
            <SwipeActionButton 
              variant="warning"
              icon={<Edit className="h-5 w-5" />}
              onClick={() => onEditProduct(productKey, product.quantity, isPaid)}
              disabled={isSaving || isPaid}
              label="Editar producto"
            />
          </div>
          <div className="flex-1 flex items-stretch h-full">
            <SwipeActionButton 
              variant="destructive"
              icon={<Trash className="h-5 w-5" />}
              onClick={() => onDeleteProduct(productKey, product.orderId, product.id || '')}
              disabled={isSaving}
              label="Eliminar producto"
            />
          </div>
        </div>
      )}
      
      <div 
        {...swipeProps}
        className={`flex justify-between items-center p-4 transition-transform bg-card 
                  ${!isPaid && !isEditing ? 'cursor-grab active:cursor-grabbing' : ''}
                  ${isEditing ? 'border-primary/30 bg-primary/5' : ''}
                  ${isPaid ? 'bg-green-50/50 border-green-100' : ''}`}
        style={{ 
          transform: `translateX(${isEditing ? 0 : effectiveSwipeX}px)`,
          transition: 'transform 0.3s ease-out',
          height: '100%',
          position: 'relative',
          zIndex: isEditing ? 20 : (effectiveSwipeX === 0 ? 10 : 5),
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
              
              {/* Mostrar variantes agrupadas */}
              {product.variants && product.variants.length > 0 ? (
                <div className="flex flex-wrap gap-1 mt-1">
                  {product.variants.map((variant, idx) => (
                    <Badge 
                      key={idx} 
                      variant={isPaid ? "outline" : "secondary"} 
                      className={`font-normal ${isPaid ? 'border-green-200 bg-green-50 text-green-700' : ''}`}
                    >
                      {variant.variant} ({variant.quantity})
                    </Badge>
                  ))}
                </div>
              ) : product.variant ? (
                <div className="text-xs text-muted-foreground mt-1">
                  <Badge variant={isPaid ? "outline" : "secondary"} className={`font-normal ${isPaid ? 'border-green-200 bg-green-50 text-green-700' : ''}`}>
                    {product.variant}
                  </Badge>
                </div>
              ) : null}
              
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <div>
                  {totalQuantity} {totalQuantity === 1 ? 'unidad' : 'unidades'}
                </div>
                <div className={`font-medium ${isPaid ? 'text-green-600' : 'text-foreground'}`}>
                  ${product.price.toFixed(2)}
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
