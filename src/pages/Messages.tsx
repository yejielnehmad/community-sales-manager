
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { MessageAnalysis } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { analyzeCustomerMessage } from "@/services/geminiService";
import { MessagesClient } from "@/components/messages/MessagesClient";
import { MessagesProducts } from "@/components/messages/MessagesProducts";
import { MessagesSummary } from "@/components/messages/MessagesSummary";
import { MessagesDebug } from "@/components/messages/MessagesDebug";

/**
 * Página para procesar mensajes de clientes
 * v1.0.0
 */
const Messages = () => {
  const [message, setMessage] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<MessageAnalysis[] | null>(null);
  const [phase1Response, setPhase1Response] = useState<string | null>(null);
  const [phase2Response, setPhase2Response] = useState<string | null>(null);
  const { toast } = useToast();

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
    
    try {
      // Llamada real a la API a través de nuestro servicio
      const analysisResponse = await analyzeCustomerMessage(message);
      setAnalysisResult(analysisResponse.result);
      setPhase1Response(analysisResponse.phase1Response || null);
      setPhase2Response(analysisResponse.phase2Response || null);
      
      if (analysisResponse.result.length === 0) {
        toast({
          title: "Sin resultados",
          description: "No se pudieron identificar pedidos en el mensaje",
          variant: "default",
        });
      }
      
    } catch (error) {
      console.error("Error al analizar mensaje:", error);
      toast({
        title: "Error al analizar",
        description: error instanceof Error ? error.message : "Error desconocido al procesar el mensaje",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const createOrder = () => {
    // Aquí eventualmente crearemos el pedido en Supabase
    toast({
      title: "Pedido creado",
      description: "El pedido se ha creado correctamente",
    });
    setMessage("");
    setAnalysisResult(null);
    setPhase1Response(null);
    setPhase2Response(null);
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

          {analysisResult && analysisResult.length > 0 && (
            <Tabs defaultValue="client" className="md:col-span-2">
              <TabsList>
                <TabsTrigger value="client">Cliente</TabsTrigger>
                <TabsTrigger value="products">Productos</TabsTrigger>
                <TabsTrigger value="summary">Resumen</TabsTrigger>
                {(phase1Response || phase2Response) && (
                  <TabsTrigger value="debug">Fases de Análisis</TabsTrigger>
                )}
              </TabsList>
              
              <TabsContent value="client">
                <MessagesClient client={analysisResult[0].client} />
              </TabsContent>
              
              <TabsContent value="products">
                <MessagesProducts items={analysisResult[0].items || []} />
              </TabsContent>
              
              <TabsContent value="summary">
                <MessagesSummary 
                  client={analysisResult[0].client} 
                  items={analysisResult[0].items || []} 
                  onCreateOrder={createOrder}
                />
              </TabsContent>
              
              {(phase1Response || phase2Response) && (
                <TabsContent value="debug">
                  <MessagesDebug 
                    phase1Response={phase1Response} 
                    phase2Response={phase2Response} 
                  />
                </TabsContent>
              )}
            </Tabs>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Messages;
