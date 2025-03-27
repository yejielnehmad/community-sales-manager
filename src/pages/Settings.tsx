import { useState, useEffect } from 'react';
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Settings2, Wand, RefreshCcw, Save, PlusCircle, Cpu } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { 
  DEFAULT_ANALYSIS_PROMPT, 
  getCurrentAnalysisPrompt, 
  setCustomAnalysisPrompt, 
  resetAnalysisPrompt,
  AI_MODEL_TYPE,
  getCurrentAiModelType,
  setAiModelType
} from "@/services/geminiService";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

const Settings = () => {
  const [currentTab, setCurrentTab] = useState("ia");
  const [customPrompt, setCustomPrompt] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [selectedModel, setSelectedModel] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    // Cargar el prompt actual y el modelo seleccionado
    setCustomPrompt(getCurrentAnalysisPrompt());
    setSelectedModel(getCurrentAiModelType());
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

  const handleModelChange = (value: string) => {
    setSelectedModel(value);
    if (setAiModelType(value)) {
      toast({
        title: "Modelo de IA cambiado",
        description: `Se ha cambiado el modelo a Claude 3 Haiku (OpenRouter)`,
      });
    } else {
      toast({
        title: "Información",
        description: "Solo se permite usar Claude 3 Haiku (OpenRouter) en esta versión.",
      });
    }
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
            {/* Selector de modelo IA */}
            <Card className="rounded-xl shadow-sm overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="h-5 w-5 text-primary" />
                  Modelo de IA
                </CardTitle>
                <CardDescription>
                  Modelo de inteligencia artificial para el análisis de mensajes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup value={selectedModel} onValueChange={handleModelChange} className="space-y-3">
                  <div className="flex items-center space-x-2 rounded-md border p-3 cursor-pointer hover:bg-muted/30 opacity-50">
                    <RadioGroupItem value={AI_MODEL_TYPE.GEMINI} id="gemini" disabled />
                    <Label htmlFor="gemini" className="flex-1 cursor-not-allowed font-medium text-muted-foreground">
                      Google Gemini
                      <p className="text-sm font-normal text-muted-foreground">Modelo de Google Gemini 2.0 Flash (Desactivado)</p>
                      <div className="mt-1 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-yellow-50 text-yellow-700 border-yellow-200">
                        No disponible
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 rounded-md border p-3 cursor-pointer hover:bg-muted/30">
                    <RadioGroupItem value={AI_MODEL_TYPE.OPENROUTER} id="claude" />
                    <Label htmlFor="claude" className="flex-1 cursor-pointer font-medium">
                      Claude 3 Haiku (OpenRouter)
                      <p className="text-sm font-normal text-muted-foreground">Anthropic Claude 3 Haiku vía OpenRouter</p>
                      <div className="mt-1 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-green-50 text-green-700 border-green-200">
                        Activo
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

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
