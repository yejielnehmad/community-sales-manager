
import React from "react";
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
  ShoppingCart
} from "lucide-react";
import { APP_VERSION } from "@/App";

export function IAInfoPopover() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className="cursor-pointer">
          <AIStatusBadge />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-5" align="end">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-full">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Inteligencia Artificial</h3>
              <p className="text-sm text-muted-foreground">La IA potencia varias funciones de la aplicación</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-3 pt-2">
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
          </div>
          
          <div className="pt-2 flex items-center justify-between">
            <div className="flex items-center">
              <Zap className="h-4 w-4 text-amber-500 mr-2" />
              <span className="text-xs text-muted-foreground">Powered by Google Gemini</span>
            </div>
            <div className="text-xs text-muted-foreground">v{APP_VERSION}</div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
