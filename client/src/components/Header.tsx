import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NotificationPanel } from "@/components/NotificationPanel";
import { UserProfileMenu } from "@/components/UserProfileMenu";
import { OrganizationIndicator } from "@/components/OrganizationIndicator";
import { useIsMobile } from "@/hooks/use-mobile";
import { Search, Sun, Moon, Menu } from "lucide-react";

interface HeaderProps {
  title: string;
  breadcrumbs?: string[];
  user?: {
    id?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: string;
    enhancedRole?: string;
    department?: string;
    profileImageUrl?: string;
    position?: string;
  };
  onMenuClick?: () => void;
  showMenuButton?: boolean;
}

export function Header({ title, breadcrumbs = [], user, onMenuClick, showMenuButton = false }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const isMobile = useIsMobile();

  return (
    <header className="bg-card/70 glassmorphism border-b border-border px-4 md:px-6 py-4" data-testid="header">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Mobile Menu Button */}
          {showMenuButton && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onMenuClick}
              className="md:hidden"
              data-testid="button-mobile-menu"
            >
              <Menu className="w-5 h-5" />
            </Button>
          )}

          <div className="flex items-center space-x-4">
            <h1 className="text-xl md:text-2xl font-semibold text-foreground truncate" data-testid="text-page-title">
              {title}
            </h1>
            {breadcrumbs.length > 0 && !isMobile && (
              <nav className="hidden md:flex space-x-1 text-sm text-muted-foreground" data-testid="nav-breadcrumbs">
                <span>BizOS</span>
                {breadcrumbs.map((crumb, index) => (
                  <span key={`breadcrumb-${index}`} className="flex space-x-1">
                    <span>/</span>
                    <span
                      className={index === breadcrumbs.length - 1 ? "text-foreground" : ""}
                    >
                      {crumb}
                    </span>
                  </span>
                ))}
              </nav>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2 md:space-x-4">
          {/* Organization Indicator - Hidden on mobile */}
          {!isMobile && <OrganizationIndicator />}

          {/* Search - Hidden on mobile */}
          {!isMobile && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search..."
                className="pl-10 pr-4 py-2 bg-input border-border w-60 lg:w-80"
                data-testid="input-search"
              />
            </div>
          )}

          {/* Notifications */}
          <NotificationPanel />

          {/* Dark Mode Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            data-testid="button-theme-toggle"
          >
            {theme === "dark" ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </Button>

          {/* User Profile Menu */}
          <UserProfileMenu user={user} isMobile={isMobile} />
        </div>
      </div>
    </header>
  );
}
