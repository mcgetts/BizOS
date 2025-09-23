import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NotificationPanel } from "@/components/NotificationPanel";
import { Search, Sun, Moon, LogOut } from "lucide-react";

interface HeaderProps {
  title: string;
  breadcrumbs?: string[];
  user?: {
    firstName?: string;
    lastName?: string;
    role?: string;
    profileImageUrl?: string;
  };
}

export function Header({ title, breadcrumbs = [], user }: HeaderProps) {
  const { theme, setTheme } = useTheme();

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const userDisplayName = user?.firstName && user?.lastName 
    ? `${user.firstName} ${user.lastName}`
    : user?.firstName || "User";

  return (
    <header className="bg-card/70 glassmorphism border-b border-border px-6 py-4" data-testid="header">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-semibold text-foreground" data-testid="text-page-title">
            {title}
          </h1>
          {breadcrumbs.length > 0 && (
            <nav className="flex space-x-1 text-sm text-muted-foreground" data-testid="nav-breadcrumbs">
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
        
        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search..."
              className="pl-10 pr-4 py-2 bg-input border-border w-80"
              data-testid="input-search"
            />
          </div>

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

          {/* User Menu */}
          <div className="flex items-center space-x-3">
            <img
              src={
                user?.profileImageUrl || 
                "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100"
              }
              alt="Profile"
              className="w-8 h-8 rounded-full object-cover"
              data-testid="img-user-avatar"
            />
            <div className="text-sm">
              <div className="font-medium text-foreground" data-testid="text-user-name">
                {userDisplayName}
              </div>
              <div className="text-muted-foreground" data-testid="text-user-role">
                {user?.role || "Employee"}
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleLogout}
              data-testid="button-logout"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
