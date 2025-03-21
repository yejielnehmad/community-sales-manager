
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarMenuButton, SidebarMenuItem, SidebarMenu, SidebarRail, SidebarInset } from "@/components/ui/sidebar";
import { Home, Users, ShoppingBag, ClipboardList, MessageSquare, LogOut } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar>
          <SidebarHeader className="flex items-center justify-center py-4">
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
                <SidebarMenuButton asChild isActive={location.pathname === "/messages"} tooltip="Mensajes">
                  <Link to="/messages">
                    <MessageSquare />
                    <span>Mensajes</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="p-4">
            <Button variant="outline" className="w-full flex items-center gap-2">
              <LogOut className="h-4 w-4" />
              <span>Cerrar sesión</span>
            </Button>
          </SidebarFooter>
        </Sidebar>
        <SidebarRail />
        <SidebarInset className="p-4">
          {children}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
