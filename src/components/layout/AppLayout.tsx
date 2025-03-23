
import { Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarMenuButton, SidebarMenuItem, SidebarMenu, SidebarRail, SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Home, Users, ShoppingBag, ClipboardList, Database, MessageCircle, Wand } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { APP_VERSION } from "@/App";
import { AIStatusBadge } from "@/components/AIStatusBadge";
import { useState, useCallback } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { ChatAssistant } from "@/components/ChatAssistant";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [chatOpen, setChatOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  
  const menuItems = [
    { path: "/", label: "Inicio", icon: Home },
    { path: "/clients", label: "Clientes", icon: Users },
    { path: "/products", label: "Productos", icon: ShoppingBag },
    { path: "/orders", label: "Pedidos", icon: ClipboardList },
    { path: "/magic-order", label: "Mensaje Mágico", icon: Wand },
  ];
  
  // Navegación por rutas
  const navigateTo = useCallback((path: string) => {
    navigate(path);
    setMenuOpen(false);
  }, [navigate]);
  
  // Abrir chat
  const openChat = useCallback(() => {
    setChatOpen(true);
    setMenuOpen(false);
  }, []);
  
  // Abrir Supabase
  const openSupabase = useCallback(() => {
    window.open("https://supabase.com/dashboard/project/frezmwtubianybvrkxmv", "_blank");
  }, []);
  
  // Layout para móvil
  if (isMobile) {
    return (
      <div className="flex min-h-screen bg-background flex-col">
        <header className="sticky top-0 z-10 border-b p-3 flex items-center justify-between bg-background shadow-sm">
          <h1 
            className="text-lg font-bold text-primary cursor-pointer" 
            onClick={() => navigateTo('/')}
          >
            VentasCom
          </h1>
          
          <div className="flex items-center gap-2">
            <AIStatusBadge />
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="focus:outline-none">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[250px] p-0">
                <div className="flex flex-col h-full">
                  <div className="p-4 flex items-center justify-between border-b">
                    <h2 className="font-bold text-primary">VentasCom</h2>
                  </div>
                  
                  <div className="flex-1 p-2 space-y-1">
                    {menuItems.map((item) => (
                      <Button
                        key={item.path}
                        variant={location.pathname === item.path ? "secondary" : "ghost"}
                        className="w-full justify-start focus:outline-none"
                        onClick={() => navigateTo(item.path)}
                      >
                        <item.icon className="mr-2 h-4 w-4" />
                        {item.label}
                      </Button>
                    ))}
                    
                    <Button
                      variant="ghost"
                      className="w-full justify-start focus:outline-none"
                      onClick={openChat}
                    >
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Asistente
                    </Button>
                    
                    <Button
                      variant="ghost"
                      className="w-full justify-start focus:outline-none"
                      onClick={openSupabase}
                    >
                      <Database className="mr-2 h-4 w-4" />
                      Supabase
                    </Button>
                  </div>
                  
                  <div className="p-4 border-t text-center">
                    <p className="text-xs text-muted-foreground">v{APP_VERSION}</p>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </header>
        
        <main className="flex-1 p-4">
          {children}
        </main>
        
        {chatOpen && <ChatAssistant onClose={() => setChatOpen(false)} />}
      </div>
    );
  }
  
  // Layout de escritorio
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full">
        <SidebarInset className="p-4">
          <header className="border-b mb-4 pb-2 flex items-center justify-between">
            <h1 
              className="text-xl font-bold text-primary cursor-pointer" 
              onClick={() => navigateTo('/')}
            >
              VentasCom
            </h1>
            <AIStatusBadge />
          </header>
          {children}
        </SidebarInset>
        <SidebarRail />
        <Sidebar side="right">
          <SidebarHeader className="flex items-center justify-between py-4 px-4">
            <h1 className="text-xl font-bold text-primary">VentasCom</h1>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.pathname === "/"} tooltip="Inicio">
                  <Link to="/">
                    <Home />
                    <span>Inicio</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.pathname === "/clients"} tooltip="Clientes">
                  <Link to="/clients">
                    <Users />
                    <span>Clientes</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.pathname === "/products"} tooltip="Productos">
                  <Link to="/products">
                    <ShoppingBag />
                    <span>Productos</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.pathname === "/orders"} tooltip="Pedidos">
                  <Link to="/orders">
                    <ClipboardList />
                    <span>Pedidos</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.pathname === "/magic-order"} tooltip="Mensaje Mágico">
                  <Link to="/magic-order">
                    <Wand />
                    <span>Mensaje Mágico</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Chat Asistente" onClick={() => setChatOpen(true)}>
                  <button>
                    <MessageCircle />
                    <span>Asistente</span>
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Supabase" onClick={() => window.open("https://supabase.com/dashboard/project/frezmwtubianybvrkxmv", "_blank")}>
                  <button>
                    <Database />
                    <span>Supabase</span>
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="p-4 text-center">
            <p className="text-xs text-muted-foreground">v{APP_VERSION}</p>
          </SidebarFooter>
        </Sidebar>
      </div>
      {chatOpen && <ChatAssistant onClose={() => setChatOpen(false)} />}
    </SidebarProvider>
  );
}
