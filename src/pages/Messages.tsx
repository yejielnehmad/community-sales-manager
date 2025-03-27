
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { MessageAnalysis, MessageProduct, MessageVariant } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { analyzeCustomerMessage } from "@/services/geminiService";

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
      // Llamada real a la API de Cohere a través de nuestro servicio
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
              
              <TabsContent value="client" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Cliente Identificado</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="font-medium">Nombre:</div>
                      <div>{analysisResult[0].client?.name || "No identificado"}</div>
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
                      {analysisResult[0].items?.map((item, index) => (
                        <div key={index} className="p-3 border rounded-md">
                          <div className="font-medium">{item.product.name}</div>
                          <div className="text-sm text-muted-foreground">
                            Cantidad: {item.quantity} {item.variant ? item.variant.name : ""}
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
                        <div>{analysisResult[0].client?.name || "No identificado"}</div>
                      </div>
                      <div>
                        <div className="font-medium">Productos:</div>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                          {analysisResult[0].items?.map((item, index) => (
                            <li key={index}>
                              {item.quantity} {item.variant ? item.variant.name : ""} de {item.product.name}
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
              
              {(phase1Response || phase2Response) && (
                <TabsContent value="debug" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Fases de Análisis</CardTitle>
                      <CardDescription>
                        Detalles del proceso de análisis en dos fases
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        {phase1Response && (
                          <div>
                            <div className="font-medium mb-2">Fase 1: Análisis de mensaje</div>
                            <div className="bg-gray-100 p-3 rounded-md overflow-auto max-h-60 whitespace-pre-wrap text-sm">
                              {phase1Response}
                            </div>
                            <Button
                              variant="outline" 
                              size="sm"
                              className="mt-2"
                              onClick={() => {
                                navigator.clipboard.writeText(phase1Response);
                                toast({
                                  title: "Copiado",
                                  description: "Texto de la fase 1 copiado al portapapeles",
                                });
                              }}
                            >
                              Copiar
                            </Button>
                          </div>
                        )}
                        
                        {phase2Response && (
                          <div>
                            <div className="font-medium mb-2">Fase 2: Estructuración JSON</div>
                            <div className="bg-gray-100 p-3 rounded-md overflow-auto max-h-60 whitespace-pre-wrap text-sm">
                              {phase2Response}
                            </div>
                            <Button
                              variant="outline" 
                              size="sm"
                              className="mt-2"
                              onClick={() => {
                                navigator.clipboard.writeText(phase2Response);
                                toast({
                                  title: "Copiado",
                                  description: "Texto de la fase 2 copiado al portapapeles",
                                });
                              }}
                            >
                              Copiar
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
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
