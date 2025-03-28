
/**
 * Componente para mostrar información del cliente en mensajes
 * v1.0.0
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MessagesClientProps {
  client?: {
    id?: string | null;
    name?: string;
    matchConfidence?: string;
  } | null;
}

export const MessagesClient = ({ client }: MessagesClientProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Cliente Identificado</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="font-medium">Nombre:</div>
          <div>{client?.name || "No identificado"}</div>
        </div>
      </CardContent>
    </Card>
  );
};
