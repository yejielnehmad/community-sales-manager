
/**
 * Componente para mostrar productos en mensajes
 * v1.0.0
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MessagesProductsProps {
  items: Array<{
    product: {
      id?: string | null;
      name: string;
    };
    quantity: number;
    variant?: {
      id?: string | null;
      name: string;
    } | null;
    status?: string;
    notes?: string;
  }>;
}

export const MessagesProducts = ({ items }: MessagesProductsProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Productos Identificados</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {items.length > 0 ? (
            items.map((item, index) => (
              <div key={index} className="p-3 border rounded-md">
                <div className="font-medium">{item.product.name}</div>
                <div className="text-sm text-muted-foreground">
                  Cantidad: {item.quantity} {item.variant ? item.variant.name : ""}
                </div>
              </div>
            ))
          ) : (
            <div className="text-muted-foreground">No se identificaron productos</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
