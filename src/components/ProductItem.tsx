import { useState, useEffect, useRef } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Edit, Trash, Loader2, Check, X, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useSwipe } from "@/hooks/use-swipe";
import { SwipeActionButton } from "@/components/ui/swipe-action-button";
import { logUserAction, logOperation, logError } from "@/lib/debug-utils";
import { cn } from "@/lib/utils";

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
  
  const { swipeX: localSwipeX, resetSwipe, getMouseProps, getTouchProps } = useSwipe({
    maxSwipe: -70,
    disabled: isPaid || isEditing,
    onSwipeEnd: (completed) => {
      if (!completed) {
        resetSwipe();
      }
    }
  });

  const handleSwitchChange = (checked: boolean) => {
    setIsAnimating(true);
    
    logUserAction('Marcar producto como ' + (checked ? 'pagado' : 'no pagado'), { 
      productKey, 
      productName: product.name,
      previousState: isPaid,
      newState: checked
    });
    
    onToggleProductPaid(productKey, product.orderId, product.id || '', checked);
    
    setTimeout(() => {
      setIsAnimating(false);
    }, 500);
  };

  useEffect(() => {
    if (isEditing) {
      logUserAction('Iniciando edición de producto', { 
        productKey, 
        productName: product.name, 
        currentQuantity 
      });
      
      window.scrollTo({
        top: window.scrollY,
        behavior: 'smooth'
      });
    }
  }, [isEditing, productKey, product.name, currentQuantity]);

  useEffect(() => {
    if (elRef.current) {
      registerRef(productKey, elRef.current);
    }
    
    return () => {
      registerRef(productKey, null);
    };
  }, [productKey, registerRef]);
  
  const totalVariants = product.variants?.reduce((sum, v) => sum + (v.quantity || 0), 0) || 0;
  const totalQuantity = totalVariants > 0 ? totalVariants : product.quantity;
  
  const swipeProps = (!isPaid && !isEditing) ? {
    ...getMouseProps(),
    ...getTouchProps()
  } : {};
  
  const effectiveSwipeX = localSwipeX !== 0 ? localSwipeX : swipeX;
  
  const handleQuantityChange = (newQuantity: number) => {
    const validatedQuantity = Math.max(1, newQuantity);
    
    logUserAction('Cambiar cantidad de producto', { 
      productKey, 
      productName: product.name,
      previousQuantity: currentQuantity,
      newQuantity: validatedQuantity
    });
    
    onQuantityChange(productKey, validatedQuantity);
  };
  
  const handleSave = () => {
    logUserAction('Guardar cambios de producto', { 
      productKey, 
      productName: product.name,
      newQuantity: currentQuantity
    });
    
    onSaveProductChanges(productKey, product.orderId, product.id || '');
  };
  
  const handleDelete = () => {
    logUserAction('Eliminar producto', { 
      productKey, 
      productName: product.name
    });
    
    onDeleteProduct(productKey, product.orderId, product.id || '');
  };
  
  return (
    <div 
      key={productKey} 
      ref={elRef}
      data-product-key={productKey}
      className={`relative overflow-hidden transition-all duration-200 ${isPaid ? 'opacity-90' : 'opacity-100'}`}
      style={{ 
        minHeight: isEditing ? '120px' : '74px',
        borderRadius: isFirstItem ? '0.75rem 0.75rem 0 0' : isLastItem ? '0 0 0.75rem 0.75rem' : '0',
        touchAction: 'pan-y'
      }}
    >
      {!isEditing && (
        <div 
          className="absolute inset-y-0 right-0 flex items-stretch h-full overflow-hidden"
          style={{ 
            width: '70px',
            borderRadius: isLastItem ? '0 0 0.75rem 0' : '0',
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
              testId={`edit-${productKey}`}
            />
          </div>
          <div className="flex-1 flex items-stretch h-full">
            <SwipeActionButton 
              variant="destructive"
              icon={<Trash className="h-5 w-5" />}
              onClick={handleDelete}
              disabled={isSaving}
              label="Eliminar producto"
              testId={`delete-${productKey}`}
            />
          </div>
        </div>
      )}
      
      <div 
        {...swipeProps}
        className={cn(
          "flex justify-between items-center p-4 transition-transform bg-card rounded-xl",
          !isPaid && !isEditing ? 'cursor-grab active:cursor-grabbing' : '',
          isEditing ? 'border-primary/30 bg-primary/5' : '',
          isPaid ? 'bg-green-50/50 border-green-100' : ''
        )}
        style={{ 
          transform: `translateX(${isEditing ? 0 : effectiveSwipeX}px)`,
          transition: 'transform 0.3s ease-out',
          height: '100%',
          position: 'relative',
          zIndex: isEditing ? 20 : (effectiveSwipeX === 0 ? 10 : 5),
          borderRadius: isFirstItem ? '0.75rem 0.75rem 0 0' : isLastItem ? '0 0 0.75rem 0.75rem' : '0'
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
                  onClick={() => handleQuantityChange(currentQuantity - 1)}
                  disabled={isSaving || currentQuantity <= 1}
                  aria-label="Reducir cantidad"
                >
                  <X className="h-3 w-3" />
                </Button>
                <Input
                  type="number"
                  value={currentQuantity}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    if (!isNaN(value)) {
                      handleQuantityChange(value);
                    }
                  }}
                  className={cn(
                    "w-12 h-8 mx-1 text-center p-0",
                    (currentQuantity <= 0) && "input-error"
                  )}
                  disabled={isSaving}
                  aria-label="Cantidad"
                  min="1"
                />
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-8 w-8 rounded-full"
                  onClick={() => handleQuantityChange(currentQuantity + 1)}
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
                  onClick={handleSave}
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
              <div className="font-semibold text-sm flex items-center gap-2 text-gray-800">
                <div className={`p-1 rounded-full ${isPaid ? 'bg-green-100' : 'bg-primary/10'}`}>
                  <Package className={`h-3 w-3 ${isPaid ? 'text-green-600' : 'text-primary'}`} />
                </div>
                {product.name}
              </div>
              
              {product.variants && product.variants.length > 0 ? (
                <div className="flex flex-wrap gap-1 mt-1">
                  {product.variants.map((variant, idx) => (
                    <Badge 
                      key={idx} 
                      variant={isPaid ? "outline" : "secondary"} 
                      className={`font-normal ${isPaid ? 'border-green-200 bg-green-50 text-green-700' : ''}`}
                    >
                      <span className="font-medium">{variant.variant}</span> ({variant.quantity})
                    </Badge>
                  ))}
                </div>
              ) : product.variant ? (
                <div className="text-xs text-muted-foreground mt-1">
                  <Badge variant={isPaid ? "outline" : "secondary"} className={`font-normal ${isPaid ? 'border-green-200 bg-green-50 text-green-700' : ''}`}>
                    <span className="font-medium">{product.variant}</span>
                  </Badge>
                </div>
              ) : null}
              
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <div>
                  {totalQuantity} {totalQuantity === 1 ? 'unidad' : 'unidades'}
                </div>
                <div className={`font-semibold ${isPaid ? 'text-green-600' : 'text-gray-800'}`}>
                  ${product.price.toFixed(2)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 ml-2">
              <Switch
                checked={isPaid}
                onCheckedChange={handleSwitchChange}
                disabled={isSaving}
                className={`data-[state=checked]:bg-black h-4 w-7 ${isAnimating ? 'animate-pulse' : ''}`}
                aria-label={isPaid ? "Marcar como no pagado" : "Marcar como pagado"}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
