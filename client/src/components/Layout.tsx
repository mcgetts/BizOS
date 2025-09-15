import { ReactNode } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";

interface LayoutProps {
  children: ReactNode;
  title: string;
  breadcrumbs?: string[];
}

export function Layout({ children, title, breadcrumbs }: LayoutProps) {
  const { user } = useAuth();

  // Transform user data to match Header/Sidebar interface
  const userDisplayData = user ? {
    firstName: user.firstName || undefined,
    lastName: user.lastName || undefined,
    role: user.role || undefined,
    profileImageUrl: user.profileImageUrl || undefined,
  } : undefined;

  return (
    <div className="h-screen flex overflow-hidden" data-testid="layout">
      <Sidebar user={userDisplayData} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={title} breadcrumbs={breadcrumbs} user={userDisplayData} />
        <main className="flex-1 overflow-y-auto p-6 gradient-bg" data-testid="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
