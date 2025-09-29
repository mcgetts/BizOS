import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, isPast, isToday } from "date-fns";
import type { Project, Task } from "@shared/schema";
import {
  AlertTriangle,
  Clock,
  XCircle,
  CheckCircle,
  ArrowRight,
  TrendingDown,
  Calendar,
  Zap,
} from "lucide-react";

interface UrgentAlertsWidgetProps {
  projects?: Project[];
  tasks?: Task[];
}

interface Alert {
  id: string;
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium';
  type: 'deadline' | 'blocked' | 'overdue' | 'budget' | 'dependency';
  actionUrl: string;
  timestamp?: Date;
}

export function UrgentAlertsWidget({ projects = [], tasks = [] }: UrgentAlertsWidgetProps) {
  const generateAlerts = (): Alert[] => {
    const alerts: Alert[] = [];
    const currentDate = new Date();

    // Critical: Blocked tasks
    tasks
      .filter(task => task.status === 'blocked')
      .slice(0, 2)
      .forEach(task => {
        alerts.push({
          id: `blocked-task-${task.id}`,
          title: 'Blocked Task',
          description: `${task.title} is currently blocked and needs immediate attention`,
          priority: 'critical',
          type: 'blocked',
          actionUrl: `/tasks#task-${task.id}`,
          timestamp: task.updatedAt ? new Date(task.updatedAt) : undefined,
        });
      });

    // Critical: Overdue tasks
    tasks
      .filter(task =>
        task.dueDate &&
        isPast(new Date(task.dueDate)) &&
        !isToday(new Date(task.dueDate)) &&
        task.status !== 'completed'
      )
      .slice(0, 2)
      .forEach(task => {
        alerts.push({
          id: `overdue-task-${task.id}`,
          title: 'Overdue Task',
          description: `${task.title} was due ${format(new Date(task.dueDate!), "MMM d")}`,
          priority: 'critical',
          type: 'overdue',
          actionUrl: `/tasks#task-${task.id}`,
          timestamp: new Date(task.dueDate!),
        });
      });

    // High: Projects on hold
    projects
      .filter(project => project.status === 'on_hold')
      .slice(0, 1)
      .forEach(project => {
        alerts.push({
          id: `on-hold-project-${project.id}`,
          title: 'Project On Hold',
          description: `${project.name} has been put on hold and may need review`,
          priority: 'high',
          type: 'blocked',
          actionUrl: `/projects#project-${project.id}`,
          timestamp: project.updatedAt ? new Date(project.updatedAt) : undefined,
        });
      });

    // High: Projects approaching deadline (within 3 days)
    projects
      .filter(project => {
        if (!project.endDate || project.status !== 'in_progress') return false;
        const daysToDeadline = Math.ceil((new Date(project.endDate).getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
        return daysToDeadline <= 3 && daysToDeadline > 0;
      })
      .slice(0, 1)
      .forEach(project => {
        const daysToDeadline = Math.ceil((new Date(project.endDate!).getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
        alerts.push({
          id: `deadline-project-${project.id}`,
          title: 'Project Deadline Approaching',
          description: `${project.name} is due in ${daysToDeadline} day${daysToDeadline === 1 ? '' : 's'}`,
          priority: 'high',
          type: 'deadline',
          actionUrl: `/projects#project-${project.id}`,
          timestamp: new Date(project.endDate!),
        });
      });

    // Medium: High priority tasks due today
    tasks
      .filter(task =>
        task.dueDate &&
        isToday(new Date(task.dueDate)) &&
        task.priority === 'high' &&
        task.status !== 'completed'
      )
      .slice(0, 1)
      .forEach(task => {
        alerts.push({
          id: `high-priority-task-${task.id}`,
          title: 'High Priority Task Due',
          description: `${task.title} is high priority and due today`,
          priority: 'medium',
          type: 'deadline',
          actionUrl: `/tasks#task-${task.id}`,
          timestamp: new Date(task.dueDate!),
        });
      });

    // Sort by priority and timestamp
    return alerts
      .sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;

        if (a.timestamp && b.timestamp) {
          return a.timestamp.getTime() - b.timestamp.getTime();
        }
        return 0;
      })
      .slice(0, 4); // Limit to 4 most urgent alerts
  };

  const alerts = generateAlerts();

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'blocked': return XCircle;
      case 'overdue': return AlertTriangle;
      case 'deadline': return Calendar;
      case 'budget': return TrendingDown;
      case 'dependency': return Clock;
      default: return AlertTriangle;
    }
  };

  const getAlertColor = (priority: string) => {
    switch (priority) {
      case 'critical': return {
        bg: 'bg-red-50 dark:bg-red-950/20',
        border: 'border-l-red-500',
        text: 'text-red-600',
        icon: 'text-red-600',
      };
      case 'high': return {
        bg: 'bg-orange-50 dark:bg-orange-950/20',
        border: 'border-l-orange-500',
        text: 'text-orange-600',
        icon: 'text-orange-600',
      };
      case 'medium': return {
        bg: 'bg-yellow-50 dark:bg-yellow-950/20',
        border: 'border-l-yellow-500',
        text: 'text-yellow-600',
        icon: 'text-yellow-600',
      };
      default: return {
        bg: 'bg-gray-50 dark:bg-gray-950/20',
        border: 'border-l-gray-500',
        text: 'text-gray-600',
        icon: 'text-gray-600',
      };
    }
  };

  const handleAlertClick = (alert: Alert) => {
    window.location.href = alert.actionUrl;
  };

  return (
    <Card className="glassmorphism">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Zap className="w-5 h-5 mr-2" />
            Urgent Alerts
            {alerts.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {alerts.length}
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.location.href = "/dashboard"}
          >
            View All
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {alerts.length > 0 ? (
            alerts.map((alert) => {
              const AlertIcon = getAlertIcon(alert.type);
              const colors = getAlertColor(alert.priority);

              return (
                <div
                  key={alert.id}
                  className={`flex items-start space-x-3 p-3 rounded-lg border-l-4 cursor-pointer transition-all duration-200 hover:shadow-md ${colors.bg} ${colors.border}`}
                  onClick={() => handleAlertClick(alert)}
                >
                  <div className="p-1 bg-white/50 dark:bg-black/20 rounded-full">
                    <AlertIcon className={`w-4 h-4 ${colors.icon}`} />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-foreground">
                      {alert.title}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {alert.description}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <Badge
                        variant="outline"
                        className={`text-xs ${colors.text} border-current`}
                      >
                        {alert.priority.charAt(0).toUpperCase() + alert.priority.slice(1)} Priority
                      </Badge>
                      {alert.timestamp && (
                        <span className="text-xs text-muted-foreground">
                          {format(alert.timestamp, "MMM d")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <div className="text-sm font-medium text-foreground">All Clear!</div>
              <div className="text-xs text-muted-foreground">
                No urgent items need your attention right now.
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}