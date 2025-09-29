import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Zap,
  CheckSquare,
  FolderOpen,
  Users,
  FileText,
  Calculator,
  Calendar,
  MessageSquare,
  BarChart3,
  Settings,
  Download,
  Upload,
  Clock,
  PoundSterling,
  Briefcase,
  Star,
  ArrowRight,
} from "lucide-react";

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: any;
  href: string;
  category: 'create' | 'manage' | 'report' | 'admin';
  roles: string[];
  popular?: boolean;
}

interface QuickActionsHubProps {
  userRole?: string;
}

export function QuickActionsHub({ userRole = 'employee' }: QuickActionsHubProps) {
  const allActions: QuickAction[] = [
    // Create Actions
    {
      id: 'create-task',
      title: 'New Task',
      description: 'Create a new task or assignment',
      icon: CheckSquare,
      href: '/tasks?action=create',
      category: 'create',
      roles: ['admin', 'manager', 'employee', 'contractor', 'super_admin'],
      popular: true,
    },
    {
      id: 'create-project',
      title: 'New Project',
      description: 'Start a new project',
      icon: FolderOpen,
      href: '/projects?action=create',
      category: 'create',
      roles: ['admin', 'manager', 'super_admin'],
      popular: true,
    },
    {
      id: 'add-client',
      title: 'Add Client',
      description: 'Register a new client',
      icon: Users,
      href: '/sales?action=create-client',
      category: 'create',
      roles: ['admin', 'manager', 'super_admin'],
    },
    {
      id: 'create-invoice',
      title: 'New Invoice',
      description: 'Generate an invoice',
      icon: FileText,
      href: '/finance?action=create-invoice',
      category: 'create',
      roles: ['admin', 'manager', 'super_admin'],
    },

    // Management Actions
    {
      id: 'time-tracking',
      title: 'Track Time',
      description: 'Start time tracking session',
      icon: Clock,
      href: '/time',
      category: 'manage',
      roles: ['admin', 'manager', 'employee', 'contractor', 'super_admin'],
      popular: true,
    },
    {
      id: 'manage-team',
      title: 'Team Management',
      description: 'Manage team members',
      icon: Users,
      href: '/team',
      category: 'manage',
      roles: ['admin', 'manager', 'super_admin'],
    },
    {
      id: 'budget-overview',
      title: 'Budget Overview',
      description: 'View financial status',
      icon: PoundSterling,
      href: '/finance',
      category: 'manage',
      roles: ['admin', 'manager', 'super_admin'],
    },
    {
      id: 'project-timeline',
      title: 'Project Timeline',
      description: 'View project schedules',
      icon: Calendar,
      href: '/projects?view=gantt',
      category: 'manage',
      roles: ['admin', 'manager', 'employee', 'super_admin'],
    },

    // Reporting Actions
    {
      id: 'analytics-dashboard',
      title: 'Analytics',
      description: 'View performance metrics',
      icon: BarChart3,
      href: '/analytics',
      category: 'report',
      roles: ['admin', 'manager', 'super_admin'],
      popular: true,
    },
    {
      id: 'export-data',
      title: 'Export Data',
      description: 'Download reports and data',
      icon: Download,
      href: '/analytics?action=export',
      category: 'report',
      roles: ['admin', 'manager', 'super_admin'],
    },
    {
      id: 'project-reports',
      title: 'Project Reports',
      description: 'Generate project insights',
      icon: FileText,
      href: '/projects?view=reports',
      category: 'report',
      roles: ['admin', 'manager', 'super_admin'],
    },
    {
      id: 'time-reports',
      title: 'Time Reports',
      description: 'View time tracking data',
      icon: Clock,
      href: '/time?view=reports',
      category: 'report',
      roles: ['admin', 'manager', 'super_admin'],
    },

    // Admin Actions
    {
      id: 'system-settings',
      title: 'System Settings',
      description: 'Configure system preferences',
      icon: Settings,
      href: '/admin',
      category: 'admin',
      roles: ['admin', 'super_admin'],
    },
    {
      id: 'user-management',
      title: 'User Management',
      description: 'Manage user accounts',
      icon: Users,
      href: '/admin?section=users',
      category: 'admin',
      roles: ['admin', 'super_admin'],
    },
    {
      id: 'backup-data',
      title: 'Backup Data',
      description: 'Create system backup',
      icon: Upload,
      href: '/admin?action=backup',
      category: 'admin',
      roles: ['super_admin'],
    },
  ];

  // Filter actions based on user role
  const availableActions = allActions.filter(action =>
    action.roles.includes(userRole.toLowerCase())
  );

  // Get popular actions for quick access
  const popularActions = availableActions.filter(action => action.popular).slice(0, 3);

  // Group actions by category
  const actionsByCategory = {
    create: availableActions.filter(action => action.category === 'create').slice(0, 4),
    manage: availableActions.filter(action => action.category === 'manage').slice(0, 4),
    report: availableActions.filter(action => action.category === 'report').slice(0, 3),
    admin: availableActions.filter(action => action.category === 'admin').slice(0, 3),
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'create': return Plus;
      case 'manage': return Briefcase;
      case 'report': return BarChart3;
      case 'admin': return Settings;
      default: return Star;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'create': return 'text-green-600 bg-green-100 dark:bg-green-900/20';
      case 'manage': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20';
      case 'report': return 'text-purple-600 bg-purple-100 dark:bg-purple-900/20';
      case 'admin': return 'text-red-600 bg-red-100 dark:bg-red-900/20';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
    }
  };

  const handleActionClick = (action: QuickAction) => {
    window.location.href = action.href;
  };

  return (
    <Card className="glassmorphism">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Zap className="w-5 h-5 mr-2" />
            Quick Actions
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {availableActions.length} available
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Popular Actions */}
        {popularActions.length > 0 && (
          <div>
            <div className="flex items-center mb-3">
              <Star className="w-4 h-4 mr-1 text-yellow-600" />
              <span className="text-sm font-medium text-foreground">Popular</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {popularActions.map((action) => {
                const ActionIcon = action.icon;
                return (
                  <Button
                    key={action.id}
                    variant="ghost"
                    className="h-auto p-3 justify-start hover:bg-primary/10 transition-all duration-200"
                    onClick={() => handleActionClick(action)}
                  >
                    <ActionIcon className="w-4 h-4 mr-3 text-primary" />
                    <div className="text-left">
                      <div className="text-sm font-medium">{action.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {action.description}
                      </div>
                    </div>
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions by Category */}
        {Object.entries(actionsByCategory).map(([category, actions]) => {
          if (actions.length === 0) return null;

          const CategoryIcon = getCategoryIcon(category);
          const categoryColors = getCategoryColor(category);

          return (
            <div key={category}>
              <div className="flex items-center mb-3">
                <CategoryIcon className="w-4 h-4 mr-1 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground capitalize">
                  {category}
                </span>
                <Badge
                  variant="secondary"
                  className={`ml-2 text-xs ${categoryColors}`}
                >
                  {actions.length}
                </Badge>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {actions.slice(0, 3).map((action) => {
                  const ActionIcon = action.icon;
                  return (
                    <Button
                      key={action.id}
                      variant="outline"
                      className="h-auto p-3 justify-start hover:bg-primary/10 transition-all duration-200"
                      onClick={() => handleActionClick(action)}
                    >
                      <ActionIcon className="w-4 h-4 mr-3" />
                      <div className="text-left flex-1">
                        <div className="text-sm font-medium">{action.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {action.description}
                        </div>
                      </div>
                    </Button>
                  );
                })}
                {actions.length > 3 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground hover:text-primary"
                    onClick={() => {
                      // Navigate to a page that shows all actions in this category
                      const categoryPages = {
                        create: '/dashboard',
                        manage: '/dashboard',
                        report: '/analytics',
                        admin: '/admin',
                      };
                      window.location.href = categoryPages[category as keyof typeof categoryPages];
                    }}
                  >
                    View {actions.length - 3} more {category} actions
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}

        {/* No actions message */}
        {availableActions.length === 0 && (
          <div className="text-center py-8">
            <Zap className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <div className="text-sm font-medium text-foreground">No quick actions available</div>
            <div className="text-xs text-muted-foreground">
              Contact your administrator to configure actions for your role
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}