
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Home, 
  Users, 
  ShoppingBag, 
  ClipboardList, 
  LogOut,
  Menu,
  MessageSquarePlus
} from "lucide-react";
import { AIStatusBadge } from "@/components/AIStatusBadge";

interface MobileAppLayoutProps {
  children: React.ReactNode;
}

export function MobileAppLayout({ children }: MobileAppLayoutProps) {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  
  const menuItems = [
    { path: "/", label: "Inicio", icon: <Home className="h-5 w-5" /> },
    { path: "/clients", label: "Clientes", icon: <Users className="h-5 w-5" /> },
    { path: "/products", label: "Productos", icon: <ShoppingBag className="h-5 w-5" /> },
    { path: "/orders", label: "Pedidos", icon: <ClipboardList className="h-5 w-5" /> },
    { path: "/magic-order", label: "Pedido Mágico", icon: <MessageSquarePlus className="h-5 w-5" /> },
  ];

  return (
    <div className="flex flex-col min-h-screen w-full bg-background">
      {/* Header móvil */}
      <header className="sticky top-0 z-10 border-b bg-background p-3 flex items-center justify-between">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Menú</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[80vw] max-w-xs p-0">
            <div className="h-full flex flex-col">
              <div className="py-4 border-b px-4 flex justify-between items-center">
                <h1 className="text-xl font-bold text-primary">VentasCom</h1>
                <AIStatusBadge />
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
                </div>
              </ScrollArea>
              <div className="p-4 border-t">
                <Button variant="outline" className="w-full flex items-center gap-2">
                  <LogOut className="h-4 w-4" />
                  <span>Cerrar sesión</span>
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
        
        <h1 className="text-lg font-bold text-primary">
          {menuItems.find(item => item.path === location.pathname)?.label || "VentasCom"}
        </h1>
        
        <AIStatusBadge />
      </header>
      
      {/* Contenido principal */}
      <main className="flex-1 p-4 pb-16">
        {children}
      </main>
      
      {/* Navegación inferior */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t p-1 flex items-center justify-around">
        {menuItems.map((item) => (
          <Link 
            key={item.path} 
            to={item.path}
            className={`p-2 flex flex-col items-center justify-center gap-1 ${
              location.pathname === item.path ? "text-primary" : "text-muted-foreground"
            }`}
          >
            {item.icon}
            <span className="text-xs font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
