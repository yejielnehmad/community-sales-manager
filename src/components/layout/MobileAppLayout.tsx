
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Home, 
  Users, 
  ShoppingBag, 
  ClipboardList,
  Menu,
  MessageSquarePlus,
  MessageCircle,
  Database,
  Wand
} from "lucide-react";
import { AIStatusBadge } from "@/components/AIStatusBadge";
import { APP_VERSION } from "@/App";
import { ChatAssistant } from "@/components/ChatAssistant";

interface MobileAppLayoutProps {
  children: React.ReactNode;
}

export function MobileAppLayout({ children }: MobileAppLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  
  const menuItems = [
    { path: "/", label: "Inicio", icon: <Home className="h-5 w-5" /> },
    { path: "/clients", label: "Clientes", icon: <Users className="h-5 w-5" /> },
    { path: "/products", label: "Productos", icon: <ShoppingBag className="h-5 w-5" /> },
    { path: "/orders", label: "Pedidos", icon: <ClipboardList className="h-5 w-5" /> },
    { path: "/magic-order", label: "Mensaje Mágico", icon: <Wand className="h-5 w-5" /> },
  ];

  return (
    <div className="flex flex-col min-h-screen w-full bg-background">
      {/* Header móvil */}
      <header className="sticky top-0 z-10 border-b bg-background p-3 flex items-center justify-between shadow-sm">
        <h1 className="text-lg font-bold text-primary cursor-pointer" onClick={() => navigate("/")}>
          VentasCom
        </h1>
        
        <div className="flex items-center gap-2">
          <AIStatusBadge />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Menú</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[80vw] max-w-xs p-0">
              <div className="h-full flex flex-col">
                <div className="py-4 border-b px-4 flex justify-between items-center">
                  <h1 className="text-xl font-bold text-primary">VentasCom</h1>
                </div>
                <ScrollArea className="flex-1">
                  <div className="py-2">
                    {menuItems.map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors ${
                          location.pathname === item.path ? "bg-muted font-medium" : ""
                        }`}
                      >
                        {item.icon}
                        <span>{item.label}</span>
                      </Link>
                    ))}
                    
                    <button
                      onClick={() => {
                        setChatOpen(true);
                        setOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left"
                    >
                      <MessageCircle className="h-5 w-5" />
                      <span>Asistente</span>
                    </button>
                    
                    <button
                      onClick={() => window.open("https://supabase.com/dashboard/project/frezmwtubianybvrkxmv", "_blank")}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left"
                    >
                      <Database className="h-5 w-5" />
                      <span>Supabase</span>
                    </button>
                  </div>
                </ScrollArea>
                <div className="p-4 border-t text-center">
                  <p className="text-xs text-muted-foreground">v{APP_VERSION}</p>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>
      
      {/* Contenido principal */}
      <main className="flex-1 p-4">
        {children}
      </main>
      
      {chatOpen && <ChatAssistant onClose={() => setChatOpen(false)} />}
    </div>
  );
}
