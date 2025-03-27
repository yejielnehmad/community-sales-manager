
import { useState, useRef, useEffect } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, SendIcon, Loader2, X, AlertTriangle, Brain } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import AIStatusBadge from "@/components/AIStatusBadge";
import { supabase } from "@/lib/supabase";
import { callGeminiAPI, chatWithAssistant } from "@/services/geminiService";
import { OPENROUTER_API_KEY, COHERE_API_KEY } from "@/lib/api-config";
import { Progress } from "@/components/ui/progress";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

interface ChatAssistantProps {
  onClose?: () => void;
}

export function ChatAssistant({ onClose }: ChatAssistantProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isApiAvailable, setIsApiAvailable] = useState<boolean | null>(null);
  const [progress, setProgress] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      cleanupUIAfterClose();
    };
  }, []);

  const cleanupUIAfterClose = () => {
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
    document.body.style.pointerEvents = '';
    
    const overlays = document.querySelectorAll('[data-state="open"]');
    overlays.forEach((el) => {
      if (el.tagName !== 'DIALOG' && !el.closest('dialog')) {
        el.setAttribute('data-state', 'closed');
      }
    });
    
    document.documentElement.classList.remove('overflow-hidden');
    
    void document.documentElement.offsetHeight;
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    const checkApiAvailability = async () => {
      if (!COHERE_API_KEY) {
        setIsApiAvailable(false);
        return;
      }
      
      try {
        await callGeminiAPI("Responde con 'ok'");
        setIsApiAvailable(true);
      } catch (error) {
        console.error("Error al verificar disponibilidad de API:", error);
        setIsApiAvailable(false);
      }
    };
    
    checkApiAvailability();
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    
    cleanupUIAfterClose();
    
    setTimeout(() => {
      if (onClose) {
        onClose();
      }
      cleanupUIAfterClose();
    }, 300);
    
    setTimeout(() => {
      cleanupUIAfterClose();
    }, 600);
  };

  const simulateProgress = () => {
    setProgress(0);
    const duration = 6000;
    const interval = 20;
    const steps = duration / interval;
    let currentStep = 0;
    
    const timer = setInterval(() => {
      currentStep++;
      const progressValue = 100 / (1 + Math.exp(-0.07 * (currentStep - steps/2)));
      setProgress(progressValue);
      
      if (currentStep >= steps) {
        clearInterval(timer);
      }
    }, interval);
    
    return () => clearInterval(timer);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputMessage.trim()) return;
    
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: inputMessage,
      timestamp: new Date(),
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);
    
    const stopProgress = simulateProgress();
    
    try {
      if (!isApiAvailable) {
        setTimeout(() => {
          const assistantMessage: Message = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: "Lo siento, el servicio de asistente IA no está disponible en este momento. Por favor, verifica tu conexión o la configuración de la API de OpenRouter.",
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, assistantMessage]);
          setIsLoading(false);
          setProgress(100);
        }, 800);
        return;
      }
      
      const [
        clientsResult,
        productsResult,
        ordersResult,
        orderItemsResult,
        variantsResult
      ] = await Promise.all([
        supabase.from('clients').select('*').order('created_at', { ascending: false }),
        supabase.from('products').select('*').order('created_at', { ascending: false }),
        supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(15),
        supabase.from('order_items').select('*').limit(30),
        supabase.from('product_variants').select('*').limit(30)
      ]);
      
      const appContext = {
        clients: clientsResult.data || [],
        products: productsResult.data || [],
        orders: ordersResult.data || [],
        orderItems: orderItemsResult.data || [],
        variants: variantsResult.data || [],
        conversationHistory: messages.map(m => ({ role: m.role, content: m.content })),
        currentDateTime: new Date().toISOString()
      };
      
      try {
        const aiResponse = await chatWithAssistant(inputMessage, appContext);
        setProgress(100);
        
        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: aiResponse,
          timestamp: new Date(),
        };
        
        setMessages((prev) => [...prev, assistantMessage]);
      } catch (error) {
        console.error("Error en respuesta de IA:", error);
        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Lo siento, ocurrió un error al procesar tu consulta. Por favor, inténtalo de nuevo más tarde.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
      
      setIsLoading(false);
      stopProgress();
    } catch (error) {
      console.error("Error al procesar mensaje:", error);
      
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Error al procesar tu consulta. Por favor, inténtalo más tarde.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      
      setIsLoading(false);
      stopProgress();
      setProgress(100);
    }
  };

  return (
    <Drawer 
      open={isOpen} 
      onOpenChange={(isOpen) => {
        if (!isOpen) handleClose();
        setIsOpen(isOpen);
      }} 
      modal={true}
    >
      <DrawerContent className="h-[85vh] sm:h-[65vh] max-w-lg mx-auto rounded-t-lg">
        <DrawerHeader className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <DrawerTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Asistente IA
            </DrawerTitle>
            <AIStatusBadge />
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleClose}
            className="focus:outline-none"
          >
            <X className="h-4 w-4" />
          </Button>
        </DrawerHeader>
        
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="flex flex-col space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Brain className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>¡Hola! Puedo ayudarte con información sobre clientes, productos, pedidos y análisis de datos de tu negocio.</p>
                <p className="text-sm mt-2">Puedes preguntarme cosas como:</p>
                <ul className="text-sm mt-1 text-left mx-auto max-w-xs space-y-1">
                  <li>• "¿Cuál es el producto más vendido este mes?"</li>
                  <li>• "¿Cuántos pedidos tiene el cliente Luis Martínez?"</li>
                  <li>• "Muéstrame el resumen de ventas de la semana"</li>
                  <li>• "¿Qué clientes no han hecho pedidos recientemente?"</li>
                </ul>
                
                {isApiAvailable === false && (
                  <div className="mt-4 p-3 bg-amber-50 rounded-md border border-amber-200 text-amber-800">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="h-4 w-4" />
                      <p className="font-medium">Servicio no disponible</p>
                    </div>
                    <p className="text-sm">
                      El asistente por IA no está disponible en este momento. Por favor, verifica la configuración de la API de OpenRouter.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-2 rounded-lg ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{message.content}</div>
                    <div className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex flex-col space-y-2">
                <div className="flex justify-start">
                  <div className="max-w-[80%] px-4 py-3 rounded-lg bg-muted flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm">Procesando consulta...</span>
                  </div>
                </div>
                <div className="w-2/3 mx-auto">
                  <Progress value={progress} className="h-1" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <DrawerFooter>
          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            <Textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Escribe tu mensaje aquí..."
              className="min-h-[80px] resize-none"
              disabled={isLoading}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <Button 
              type="submit" 
              size="icon" 
              disabled={isLoading || !inputMessage.trim()}
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <SendIcon className="h-5 w-5" />
              )}
            </Button>
          </form>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
