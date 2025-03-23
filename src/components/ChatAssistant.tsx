
import { useState, useRef, useEffect } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, SendIcon, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { AIStatusBadge } from "@/components/AIStatusBadge";
import { supabase } from "@/lib/supabase";

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleClose = () => {
    setIsOpen(false);
    if (onClose) {
      setTimeout(onClose, 300); // Delay para la animación
    }
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
    
    try {
      // Obtener datos relevantes de la base de datos para contextualizar
      const { data: recentClients } = await supabase
        .from('clients')
        .select('name')
        .order('created_at', { ascending: false })
        .limit(10);
      
      const { data: recentOrders } = await supabase
        .from('orders')
        .select('id, date, status, total')
        .order('created_at', { ascending: false })
        .limit(5);
      
      const { data: recentProducts } = await supabase
        .from('products')
        .select('name, price')
        .order('created_at', { ascending: false })
        .limit(10);
      
      const appContext = {
        clients: recentClients || [],
        orders: recentOrders || [],
        products: recentProducts || []
      };
      
      // Simulación de respuesta del asistente
      setTimeout(() => {
        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Lo siento, el servicio de asistente no está disponible en este momento. Por favor, inténtalo más tarde.",
          timestamp: new Date(),
        };
        
        setMessages((prev) => [...prev, assistantMessage]);
        setIsLoading(false);
      }, 1500);
    } catch (error) {
      console.error("Error al procesar mensaje:", error);
      
      toast.error("Error al procesar tu consulta. Por favor, inténtalo más tarde.");
      setIsLoading(false);
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen} onClose={handleClose}>
      <DrawerContent className="h-[85vh] sm:h-[65vh] max-w-lg mx-auto rounded-t-lg">
        <DrawerHeader className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <DrawerTitle>Asistente</DrawerTitle>
            <AIStatusBadge />
          </div>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </DrawerHeader>
        
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="flex flex-col space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <MessageSquare className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>¡Hola! Puedes preguntarme sobre los clientes, productos o pedidos de tu aplicación.</p>
                <p className="mt-2 text-sm">También puedes preguntarme por qué no se abre la vista previa en una nueva pestaña.</p>
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
              <div className="flex justify-start">
                <div className="max-w-[80%] px-4 py-3 rounded-lg bg-muted">
                  <Loader2 className="h-5 w-5 animate-spin" />
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
