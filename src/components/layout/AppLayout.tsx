
import { Sidebar } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileAppLayout } from "@/components/layout/MobileAppLayout";
import { IAInfoPopover } from "@/components/IAInfoPopover";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarNavigation } from "@/components/layout/SidebarNavigation";

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
          <ThemeToggle />
          <IAInfoPopover />
        </div>
        <div className="flex-1 p-6 overflow-auto">{children}</div>
      </div>
    </div>
  );
};
