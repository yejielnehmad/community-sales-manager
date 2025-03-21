
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { MessageAnalysis } from "@/types";
import { useToast } from "@/hooks/use-toast";

const Messages = () => {
  const [message, setMessage] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<MessageAnalysis | null>(null);
  const { toast } = useToast();

  // Mock function para analizar el mensaje - eventualmente usará la API de Google
  const analyzeMessage = async () => {
    if (!message.trim()) {
      toast({
        title: "Error",
        description: "Por favor, ingresa un mensaje para analizar",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    
    // Simulación de llamada a la API
    setTimeout(() => {
      // Ejemplo de resultado de análisis (simulado)
      const mockResult: MessageAnalysis = {
        client: {
          name: "María López"
        },
        items: [
          {
            product: "Pañales Talla 1",
            quantity: 2
          },
          {
            product: "Queso Fresco",
            quantity: 1.5,
            variant: "kg"
          }
        ]
      };
      
      setAnalysisResult(mockResult);
      setIsAnalyzing(false);
    }, 1500);
  };

  const createOrder = () => {
    // Aquí eventualmente crearemos el pedido en Supabase
    toast({
      title: "Pedido creado",
      description: "El pedido se ha creado correctamente",
    });
    setMessage("");
    setAnalysisResult(null);
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Procesador de Mensajes</h1>
          <p className="text-muted-foreground">Analiza mensajes de clientes y crea pedidos automáticamente</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Nuevo Mensaje</CardTitle>
              <CardDescription>
                Ingresa el mensaje del cliente para analizarlo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Por ejemplo: 'Hola, soy María López y quiero 2 paquetes de pañales talla 1 y 1.5 kg de queso fresco'"
                className="min-h-32"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button 
                onClick={analyzeMessage}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? "Analizando..." : "Analizar Mensaje"}
              </Button>
            </CardFooter>
          </Card>

          {analysisResult && (
            <Tabs defaultValue="client" className="md:col-span-2">
              <TabsList>
                <TabsTrigger value="client">Cliente</TabsTrigger>
                <TabsTrigger value="products">Productos</TabsTrigger>
                <TabsTrigger value="summary">Resumen</TabsTrigger>
              </TabsList>
              
              <TabsContent value="client" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Cliente Identificado</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="font-medium">Nombre:</div>
                      <div>{analysisResult.client?.name || "No identificado"}</div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="products" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Productos Identificados</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analysisResult.items.map((item, index) => (
                        <div key={index} className="p-3 border rounded-md">
                          <div className="font-medium">{item.product}</div>
                          <div className="text-sm text-muted-foreground">
                            Cantidad: {item.quantity} {item.variant || ""}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="summary" className="space-y-4">
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
                        <div>{analysisResult.client?.name || "No identificado"}</div>
                      </div>
                      <div>
                        <div className="font-medium">Productos:</div>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                          {analysisResult.items.map((item, index) => (
                            <li key={index}>
                              {item.quantity} {item.variant || ""} de {item.product}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-end">
                    <Button onClick={createOrder}>
                      Crear Pedido
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Messages;
