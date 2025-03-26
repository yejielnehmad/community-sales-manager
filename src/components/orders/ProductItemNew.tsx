
import { useState, useEffect, useRef } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Edit, Trash, Loader2, Check, X, Package, CircleCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PriceDisplay } from "@/components/ui/price-display";
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
  const elRef = useRef<HTMLDivElement>(null);
  
  const { swipeX, resetSwipe, getMouseProps, getTouchProps, isActive } = useSwipe({
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
    onToggleProductPaid(productKey, product.orderId, product.id || '', checked);
    
    setTimeout(() => {
      setIsAnimating(false);
    }, 500);
  };

  useEffect(() => {
    if (isEditing) {
      window.scrollTo({
        top: window.scrollY,
        behavior: 'smooth'
      });
    }
  }, [isEditing]);
  
  const calculateTotal = () => {
    if (isEditing) {
      return product.price * currentQuantity;
    }
    return product.price * product.quantity;
  };

  const productName = product.name.split(' ')[0] || product.name;
  const variantName = product.variant || (product.name.includes(' ') ? product.name.substring(productName.length).trim() : '');

  const swipeProps = (!isPaid && !isEditing) ? {
    ...getMouseProps(),
    ...getTouchProps()
  } : {};

  return (
    <div 
      key={productKey} 
      ref={elRef}
      data-product-key={productKey}
      className={`relative overflow-hidden transition-all duration-200 ${isPaid ? 'opacity-100' : 'opacity-100'}`}
      style={{ 
        minHeight: isEditing ? '120px' : '64px',
        borderRadius: isFirstItem ? '1rem 1rem 0 0' : isLastItem ? '0 0 1rem 1rem' : '0',
        touchAction: 'pan-y'
      }}
    >
      {!isEditing && (
        <div 
          className="absolute inset-y-0 right-0 flex h-full"
          style={{ 
            width: '70px',
            zIndex: 1,
            overflow: 'hidden',
            borderTopRightRadius: isFirstItem ? '1rem' : '0',
            borderBottomRightRadius: isLastItem ? '1rem' : '0'
          }}
        >
          {/* Contenedor para el botón Editar */}
          <div className="w-1/2 h-full relative">
            <SwipeActionButton 
              variant="warning"
              icon={<Edit className="h-5 w-5" />}
              onClick={() => onEditProduct(productKey, product.quantity, isPaid)}
              disabled={isSaving || isPaid}
              label="Editar producto"
            />
          </div>
          
          {/* Contenedor para el botón Eliminar */}
          <div className="w-1/2 h-full relative">
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
        className={`flex flex-col justify-between transition-transform bg-card swipe-item
                  ${isActive ? 'swipe-item-active' : ''}
                  ${!isPaid && !isEditing ? 'cursor-grab active:cursor-grabbing' : ''}
                  ${isEditing ? 'border-primary/30 bg-primary/5' : ''}
                  ${isPaid ? 'bg-green-50 border-green-100' : ''}`}
        style={{ 
          transform: `translateX(${isEditing ? 0 : swipeX}px)`,
          transition: isActive ? 'none' : 'transform 0.3s ease-out',
          height: '100%',
          position: 'relative',
          zIndex: isEditing ? 20 : (swipeX === 0 ? 10 : 5),
          borderRadius: isFirstItem ? '1rem 1rem 0 0' : isLastItem ? '0 0 1rem 1rem' : '0',
          borderTopRightRadius: swipeX < 0 ? '1rem' : (isFirstItem ? '1rem' : '0'),
          borderBottomRightRadius: swipeX < 0 ? '1rem' : (isLastItem ? '1rem' : '0')
        }}
      >
        {isEditing ? (
          // Modo de edición simplificado
          <div className="flex-1 flex flex-col p-3">
            <div className="font-semibold text-sm flex items-center gap-2 mb-4">
              <div className="bg-primary/10 p-1 rounded-full">
                <Package className="h-3 w-3 text-primary" />
              </div>
              {product.name}
              {product.variant && (
                <span className="text-xs text-muted-foreground">
                  ({product.variant})
                </span>
              )}
            </div>
            
            {/* Controles de edición simplificados */}
            <div className="flex items-center justify-between">
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
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={currentQuantity}
                  onChange={(e) => onQuantityChange(productKey, parseInt(e.target.value) || 1)}
                  className="w-12 h-7 mx-1 text-center p-0 rounded-xl"
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
              <div className="flex gap-2">
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
            <div className="border border-amber-200 bg-amber-50/50 rounded-xl m-2 overflow-hidden">
              <div className="grid grid-cols-12 gap-0">
                <div className="col-span-3 bg-primary/5 p-2 flex items-center justify-center border-r border-amber-200">
                  <div className="font-bold text-sm text-center font-product-name">{productName}</div>
                </div>
                <div className="col-span-9 p-2">
                  {variantName && (
                    <div className="flex justify-between items-center text-sm mb-1">
                      <div className="flex items-center">
                        <span className="font-bold font-product-variant">{variantName}</span>
                        <span className="text-muted-foreground ml-1">x {product.quantity}</span>
                      </div>
                      <div className="font-medium font-price pr-4">
                        <PriceDisplay value={Math.round(product.price)} />
                      </div>
                    </div>
                  )}
                  {!variantName && (
                    <div className="flex justify-between items-center text-sm mb-1">
                      <div className="flex items-center">
                        <span className="font-bold font-product-variant">{product.name}</span>
                        <span className="text-muted-foreground ml-1">x {product.quantity}</span>
                      </div>
                      <div className="font-medium font-price pr-4">
                        <PriceDisplay value={Math.round(product.price)} />
                      </div>
                    </div>
                  )}
                  <div className="border-t border-amber-200 my-1"></div>
                  <div className="flex justify-between items-center">
                    <div className="text-sm font-medium text-muted-foreground">
                      Total:
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold text-sm font-price ${isPaid ? 'text-green-600' : ''} pr-3`}>
                        <PriceDisplay value={Math.round(calculateTotal())} />
                      </span>
                      <Switch
                        checked={isPaid}
                        onCheckedChange={handleSwitchChange}
                        disabled={isSaving}
                        className={`data-[state=checked]:bg-black h-4 w-6 focus-visible:ring-0 switch-modern`}
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
