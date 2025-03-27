
import { useState, useEffect } from 'react';
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Settings2, Wand, RefreshCcw, Save, PlusCircle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { 
  DEFAULT_ANALYSIS_PROMPT, 
  getCurrentAnalysisPrompt, 
  setCustomAnalysisPrompt, 
  resetAnalysisPrompt 
} from "@/services/geminiService";

const Settings = () => {
  const [currentTab, setCurrentTab] = useState("ia");
  const [customPrompt, setCustomPrompt] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Cargar el prompt actual
    setCustomPrompt(getCurrentAnalysisPrompt());
  }, []);

  const handleSavePrompt = () => {
    setIsSaving(true);
    setTimeout(() => {
      try {
        setCustomAnalysisPrompt(customPrompt);
        toast({
          title: "Prompt guardado",
          description: "El nuevo prompt para análisis de mensajes ha sido guardado correctamente.",
        });
      } catch (error) {
        toast({
          title: "Error al guardar",
          description: "No se pudo guardar el prompt personalizado.",
          variant: "destructive",
        });
      } finally {
        setIsSaving(false);
      }
    }, 500);
  };

  const handleResetPrompt = () => {
    resetAnalysisPrompt();
    setCustomPrompt(DEFAULT_ANALYSIS_PROMPT);
    toast({
      title: "Prompt restablecido",
      description: "Se ha restaurado el prompt predeterminado.",
    });
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Settings2 className="h-7 w-7 text-primary" />
              Configuración
            </h1>
            <p className="text-muted-foreground">Ajustes y opciones personalizadas</p>
          </div>
        </div>

        <Tabs defaultValue="ia" value={currentTab} onValueChange={setCurrentTab}>
          <TabsList>
            <TabsTrigger value="ia" className="flex items-center gap-1">
              <Wand className="h-4 w-4" />
              Inteligencia Artificial
            </TabsTrigger>
            {/* Pueden añadirse más pestañas en el futuro */}
          </TabsList>
          
          <TabsContent value="ia" className="space-y-4 pt-4">
            <Card className="rounded-xl shadow-sm overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wand className="h-5 w-5 text-primary" />
                  Configuración de Prompts para IA
                </CardTitle>
                <CardDescription>
                  Personaliza las instrucciones que se envían al modelo de IA para el análisis de mensajes.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium mb-2">Prompt para análisis de mensajes</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Personaliza cómo la IA interpreta y estructura los mensajes de pedidos. Usa {"{productsContext}"}, {"{clientsContext}"} y {"{messageText}"} como marcadores para la información dinámica.
                  </p>
                  <Textarea 
                    value={customPrompt} 
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    className="min-h-[400px] font-mono text-sm"
                    placeholder="Ingresa el prompt personalizado aquí..."
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button 
                  variant="outline" 
                  onClick={handleResetPrompt}
                  className="flex items-center gap-1"
                >
                  <RefreshCcw className="h-4 w-4" />
                  Restablecer predeterminado
                </Button>
                <Button 
                  onClick={handleSavePrompt} 
                  disabled={isSaving}
                  className="flex items-center gap-1"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? 'Guardando...' : 'Guardar cambios'}
                </Button>
              </CardFooter>
            </Card>
            
            <div className="bg-muted rounded-lg p-4">
              <h3 className="text-sm font-medium mb-2">Ayuda sobre prompts</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Los prompts son instrucciones que indican a la IA cómo interpretar y procesar la información. Un buen prompt puede mejorar significativamente la precisión del análisis.
              </p>
              <h4 className="text-xs font-semibold mt-3 mb-1">Variables disponibles:</h4>
              <ul className="text-xs text-muted-foreground list-disc list-inside">
                <li><code className="bg-muted-foreground/20 rounded px-1">{"{productsContext}"}</code> - Lista de productos en la base de datos</li>
                <li><code className="bg-muted-foreground/20 rounded px-1">{"{clientsContext}"}</code> - Lista de clientes en la base de datos</li>
                <li><code className="bg-muted-foreground/20 rounded px-1">{"{messageText}"}</code> - El mensaje a analizar</li>
              </ul>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Settings;
