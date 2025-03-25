
import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { getProductIcon } from "@/services/productIconService";
import { PriceDisplay } from "@/components/ui/price-display";

export interface ProductVariant {
  id?: string;
  name: string;
  price: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  image_url?: string;
  variants: ProductVariant[];
}

interface ProductCardProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (productId: string) => void;
}

export function ProductCard({ product, onEdit, onDelete }: ProductCardProps) {
  const [expanded, setExpanded] = useState(false);
  const IconComponent = getProductIcon(product.name);
  
  return (
    <Card className="product-card">
      <CardHeader className="p-0 pb-2 space-y-1">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center text-primary">
              <IconComponent className="h-4 w-4" />
            </div>
            <h3 className="font-medium text-base">{product.name}</h3>
          </div>
          <div className="flex gap-1">
            <Button 
              onClick={(e) => {
                e.stopPropagation();
                onEdit(product);
              }} 
              className="btn-edit"
              size="sm"
            >
              <Edit className="h-3 w-3" />
            </Button>
            <Button 
              onClick={(e) => {
                e.stopPropagation();
                onDelete(product.id);
              }} 
              className="btn-delete"
              size="sm"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2">
          {product.description || "Sin descripción"}
        </p>
      </CardHeader>
      
      <CardContent className="p-0 pt-2">
        <div className="flex flex-col gap-1">
          <Button 
            variant="outline" 
            size="sm" 
            className="text-xs w-full justify-between" 
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <>
                Ocultar variantes <ChevronUp className="h-3 w-3" />
              </>
            ) : (
              <>
                Ver variantes <ChevronDown className="h-3 w-3" />
              </>
            )}
            <span className="font-medium">{product.variants.length}</span>
          </Button>
          
          {expanded && (
            <div className="mt-2 space-y-2">
              {product.variants.map((variant, index) => (
                <div key={variant.id || index} className="bg-muted rounded-md p-2 flex justify-between items-center">
                  <span className="text-sm">{variant.name}</span>
                  <span className="text-sm font-medium">
                    <PriceDisplay value={variant.price} />
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
