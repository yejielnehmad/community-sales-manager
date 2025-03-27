
import { Sidebar } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileAppLayout } from "@/components/layout/MobileAppLayout";
import { IAInfoPopover } from "@/components/IAInfoPopover";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarNavigation } from "@/components/layout/SidebarNavigation";
import { Link } from "react-router-dom";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_VERSION } from "@/lib/app-config";
import { AIStatusBadge } from "@/components/AIStatusBadge";

export interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <MobileAppLayout>{children}</MobileAppLayout>;
  }

  return (
    <div className="h-screen flex">
      <SidebarNavigation />
      <div className="flex-1 flex flex-col">
        <div className="p-4 h-14 border-b flex items-center justify-end gap-2">
          <div className="text-xs text-muted-foreground mr-auto">
            Claude 3 Haiku v{APP_VERSION}
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/settings" className="flex items-center gap-1">
              <Settings2 className="h-4 w-4" />
              <span className="sr-only">Configuración</span>
            </Link>
          </Button>
          <ThemeToggle />
          <AIStatusBadge />
          <IAInfoPopover />
        </div>
        <div className="flex-1 p-6 overflow-auto">{children}</div>
      </div>
    </div>
  );
};
