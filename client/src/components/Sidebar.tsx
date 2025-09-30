import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  LayoutDashboard,
  Users,
  FolderOpen,
  CheckSquare,
  UserCog,
  PoundSterling,
  BookOpen,
  Megaphone,
  HelpCircle,
  Settings,
  Menu,
  Building2,
  BarChart3,
  Target,
  Clock,
  Calculator,
  X,
  Home,
  ChevronDown,
  ChevronRight,
  Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

// Central Hub Home - Top Level
const homeHub = {
  title: "Home",
  href: "/",
  icon: Home,
};

// Executive Dashboard - VIP Level (super_admin, admin only)
const executiveDashboard = {
  title: "Executive",
  href: "/executive",
  icon: Crown,
  requiresRole: ["super_admin", "admin"],
};

// Standard Dashboard - Second Level
const execDashboard = {
  title: "Dashboard",
  href: "/dashboard",
  icon: LayoutDashboard,
};

// Business Flow Groups
const navigationGroups = [
  {
    title: "GROWTH",
    items: [
      {
        title: "Marketing",
        href: "/marketing",
        icon: Megaphone,
      },
      {
        title: "Sales",
        href: "/sales",
        icon: Users,
      },
    ]
  },
  {
    title: "DELIVERY",
    items: [
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
        title: "Support",
        href: "/support",
        icon: HelpCircle,
      },
    ]
  },
  {
    title: "MANAGEMENT",
    items: [
      {
        title: "Finance",
        href: "/finance",
        icon: PoundSterling,
      },
      {
        title: "Team",
        href: "/team",
        icon: UserCog,
      },
      {
        title: "Time",
        href: "/time",
        icon: Clock,
      },
    ]
  },
  {
    title: "INTELLIGENCE",
    items: [
      {
        title: "Analytics",
        href: "/analytics",
        icon: BarChart3,
      },
      {
        title: "Knowledge",
        href: "/knowledge",
        icon: BookOpen,
      },
      {
        title: "Company",
        href: "/company",
        icon: Building2,
      },
    ]
  },
  {
    title: "CONTROL",
    items: [
      {
        title: "Admin",
        href: "/admin",
        icon: Settings,
      },
    ]
  },
];

interface SidebarProps {
  user?: {
    firstName?: string;
    lastName?: string;
    role?: string;
    enhancedRole?: string;
    profileImageUrl?: string;
  };
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function Sidebar({ user, isOpen = false, onOpenChange }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [location] = useLocation();
  const isMobile = useIsMobile();

  const userDisplayName = user?.firstName && user?.lastName
    ? `${user.firstName} ${user.lastName}`
    : user?.firstName || "User";

  // Toggle group collapse state
  const toggleGroup = (groupTitle: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupTitle]: !prev[groupTitle]
    }));
  };

  // Create the sidebar content component
  const SidebarContent = ({ className = "", showCloseButton = false }: { className?: string; showCloseButton?: boolean }) => (
    <div
      className={cn(
        "flex flex-col h-full",
        className
      )}
      data-testid="sidebar"
    >
      {/* Logo & Brand */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-sidebar-primary rounded-lg flex items-center justify-center">
            <Building2 className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          {(!collapsed || isMobile) && (
            <span className="font-semibold text-lg text-sidebar-foreground">BizOS</span>
          )}
        </div>
        {showCloseButton && onOpenChange ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="p-1 rounded-md hover:bg-sidebar-accent transition-colors"
            data-testid="button-sidebar-close"
          >
            <X className="w-5 h-5 text-sidebar-foreground" />
          </Button>
        ) : !isMobile ? (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded-md hover:bg-sidebar-accent transition-colors"
            data-testid="button-sidebar-toggle"
          >
            <Menu className="w-5 h-5 text-sidebar-foreground" />
          </button>
        ) : null}
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {/* Central Hub Home */}
        <div className="mb-4">
          {(() => {
            const isActive = location === homeHub.href;
            const Icon = homeHub.icon;

            return (
              <Link
                key={homeHub.href}
                href={homeHub.href}
                className={cn(
                  "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
                data-testid={`link-home`}
                onClick={() => isMobile && onOpenChange?.(false)}
              >
                <Icon className="w-5 h-5" />
                {(!collapsed || isMobile) && <span>{homeHub.title}</span>}
              </Link>
            );
          })()}
        </div>

        {/* Executive Dashboard - Only for super_admin and admin */}
        {(user?.enhancedRole === 'super_admin' || user?.enhancedRole === 'admin') && (
          <div className="mb-2">
            {(() => {
              const isActive = location === executiveDashboard.href;
              const Icon = executiveDashboard.icon;

              return (
                <Link
                  key={executiveDashboard.href}
                  href={executiveDashboard.href}
                  className={cn(
                    "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors border-2 border-purple-200 dark:border-purple-800",
                    isActive
                      ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                      : "text-sidebar-foreground hover:bg-purple-50 dark:hover:bg-purple-950 hover:text-sidebar-accent-foreground"
                  )}
                  data-testid={`link-executive`}
                  onClick={() => isMobile && onOpenChange?.(false)}
                >
                  <Icon className="w-5 h-5" />
                  {(!collapsed || isMobile) && <span className="font-semibold">{executiveDashboard.title}</span>}
                </Link>
              );
            })()}
          </div>
        )}

        {/* Standard Dashboard */}
        <div className="mb-4">
          {(() => {
            const isActive = location === execDashboard.href;
            const Icon = execDashboard.icon;

            return (
              <Link
                key={execDashboard.href}
                href={execDashboard.href}
                className={cn(
                  "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
                data-testid={`link-dashboard`}
                onClick={() => isMobile && onOpenChange?.(false)}
              >
                <Icon className="w-5 h-5" />
                {(!collapsed || isMobile) && <span>{execDashboard.title}</span>}
              </Link>
            );
          })()}
        </div>

        {/* Business Flow Groups */}
        {navigationGroups.map((group, groupIndex) => {
          const isGroupCollapsed = collapsedGroups[group.title];
          const ChevronIcon = isGroupCollapsed ? ChevronRight : ChevronDown;

          return (
            <div key={group.title} className={cn("space-y-1", groupIndex > 0 && "mt-6")}>
              {/* Group Header */}
              {(!collapsed || isMobile) && (
                <button
                  className="flex items-center justify-between w-full px-3 py-1 text-left hover:bg-sidebar-accent/50 rounded-md transition-colors"
                  onClick={() => toggleGroup(group.title)}
                >
                  <span className="text-xs font-medium text-sidebar-foreground/60 uppercase tracking-wider">
                    {group.title}
                  </span>
                  <ChevronIcon className="w-3 h-3 text-sidebar-foreground/40" />
                </button>
              )}

              {/* Group Items */}
              {(!isGroupCollapsed || collapsed) && group.items.map((item) => {
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
                    data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                    onClick={() => isMobile && onOpenChange?.(false)}
                  >
                    <Icon className="w-5 h-5" />
                    {(!collapsed || isMobile) && <span>{item.title}</span>}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>
    </div>
  );

  // Mobile: return sheet-based sidebar
  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent
          side="left"
          className="w-[280px] p-0 bg-sidebar/70 glassmorphism border-sidebar-border text-sidebar-foreground"
        >
          <SidebarContent showCloseButton={true} />
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: return regular sidebar
  return (
    <div
      className={cn(
        "bg-sidebar/70 glassmorphism border-r border-sidebar-border transition-width",
        collapsed ? "sidebar-collapsed" : "sidebar-expanded"
      )}
    >
      <SidebarContent />
    </div>
  );
}
