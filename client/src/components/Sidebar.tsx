import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  FolderOpen,
  CheckSquare,
  UserCog,
  DollarSign,
  BookOpen,
  Megaphone,
  HelpCircle,
  Settings,
  Menu,
  Building2,
} from "lucide-react";

const navigationItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "CRM",
    href: "/clients",
    icon: Users,
  },
  {
    title: "Projects",
    href: "/projects",
    icon: FolderOpen,
  },
  {
    title: "Tasks",
    href: "/tasks",
    icon: CheckSquare,
  },
  {
    title: "Team",
    href: "/team",
    icon: UserCog,
  },
  {
    title: "Finance",
    href: "/finance",
    icon: DollarSign,
  },
  {
    title: "Knowledge",
    href: "/knowledge",
    icon: BookOpen,
  },
  {
    title: "Marketing",
    href: "/marketing",
    icon: Megaphone,
  },
  {
    title: "Support",
    href: "/support",
    icon: HelpCircle,
  },
  {
    title: "Company",
    href: "/company",
    icon: Building2,
  },
];

interface SidebarProps {
  user?: {
    firstName?: string;
    lastName?: string;
    role?: string;
    profileImageUrl?: string;
  };
}

export function Sidebar({ user }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [location] = useLocation();

  const userDisplayName = user?.firstName && user?.lastName 
    ? `${user.firstName} ${user.lastName}`
    : user?.firstName || "User";

  return (
    <div
      className={cn(
        "bg-sidebar/70 glassmorphism border-r border-sidebar-border flex flex-col transition-width",
        collapsed ? "sidebar-collapsed" : "sidebar-expanded"
      )}
      data-testid="sidebar"
    >
      {/* Logo & Brand */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-sidebar-primary rounded-lg flex items-center justify-center">
            <Building2 className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="font-semibold text-lg text-sidebar-foreground">BizOS</span>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-md hover:bg-sidebar-accent transition-colors"
          data-testid="button-sidebar-toggle"
        >
          <Menu className="w-5 h-5 text-sidebar-foreground" />
        </button>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navigationItems.map((item) => {
          const isActive = location === item.href;
          const Icon = item.icon;
          
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={cn(
                "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
              data-testid={`link-${item.title.toLowerCase()}`}
            >
              <Icon className="w-5 h-5" />
              {!collapsed && <span>{item.title}</span>}
            </Link>
          );
        })}

        <div className="border-t border-sidebar-border pt-2 mt-4">
          <Link 
            href="/admin"
            className={cn(
              "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors",
              location === "/admin"
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
            data-testid="link-admin"
          >
            <Settings className="w-5 h-5" />
            {!collapsed && <span>Admin</span>}
          </Link>
        </div>
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center space-x-3">
          <img
            src={
              user?.profileImageUrl || 
              "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100"
            }
            alt="Profile"
            className="w-8 h-8 rounded-full object-cover"
            data-testid="img-profile"
          />
          {!collapsed && (
            <div>
              <div className="text-sm font-medium text-sidebar-foreground" data-testid="text-username">
                {userDisplayName}
              </div>
              <div className="text-xs text-sidebar-foreground/70" data-testid="text-role">
                {user?.role || "Employee"}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
