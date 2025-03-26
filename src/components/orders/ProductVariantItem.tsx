
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Edit, Trash, Loader2, Check, X, CircleCheck } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { PriceDisplay } from "@/components/ui/price-display";
import { useSwipe } from "@/hooks/use-swipe";
import { SwipeActionButton } from "@/components/ui/swipe-action-button";

export interface ProductVariantProps {
  variantId: string;
  name: string;
  variant: string;
  quantity: number;
  price: number;
  isPaid: boolean;
  isSaving: boolean;
  isEditing: boolean;
  orderId: string;
  itemId?: string;
  onEditVariant: (variantId: string, currentQuantity: number, isPaid: boolean) => void;
  onQuantityChange: (variantId: string, newQuantity: number) => void;
  onSaveVariantChanges: (variantId: string, orderId: string, itemId?: string) => void;
  onDeleteVariant: (variantId: string, orderId: string, itemId?: string) => void;
  editingQuantity: number;
}

export const ProductVariantItem = ({
  variantId,
  name,
  variant,
  quantity,
  price,
  isPaid,
  isSaving,
  isEditing,
  orderId,
  itemId,
  onEditVariant,
  onQuantityChange,
  onSaveVariantChanges,
  onDeleteVariant,
  editingQuantity
}: ProductVariantProps) => {
  const [isActive, setIsActive] = useState(false);
  
  // Hook de swipe para cada variante individual
  const { swipeX, resetSwipe, getMouseProps, getTouchProps } = useSwipe({
    maxSwipe: -70,
    disabled: isPaid || isEditing, // Deshabilitar swipe si está pagado o editando
    onSwipeStart: () => {
      setIsActive(true);
    },
    onSwipeEnd: (completed) => {
      setIsActive(false);
      if (!completed) {
        resetSwipe();
      }
    }
  });
  
  // Determinar si aplicamos las props de swipe
  const swipeProps = (!isPaid && !isEditing) ? {
    ...getMouseProps(),
    ...getTouchProps()
  } : {};
  
  // Calcular el total
  const total = price * quantity;
  const editingTotal = price * editingQuantity;
  
  return (
    <div className="relative overflow-hidden">
      {/* Botones de acción en el fondo - solo visibles cuando NO está en modo edición */}
      {!isEditing && (
        <div 
          className="absolute inset-y-0 right-0 flex items-stretch h-full overflow-hidden"
          style={{ 
            width: '70px',
            zIndex: 1
          }}
        >
          <div className="flex-1 flex items-stretch h-full">
            <SwipeActionButton 
              variant="warning"
              icon={<Edit className="h-4 w-4" />}
              onClick={() => onEditVariant(variantId, quantity, isPaid)}
              disabled={isSaving || isPaid}
              label="Editar variante"
            />
          </div>
          <div className="flex-1 flex items-stretch h-full">
            <SwipeActionButton 
              variant="destructive"
              icon={<Trash className="h-4 w-4" />}
              onClick={() => onDeleteVariant(variantId, orderId, itemId)}
              disabled={isSaving}
              label="Eliminar variante"
            />
          </div>
        </div>
      )}
      
      <div 
        {...swipeProps}
        className={`transition-transform bg-card relative ${isEditing ? 'bg-primary/5' : ''}`}
        style={{ 
          transform: `translateX(${swipeX}px)`,
          transition: isActive ? 'none' : 'transform 0.3s ease-out',
          zIndex: isEditing ? 20 : (swipeX === 0 ? 10 : 5),
        }}
      >
        {isEditing ? (
          <div className="p-2 border border-primary/20 rounded-md">
            <div className="flex justify-between items-center text-sm mb-2">
              <span className="font-medium">{variant}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-7 w-7 rounded-full"
                  onClick={() => onQuantityChange(variantId, editingQuantity - 1)}
                  disabled={isSaving || editingQuantity <= 1}
                  aria-label="Reducir cantidad"
                >
                  <X className="h-3 w-3" />
                </Button>
                <Input
                  type="number"
                  value={editingQuantity}
                  onChange={(e) => onQuantityChange(variantId, parseInt(e.target.value) || 1)}
                  className="w-12 h-7 mx-1 text-center p-0"
                  disabled={isSaving}
                  aria-label="Cantidad"
                  min="1"
                />
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-7 w-7 rounded-full"
                  onClick={() => onQuantityChange(variantId, editingQuantity + 1)}
                  disabled={isSaving}
                  aria-label="Aumentar cantidad"
                >
                  <Check className="h-3 w-3" />
                </Button>
              </div>
              
              <div className="flex gap-2">
                <span className="text-xs flex items-center">
                  Total: <PriceDisplay value={Math.round(editingTotal)} className="ml-1" />
                </span>
                <Button 
                  variant="default" 
                  size="sm" 
                  className="h-7 rounded-full px-3"
                  onClick={() => onSaveVariantChanges(variantId, orderId, itemId)}
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
          <div className="flex justify-between items-center py-1">
            <div className="flex items-center gap-1">
              {isPaid && <CircleCheck size={10} className="text-green-500" />}
              <span className="text-xs font-medium">
                {variant} x {quantity}
              </span>
            </div>
            <div>
              <span className="text-xs font-medium">
                <PriceDisplay value={Math.round(price)} />
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
