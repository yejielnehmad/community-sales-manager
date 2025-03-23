
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Brain, Sparkles, Check, Laptop, ShieldCheck, MessageSquare, BarChart4, Zap, X } from "lucide-react";
import { ChatAssistant } from "@/components/ChatAssistant";
import { AIStatusBadge } from "@/components/AIStatusBadge";

export function IAPresentation() {
  const [isOpen, setIsOpen] = useState(false);
  const [showChat, setShowChat] = useState(false);

  const handleOpenChat = () => {
    setIsOpen(false);
    setShowChat(true);
  };

  const handleCloseChat = () => {
    setShowChat(false);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="flex items-center justify-center h-9 w-9 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors touch-manipulation"
        onClick={() => setIsOpen(true)}
      >
        <Sparkles className="h-4 w-4 text-primary" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-3xl h-[90vh] p-0 overflow-hidden flex flex-col">
          <div className="relative w-full bg-gradient-to-b from-primary/80 to-primary h-[300px] flex items-center justify-center">
            <Button 
              className="absolute right-4 top-4 rounded-full bg-black/20 hover:bg-black/40 text-white touch-manipulation" 
              size="icon" 
              variant="ghost"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
            
            <div className="text-center z-10">
              <div className="flex items-center justify-center mb-4">
                <div className="bg-white/10 backdrop-blur-md rounded-full p-6 inline-flex">
                  <Brain className="h-12 w-12 text-white" />
                </div>
                <div className="ml-3">
                  <AIStatusBadge />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">Asistente IA Avanzado</h2>
              <p className="text-white/90">Potenciado por Google Gemini</p>
            </div>
          </div>

          <ScrollArea className="flex-1 px-6 py-8">
            <div className="space-y-12 max-w-2xl mx-auto">
              <section className="space-y-4">
                <h3 className="text-2xl font-semibold flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Asistente Inteligente para tu Negocio
                </h3>
                <p className="text-muted-foreground">
                  Incorporamos inteligencia artificial avanzada para transformar por completo tu experiencia de gestión de ventas comunitarias. Nuestro asistente IA está diseñado específicamente para ayudarte con todas las tareas diarias.
                </p>
              </section>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="border rounded-xl p-5 space-y-3 hover:shadow-md transition-all">
                  <div className="bg-primary/10 rounded-full w-10 h-10 flex items-center justify-center">
                    <MessageSquare className="h-5 w-5 text-primary" />
                  </div>
                  <h4 className="font-medium text-lg">Chat Inteligente</h4>
                  <p className="text-sm text-muted-foreground">
                    Conversa naturalmente y obtén respuestas detalladas sobre clientes, productos, pedidos y más.
                  </p>
                </div>

                <div className="border rounded-xl p-5 space-y-3 hover:shadow-md transition-all">
                  <div className="bg-primary/10 rounded-full w-10 h-10 flex items-center justify-center">
                    <BarChart4 className="h-5 w-5 text-primary" />
                  </div>
                  <h4 className="font-medium text-lg">Análisis de Datos</h4>
                  <p className="text-sm text-muted-foreground">
                    Obtén informes detallados, tendencias de ventas y predicciones basadas en tus datos reales.
                  </p>
                </div>

                <div className="border rounded-xl p-5 space-y-3 hover:shadow-md transition-all">
                  <div className="bg-primary/10 rounded-full w-10 h-10 flex items-center justify-center">
                    <Laptop className="h-5 w-5 text-primary" />
                  </div>
                  <h4 className="font-medium text-lg">Optimización de Código</h4>
                  <p className="text-sm text-muted-foreground">
                    Te ayuda a mejorar tu aplicación con sugerencias técnicas para un código más eficiente.
                  </p>
                </div>

                <div className="border rounded-xl p-5 space-y-3 hover:shadow-md transition-all">
                  <div className="bg-primary/10 rounded-full w-10 h-10 flex items-center justify-center">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                  </div>
                  <h4 className="font-medium text-lg">Privacidad Garantizada</h4>
                  <p className="text-sm text-muted-foreground">
                    Tus datos siempre están protegidos y nunca se comparten con terceros.
                  </p>
                </div>
              </div>

              <section>
                <h3 className="text-xl font-semibold mb-4">Capacidades Principales</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <div className="bg-green-100 rounded-full p-1 mt-0.5">
                      <Check className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <h5 className="font-medium">Análisis de ventas en tiempo real</h5>
                      <p className="text-sm text-muted-foreground">Consulta "¿Cuál es el producto más vendido este mes?" o "Muéstrame el resumen de ventas"</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="bg-green-100 rounded-full p-1 mt-0.5">
                      <Check className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <h5 className="font-medium">Información de clientes y pedidos</h5>
                      <p className="text-sm text-muted-foreground">Pregunta "¿Cuántos pedidos tiene Luis Martínez?" o "Clientes sin pedidos recientes"</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="bg-green-100 rounded-full p-1 mt-0.5">
                      <Check className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <h5 className="font-medium">Recomendaciones personalizadas</h5>
                      <p className="text-sm text-muted-foreground">Pide "Sugerencias para aumentar ventas" o "Mejores estrategias de cobro"</p>
                    </div>
                  </li>
                </ul>
              </section>

              <section className="bg-primary/5 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-primary/20 rounded-full p-2">
                    <Zap className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">Comenzar a utilizar el Asistente IA</h3>
                </div>
                <p className="mb-4">
                  Accede al asistente desde cualquier pantalla haciendo clic en el icono de chat en la barra de navegación.
                </p>
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={handleOpenChat}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Abrir Asistente IA
                </Button>
              </section>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {showChat && <ChatAssistant onClose={handleCloseChat} />}
    </>
  );
}
