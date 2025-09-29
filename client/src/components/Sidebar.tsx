import { useState, useEffect } from "react";
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
  Workflow,
  Download,
  Zap,
  Database,
  Plug,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

// Executive Dashboard - Top Level
const execDashboard = {
  title: "Exec Dashboard",
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
      {
        title: "User Data",
        href: "/user-data",
        icon: Database,
      },
      {
        title: "Workflows",
        href: "/automation",
        icon: Workflow,
      },
      {
        title: "Integrations",
        href: "/integrations",
        icon: Plug,
      },
      {
        title: "Data Export",
        href: "/data-export",
        icon: Download,
      },
    ]
  },
];

interface SidebarProps {
  user?: {
    firstName?: string;
    lastName?: string;
    role?: string;
    profileImageUrl?: string;
  };
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function Sidebar({ user, isOpen = false, onOpenChange }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [location] = useLocation();
  const isMobile = useIsMobile();

  // State for collapsible sections
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    // Try to load from localStorage, default all sections to expanded
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('sidebar-sections-state');
        if (saved) {
          return JSON.parse(saved);
        }
      } catch (error) {
        console.warn('Failed to parse saved sidebar state:', error);
      }
    }

    // Default all sections to expanded
    return {
      'GROWTH': true,
      'DELIVERY': true,
      'MANAGEMENT': true,
      'INTELLIGENCE': true,
      'CONTROL': true,
    };
  });

  // Save expanded sections to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('sidebar-sections-state', JSON.stringify(expandedSections));
      } catch (error) {
        console.warn('Failed to save sidebar state:', error);
      }
    }
  }, [expandedSections]);

  const toggleSection = (sectionTitle: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionTitle]: !prev[sectionTitle]
    }));
  };

  const userDisplayName = user?.firstName && user?.lastName
    ? `${user.firstName} ${user.lastName}`
    : user?.firstName || "User";

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
        {/* Executive Dashboard */}
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
          const isExpanded = expandedSections[group.title];
          const ChevronIcon = isExpanded ? ChevronDown : ChevronRight;

          return (
            <Collapsible
              key={group.title}
              open={isExpanded}
              onOpenChange={() => toggleSection(group.title)}
              className={cn("space-y-1", groupIndex > 0 && "mt-6")}
            >
              {/* Group Header - Always show, but different styles for collapsed/expanded */}
              {(!collapsed || isMobile) ? (
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between px-3 py-1 hover:bg-sidebar-accent/30 rounded-md transition-all duration-200 cursor-pointer group">
                    <span className="text-xs font-medium text-sidebar-foreground/60 uppercase tracking-wider group-hover:text-sidebar-foreground/80 transition-colors">
                      {group.title}
                    </span>
                    <ChevronIcon className="w-3 h-3 text-sidebar-foreground/40 transition-all duration-200 group-hover:text-sidebar-foreground/60" />
                  </div>
                </CollapsibleTrigger>
              ) : (
                // Collapsed sidebar: show section as separator line
                <div className="px-3 py-2 border-t border-sidebar-border/20 mt-2 first:mt-0">
                  <div className="w-full h-px bg-sidebar-foreground/10" />
                </div>
              )}

              {/* Group Items - Collapsible */}
              <CollapsibleContent className="space-y-1 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-up-1 data-[state=open]:slide-down-1">
                {group.items.map((item) => {
                  const isActive = location === item.href;
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200",
                        "hover:translate-x-1", // Subtle slide effect on hover
                        isActive
                          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                      data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                      onClick={() => isMobile && onOpenChange?.(false)}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      {(!collapsed || isMobile) && <span className="truncate">{item.title}</span>}
                    </Link>
                  );
                })}
              </CollapsibleContent>
            </Collapsible>
          );
        })}
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
          {(!collapsed || isMobile) && (
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
