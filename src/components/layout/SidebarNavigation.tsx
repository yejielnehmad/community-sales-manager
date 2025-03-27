
import { Link, useLocation } from "react-router-dom";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
import { Home, Users, ShoppingBag, ClipboardList, Wand, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_VERSION } from "@/lib/app-config";

export function SidebarNavigation() {
  const location = useLocation();
  
  const menuItems = [
    { path: "/", label: "Inicio", icon: Home },
    { path: "/clients", label: "Clientes", icon: Users },
    { path: "/products", label: "Catálogo", icon: ShoppingBag },
    { path: "/orders", label: "Pedidos", icon: ClipboardList },
    { path: "/magic-order", label: "Mensaje Mágico", icon: Wand },
    { path: "/settings", label: "Configuración", icon: Settings2 },
  ];

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="px-2 py-4">
          <h1 className="text-xl font-bold text-primary">VentasCom</h1>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.path}>
              <SidebarMenuButton 
                asChild 
                isActive={location.pathname === item.path}
                tooltip={item.label}
              >
                <Link to={item.path} className="flex items-center gap-2">
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <div className="p-4 text-center">
          <p className="text-xs text-muted-foreground">v{APP_VERSION}</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
