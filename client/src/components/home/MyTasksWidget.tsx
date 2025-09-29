import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { format, isToday, isTomorrow, isPast } from "date-fns";
import type { Task } from "@shared/schema";
import {
  CheckSquare,
  Clock,
  AlertTriangle,
  Calendar,
  ArrowRight,
  Plus,
  CheckCircle2,
  Circle,
  AlertCircle,
} from "lucide-react";

interface MyTasksWidgetProps {
  userId?: string;
}

export function MyTasksWidget({ userId }: MyTasksWidgetProps) {
  const { data: tasks } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
    enabled: !!userId,
  });

  // Filter tasks for current user
  const myTasks = tasks?.filter(task => task.assignedTo === userId) || [];

  // Categorize tasks
  const todayTasks = myTasks.filter(task =>
    task.dueDate && isToday(new Date(task.dueDate)) && task.status !== 'completed'
  );

  const overdueTasks = myTasks.filter(task =>
    task.dueDate && isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate)) && task.status !== 'completed'
  );

  const upcomingTasks = myTasks.filter(task =>
    task.dueDate &&
    !isPast(new Date(task.dueDate)) &&
    !isToday(new Date(task.dueDate)) &&
    task.status !== 'completed'
  ).slice(0, 3);

  const completedToday = myTasks.filter(task =>
    task.status === 'completed' &&
    task.updatedAt &&
    isToday(new Date(task.updatedAt))
  );

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-100 dark:bg-red-900/20';
      case 'high': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/20';
      case 'medium': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
      case 'low': return 'text-green-600 bg-green-100 dark:bg-green-900/20';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return CheckCircle2;
      case 'in_progress': return Circle;
      case 'blocked': return AlertCircle;
      case 'review': return Clock;
      default: return Circle;
    }
  };

  const handleTaskClick = (taskId: string) => {
    window.location.href = `/tasks#task-${taskId}`;
  };

  return (
    <Card className="glassmorphism">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <CheckSquare className="w-5 h-5 mr-2" />
            My Tasks
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.location.href = "/tasks"}
          >
            View All
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-primary/5 rounded-lg">
            <div className="text-2xl font-bold text-primary">{todayTasks.length}</div>
            <div className="text-xs text-muted-foreground">Due Today</div>
          </div>
          <div className="text-center p-3 bg-green-500/10 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{completedToday.length}</div>
            <div className="text-xs text-muted-foreground">Completed Today</div>
          </div>
        </div>

        {/* Overdue Tasks */}
        {overdueTasks.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center text-red-600">
              <AlertTriangle className="w-4 h-4 mr-1" />
              <span className="text-sm font-medium">Overdue ({overdueTasks.length})</span>
            </div>
            {overdueTasks.slice(0, 2).map((task) => {
              const StatusIcon = getStatusIcon(task.status);
              return (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border-l-4 border-l-red-500 cursor-pointer hover:bg-red-100 dark:hover:bg-red-950/30 transition-colors"
                  onClick={() => handleTaskClick(task.id)}
                >
                  <div className="flex items-start space-x-3 flex-1">
                    <StatusIcon className="w-4 h-4 mt-0.5 text-red-600" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-foreground line-clamp-1">
                        {task.title}
                      </div>
                      <div className="text-xs text-red-600">
                        Due {format(new Date(task.dueDate!), "MMM d")}
                      </div>
                    </div>
                  </div>
                  <Badge className={getPriorityColor(task.priority)} variant="secondary">
                    {task.priority}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}

        {/* Today's Tasks */}
        {todayTasks.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center text-orange-600">
              <Calendar className="w-4 h-4 mr-1" />
              <span className="text-sm font-medium">Due Today ({todayTasks.length})</span>
            </div>
            {todayTasks.slice(0, 3).map((task) => {
              const StatusIcon = getStatusIcon(task.status);
              return (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border-l-4 border-l-orange-500 cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-950/30 transition-colors"
                  onClick={() => handleTaskClick(task.id)}
                >
                  <div className="flex items-start space-x-3 flex-1">
                    <StatusIcon className="w-4 h-4 mt-0.5 text-orange-600" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-foreground line-clamp-1">
                        {task.title}
                      </div>
                      <div className="text-xs text-orange-600">Today</div>
                    </div>
                  </div>
                  <Badge className={getPriorityColor(task.priority)} variant="secondary">
                    {task.priority}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}

        {/* Upcoming Tasks */}
        {upcomingTasks.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center text-blue-600">
              <Clock className="w-4 h-4 mr-1" />
              <span className="text-sm font-medium">Upcoming</span>
            </div>
            {upcomingTasks.map((task) => {
              const StatusIcon = getStatusIcon(task.status);
              const dueDate = new Date(task.dueDate!);
              return (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border-l-4 border-l-blue-500 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-950/30 transition-colors"
                  onClick={() => handleTaskClick(task.id)}
                >
                  <div className="flex items-start space-x-3 flex-1">
                    <StatusIcon className="w-4 h-4 mt-0.5 text-blue-600" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-foreground line-clamp-1">
                        {task.title}
                      </div>
                      <div className="text-xs text-blue-600">
                        {isTomorrow(dueDate) ? "Tomorrow" : format(dueDate, "MMM d")}
                      </div>
                    </div>
                  </div>
                  <Badge className={getPriorityColor(task.priority)} variant="secondary">
                    {task.priority}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}

        {/* No tasks message */}
        {myTasks.length === 0 && (
          <div className="text-center py-8">
            <CheckSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <div className="text-sm font-medium text-foreground">No tasks assigned</div>
            <div className="text-xs text-muted-foreground mb-4">
              You're all caught up! Create a new task to get started.
            </div>
            <Button
              size="sm"
              onClick={() => window.location.href = "/tasks"}
              className="mt-2"
            >
              <Plus className="w-4 h-4 mr-1" />
              Create Task
            </Button>
          </div>
        )}

        {/* All caught up message */}
        {myTasks.length > 0 && todayTasks.length === 0 && overdueTasks.length === 0 && (
          <div className="text-center py-4">
            <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <div className="text-sm font-medium text-foreground">All caught up!</div>
            <div className="text-xs text-muted-foreground">
              No urgent tasks need your attention right now.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}