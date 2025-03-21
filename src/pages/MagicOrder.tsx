
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { MessageAnalysis } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { GOOGLE_API_KEY } from "@/lib/api-config";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

const MagicOrder = () => {
  const [message, setMessage] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<MessageAnalysis | null>(null);
  const { toast } = useToast();

  // Función real para analizar el mensaje utilizando la API de Google Gemini
  const analyzeMessage = async () => {
    if (!message.trim()) {
      toast({
        title: "Error",
        description: "Por favor, ingresa un mensaje para analizar",
        variant: "destructive",
      });
      return;
    }

    if (!GOOGLE_API_KEY) {
      toast({
        title: "Error",
        description: "La clave de API de Google Gemini no está configurada",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);

    try {
      // Prompt para el modelo de IA que explica lo que debe extraer
      const prompt = `
      Analiza este mensaje de un cliente y extrae la siguiente información:
      1. Nombre del cliente
      2. Lista de productos solicitados con cantidades y variantes si están mencionadas

      Mensaje del cliente: "${message}"

      Responde SOLAMENTE en formato JSON con esta estructura exacta (sin explicaciones adicionales):
      {
        "client": {
          "name": "Nombre del cliente"
        },
        "items": [
          {
            "product": "Nombre del producto",
            "quantity": número,
            "variant": "variante (si se menciona, de lo contrario omitir)"
          }
        ]
      }
      `;

      // Llamada a la API de Google Gemini
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GOOGLE_API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: prompt
              }]
            }],
            generationConfig: {
              temperature: 0.2,
              topP: 0.8,
              maxOutputTokens: 1024,
            }
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Error en la API de Google Gemini: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log("Respuesta de Gemini:", data);

      // Extraer el texto generado del formato de respuesta de Gemini
      let jsonText = "";
      if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
        jsonText = data.candidates[0].content.parts[0].text;
      } else {
        throw new Error("Formato de respuesta inesperado de la API de Gemini");
      }

      // Limpiar el texto para asegurar que sea JSON válido
      jsonText = jsonText.trim();
      // Eliminar marcadores de código si están presentes
      if (jsonText.startsWith("```json")) {
        jsonText = jsonText.replace(/```json\n/, "").replace(/\n```$/, "");
      } else if (jsonText.startsWith("```")) {
        jsonText = jsonText.replace(/```\n/, "").replace(/\n```$/, "");
      }

      const parsedResult = JSON.parse(jsonText) as MessageAnalysis;
      setAnalysisResult(parsedResult);
    } catch (error: any) {
      console.error("Error al analizar el mensaje:", error);
      toast({
        title: "Error",
        description: error.message || "Error al analizar el mensaje",
        variant: "destructive",
      });
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
