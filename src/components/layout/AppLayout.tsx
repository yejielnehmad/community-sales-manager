
import { Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarMenuButton, SidebarMenuItem, SidebarMenu, SidebarRail, SidebarInset } from "@/components/ui/sidebar";
import { Home, Users, ShoppingBag, ClipboardList, MessageSquarePlus } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileAppLayout } from "./MobileAppLayout";
import { AIStatusBadge } from "@/components/AIStatusBadge";
import { TooltipProvider } from "@/components/ui/tooltip";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const isMobile = useIsMobile();
  
  // Si es móvil, renderizamos el layout móvil
  if (isMobile) {
    return <MobileAppLayout>{children}</MobileAppLayout>;
  }
  
  // Layout de escritorio con sidebar
  return (
    <TooltipProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar>
          <SidebarHeader className="flex items-center justify-between py-4 px-4">
            <h1 className="text-xl font-bold text-primary">VentasCom</h1>
            <AIStatusBadge />
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
                <SidebarMenuButton asChild isActive={location.pathname === "/magic-order"} tooltip="Pedido Mágico">
                  <Link to="/magic-order">
                    <MessageSquarePlus />
                    <span>Pedido Mágico</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
        <SidebarRail />
        <SidebarInset className="p-4">
          {children}
        </SidebarInset>
      </div>
    </TooltipProvider>
  );
}
