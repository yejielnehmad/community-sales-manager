
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { MessageAnalysis } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { AIStatusBadge } from "@/components/AIStatusBadge";
import { analyzeCustomerMessage, GeminiError } from "@/services/geminiService";

const MagicOrder = () => {
  const [message, setMessage] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<MessageAnalysis | null>(null);
  const { toast } = useToast();

  // Función para analizar el mensaje utilizando la API de Google Gemini
  const handleAnalyzeMessage = async () => {
    if (!message.trim()) {
      toast({
        title: "Error",
        description: "Por favor, ingresa un mensaje para analizar",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const result = await analyzeCustomerMessage(message);
      
      setAnalysisResult(result);
      toast({
        title: "Análisis completado",
        description: `Se identificaron ${result.items.length} productos para ${result.client.name}`,
      });
    } catch (error) {
      console.error("Error al analizar el mensaje:", error);
      
      if (error instanceof GeminiError) {
        // Personalizamos el mensaje de error basado en el tipo de error
        let errorMessage = "Error al analizar el mensaje";
        
        if (error.status) {
          errorMessage = `Error HTTP ${error.status}: ${error.message}`;
        } else if (error.apiResponse) {
          errorMessage = `Error en la respuesta de la API: ${error.message}`;
        } else {
          errorMessage = error.message;
        }
        
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: (error as Error).message || "Error al analizar el mensaje",
          variant: "destructive",
        });
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const createOrder = async () => {
    if (!analysisResult || !analysisResult.client || !analysisResult.items.length) {
      toast({
        title: "Error",
        description: "No hay suficiente información para crear el pedido",
        variant: "destructive",
      });
      return;
    }

    try {
      // Buscar el cliente por nombre o crearlo si no existe
      const { data: existingClients, error: clientSearchError } = await supabase
        .from('clients')
        .select('id, name')
        .ilike('name', `%${analysisResult.client.name}%`)
        .limit(1);

      if (clientSearchError) throw clientSearchError;

      let clientId;
      if (existingClients && existingClients.length > 0) {
        clientId = existingClients[0].id;
      } else {
        // Crear nuevo cliente
        const { data: newClient, error: createClientError } = await supabase
          .from('clients')
          .insert([{ name: analysisResult.client.name }])
          .select('id')
          .single();

        if (createClientError) throw createClientError;
        clientId = newClient.id;
      }

      // Calcular un total aproximado (en un sistema real, buscaríamos precios reales)
      const total = analysisResult.items.reduce((sum, item) => sum + (item.quantity * 100), 0); // Precio ficticio de 100 por unidad
      
      // Crear el pedido
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([
          {
            client_id: clientId,
            date: new Date().toISOString().split('T')[0],
            status: 'pending',
            total: total,
            amount_paid: 0,
            balance: total
          }
        ])
        .select('id')
        .single();

      if (orderError) throw orderError;

      toast({
        title: "Pedido creado",
        description: `El pedido se ha creado correctamente para ${analysisResult.client.name}`,
      });
      setMessage("");
      setAnalysisResult(null);
    } catch (error: any) {
      console.error("Error al crear el pedido:", error);
      toast({
        title: "Error",
        description: error.message || "Error al crear el pedido",
        variant: "destructive",
      });
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Procesador de Mensajes</h1>
            <p className="text-muted-foreground">Analiza mensajes de clientes y crea pedidos automáticamente</p>
          </div>
          <div>
            <AIStatusBadge />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Nuevo Mensaje</CardTitle>
              <CardDescription>
                Ingresa el mensaje del cliente para analizarlo con IA
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
                onClick={handleAnalyzeMessage}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analizando...
                  </>
                ) : "Analizar Mensaje"}
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

export default MagicOrder;
