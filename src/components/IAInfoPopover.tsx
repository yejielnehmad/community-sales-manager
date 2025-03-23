
import React, { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { AIStatusBadge } from "@/components/AIStatusBadge";
import { 
  Brain, 
  Sparkles, 
  MessageSquare, 
  Wand, 
  Zap, 
  FileText, 
  Search,
  Store,
  UserCheck,
  ShoppingCart,
  ExternalLink
} from 'lucide-react';
import { APP_VERSION } from "@/App";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

export function IAInfoPopover() {
  const [activeTab, setActiveTab] = useState("capacidades");

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className="cursor-pointer">
          <AIStatusBadge />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0 shadow-xl" align="end">
        <div className="p-4 bg-primary/10 border-b">
          <div className="flex items-center gap-3">
            <div className="bg-background p-2 rounded-full">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Inteligencia Artificial</h3>
              <p className="text-sm text-muted-foreground">Google Gemini v2.0</p>
            </div>
          </div>
        </div>
        
        <Tabs defaultValue="capacidades" className="w-full" value={activeTab} onValueChange={setActiveTab}>
          <div className="px-4 pt-3">
            <TabsList className="w-full">
              <TabsTrigger value="capacidades" className="flex-1">Capacidades</TabsTrigger>
              <TabsTrigger value="ejemplos" className="flex-1">Ejemplos</TabsTrigger>
              <TabsTrigger value="info" className="flex-1">Acerca de</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="capacidades" className="p-4 pt-2 space-y-3 max-h-80 overflow-y-auto">
            <div className="border rounded-lg p-3 bg-card transition-all hover:bg-muted/30 hover:shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <h4 className="font-medium text-sm">Análisis de Mensajes</h4>
              </div>
              <p className="text-xs text-muted-foreground">
                Analiza mensajes de texto y extrae información de pedidos automáticamente.
              </p>
            </div>
            
            <div className="border rounded-lg p-3 bg-card transition-all hover:bg-muted/30 hover:shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="h-4 w-4 text-blue-500" />
                <h4 className="font-medium text-sm">Asistente IA</h4>
              </div>
              <p className="text-xs text-muted-foreground">
                Chat con un asistente IA que puede ayudarte con preguntas sobre tu negocio.
              </p>
            </div>
            
            <div className="border rounded-lg p-3 bg-card transition-all hover:bg-muted/30 hover:shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <Wand className="h-4 w-4 text-purple-500" />
                <h4 className="font-medium text-sm">Iconos de Productos</h4>
              </div>
              <p className="text-xs text-muted-foreground">
                Generación automática de iconos basados en los nombres de productos.
              </p>
            </div>
            
            <div className="border rounded-lg p-3 bg-card transition-all hover:bg-muted/30 hover:shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <Store className="h-4 w-4 text-emerald-500" />
                <h4 className="font-medium text-sm">Categorización de Productos</h4>
              </div>
              <p className="text-xs text-muted-foreground">
                Sugiere categorías para tus productos basado en sus descripciones.
              </p>
            </div>
            
            <div className="border rounded-lg p-3 bg-card transition-all hover:bg-muted/30 hover:shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <UserCheck className="h-4 w-4 text-indigo-500" />
                <h4 className="font-medium text-sm">Segmentación de Clientes</h4>
              </div>
              <p className="text-xs text-muted-foreground">
                Ayuda a segmentar clientes según patrones de compra y preferencias.
              </p>
            </div>
            
            <div className="border rounded-lg p-3 bg-card transition-all hover:bg-muted/30 hover:shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <ShoppingCart className="h-4 w-4 text-rose-500" />
                <h4 className="font-medium text-sm">Recomendación de Productos</h4>
              </div>
              <p className="text-xs text-muted-foreground">
                Sugiere productos adicionales basados en el historial de pedidos.
              </p>
            </div>
          </TabsContent>
          
          <TabsContent value="ejemplos" className="p-4 pt-2 space-y-3 max-h-80 overflow-y-auto">
            <div className="text-sm text-muted-foreground mb-3">
              Estos son algunos ejemplos de cómo puedes usar la IA en tu negocio:
            </div>
            
            <div className="border rounded-lg p-3 bg-muted/20">
              <div className="font-medium text-sm mb-1 text-primary">Mensaje de WhatsApp</div>
              <p className="text-xs text-muted-foreground italic">
                "Hola, soy María López. Necesito 2 paquetes de pañales talla 3, una crema antipañalitis y 3 latas de leche en polvo. ¿Me confirmas si tienes todo? Gracias"
              </p>
              <div className="mt-2 bg-primary/5 p-2 rounded-md text-xs">
                ✓ Identifica automáticamente a María López<br/>
                ✓ Detecta 3 productos con sus cantidades<br/>
                ✓ Crea un pedido listo para confirmar
              </div>
            </div>
            
            <div className="border rounded-lg p-3 bg-muted/20">
              <div className="font-medium text-sm mb-1 text-primary">Pregunta sobre producto</div>
              <p className="text-xs text-muted-foreground italic">
                "¿Cuál es el producto más vendido en la categoría de lácteos?"
              </p>
              <div className="mt-2 bg-primary/5 p-2 rounded-md text-xs">
                ✓ Analiza el historial de ventas<br/>
                ✓ Identifica patrones en categorías<br/>
                ✓ Proporciona información de valor
              </div>
            </div>
            
            <div className="border rounded-lg p-3 bg-muted/20">
              <div className="font-medium text-sm mb-1 text-primary">Sugerencia de categorización</div>
              <p className="text-xs text-muted-foreground italic">
                "Tengo nuevos productos: aceite de oliva, vinagre balsámico y salsa de soja"
              </p>
              <div className="mt-2 bg-primary/5 p-2 rounded-md text-xs">
                ✓ Sugiere categoría "Condimentos y aderezos"<br/>
                ✓ Asigna iconos apropiados a cada producto<br/>
                ✓ Propone precios basados en productos similares
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="info" className="p-4 pt-2 space-y-3 max-h-80 overflow-y-auto">
            <div className="space-y-3">
              <div>
                <h4 className="font-medium text-sm">Modelo de IA</h4>
                <p className="text-xs text-muted-foreground">Google Gemini 2.0 Flash</p>
              </div>
              
              <div>
                <h4 className="font-medium text-sm">Funcionalidades principales</h4>
                <ul className="text-xs text-muted-foreground list-disc pl-5 mt-1 space-y-1">
                  <li>Análisis y comprensión de texto natural</li>
                  <li>Reconocimiento de entidades (productos, clientes)</li>
                  <li>Clasificación y categorización automática</li>
                  <li>Generación de respuestas contextuales</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium text-sm">Limitaciones</h4>
                <ul className="text-xs text-muted-foreground list-disc pl-5 mt-1 space-y-1">
                  <li>Requiere conexión a internet para funcionar</li>
                  <li>Las respuestas pueden variar en precisión</li>
                  <li>No puede procesar imágenes en esta versión</li>
                </ul>
              </div>
              
              <Separator />
              
              <div>
                <div className="text-xs text-muted-foreground flex items-center justify-between">
                  <div className="flex items-center">
                    <Zap className="h-4 w-4 text-amber-500 mr-2" />
                    <span>Versión de la aplicación: {APP_VERSION}</span>
                  </div>
                </div>
              </div>
              
              <div className="pt-2">
                <Button variant="outline" size="sm" className="w-full text-xs">
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Más información sobre Google Gemini
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
