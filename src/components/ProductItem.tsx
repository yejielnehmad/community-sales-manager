import { useState, useRef } from "react";
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
  
  return (
    <div 
      key={productKey} 
      data-product-key={productKey}
      className="relative overflow-hidden"
      style={{ 
        minHeight: isEditing ? '120px' : '74px',
        borderRadius: isFirstItem ? '0.5rem 0.5rem 0 0' : isLastItem ? '0 0 0.5rem 0.5rem' : '0'
      }}
      ref={(ref) => registerRef(productKey, ref)}
    >
      <div 
        className="absolute inset-y-0 right-0 flex items-stretch h-full z-0 overflow-hidden"
        style={{ 
          width: '70px',
          borderRadius: isLastItem ? '0 0 0.5rem 0' : '0'
        }}
      >
        <div className="flex-1 flex items-stretch h-full">
          <button 
            className="product-action-button h-full w-full bg-amber-500 hover:bg-amber-600 text-white flex flex-col items-center justify-center transition-colors"
            onClick={() => onEditProduct(productKey, product.quantity, isPaid)}
            disabled={isSaving || isPaid}
          >
            <Edit className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 flex items-stretch h-full">
          <button 
            className="product-action-button h-full w-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors"
            onClick={() => onDeleteProduct(productKey, product.orderId, product.id || '')}
            disabled={isSaving}
          >
            <Trash className="h-5 w-5" />
          </button>
        </div>
      </div>
      
      <div 
        className={`flex justify-between items-center p-4 transition-transform bg-card 
                  ${isEditing ? 'border-primary/30 bg-primary/5' : ''}`}
        style={{ 
          transform: `translateX(${isEditing ? 0 : swipeX}px)`,
          transition: 'transform 0.3s ease-out',
          height: '100%',
          position: 'relative',
          zIndex: swipeX === 0 && !isEditing ? 10 : 5,
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
                  onClick={() => onQuantityChange(productKey, (productQuantities[productKey] || product.quantity) - 1)}
                  disabled={isSaving || (productQuantities[productKey] || product.quantity) <= 1}
                >
                  <X className="h-3 w-3" />
                </Button>
                <Input
                  type="number"
                  value={productQuantities[productKey] || product.quantity}
                  onChange={(e) => onQuantityChange(productKey, parseInt(e.target.value) || 1)}
                  className="w-12 h-8 mx-1 text-center p-0"
                  disabled={isSaving}
                />
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-8 w-8 rounded-full"
                  onClick={() => onQuantityChange(productKey, (productQuantities[productKey] || product.quantity) + 1)}
                  disabled={isSaving}
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
                <div className="bg-primary/10 p-1 rounded-full">
                  <Package className="h-3 w-3 text-primary" />
                </div>
                {product.name}
              </div>
              {product.variant && (
                <div className="text-xs text-muted-foreground mt-1">
                  <Badge variant="outline" className="font-normal">
                    {product.variant}
                  </Badge>
                </div>
              )}
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <div>
                  {product.quantity} {product.quantity === 1 ? 'unidad' : 'unidades'}
                </div>
                <div className="font-medium text-foreground">
                  ${product.total.toFixed(2)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 ml-2">
              <Switch
                checked={isPaid}
                onCheckedChange={(checked) => 
                  onToggleProductPaid(productKey, product.orderId, product.id || '', checked)
                }
                disabled={isSaving}
                className="data-[state=checked]:bg-green-500 h-4 w-7"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
