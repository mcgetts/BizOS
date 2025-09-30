import { ReactNode, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: ReactNode;
  title: string;
  breadcrumbs?: string[];
}

export function Layout({ children, title, breadcrumbs }: LayoutProps) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Transform user data to match Header/Sidebar interface
  const userDisplayData = user ? {
    firstName: user.firstName || undefined,
    lastName: user.lastName || undefined,
    role: user.role || undefined,
    enhancedRole: user.enhancedRole || undefined,
    department: user.department || undefined,
    email: user.email || undefined,
    profileImageUrl: user.profileImageUrl || undefined,
  } : undefined;

  return (
    <div className="h-screen flex overflow-hidden" data-testid="layout">
      <Sidebar
        user={userDisplayData}
        isOpen={sidebarOpen}
        onOpenChange={setSidebarOpen}
      />
      <div className={cn("flex-1 flex flex-col overflow-hidden", isMobile && "w-full")}>
        <Header
          title={title}
          breadcrumbs={breadcrumbs}
          user={userDisplayData}
          onMenuClick={() => setSidebarOpen(true)}
          showMenuButton={isMobile}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 gradient-bg" data-testid="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
