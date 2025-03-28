
/**
 * Componente para mostrar el resumen de un mensaje analizado
 * v1.0.0
 */
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface MessagesSummaryProps {
  client?: {
    id?: string | null;
    name?: string;
  } | null;
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
  }>;
  onCreateOrder: () => void;
}

export const MessagesSummary = ({ client, items, onCreateOrder }: MessagesSummaryProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Resumen del Pedido</CardTitle>
        <CardDescription>
          Confirma la información antes de crear el pedido
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="font-medium">Cliente:</div>
            <div>{client?.name || "No identificado"}</div>
          </div>
          <div>
            <div className="font-medium">Productos:</div>
            {items.length > 0 ? (
              <ul className="list-disc pl-5 mt-2 space-y-1">
                {items.map((item, index) => (
                  <li key={index}>
                    {item.quantity} {item.variant ? item.variant.name : ""} de {item.product.name}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-muted-foreground">No se identificaron productos</div>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button onClick={onCreateOrder}>
          Crear Pedido
        </Button>
      </CardFooter>
    </Card>
  );
};
