
import { Sidebar } from "@/components/ui/sidebar";
import { useMobile } from "@/hooks/use-mobile";
import { MobileAppLayout } from "@/components/layout/MobileAppLayout";
import { APP_VERSION } from "@/App";
import { IAInfoPopover } from "@/components/IAInfoPopover";

export interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  const isMobile = useMobile();

  if (isMobile) {
    return <MobileAppLayout>{children}</MobileAppLayout>;
  }

  return (
    <div className="h-screen flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <div className="p-4 h-14 border-b flex items-center justify-between">
          <div className="text-sm font-medium flex items-center gap-2">
            Versión <span className="text-primary">{APP_VERSION}</span>
          </div>
          <IAInfoPopover />
        </div>
        <div className="flex-1 p-6 overflow-auto">{children}</div>
      </div>
    </div>
  );
};
