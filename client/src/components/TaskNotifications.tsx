import React, { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Task, Notification } from "@shared/schema";
import {
  Bell,
  BellOff,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Users,
  MessageSquare,
  Calendar,
  Settings,
  Zap
} from "lucide-react";

interface TaskNotificationsProps {
  task: Task;
  compact?: boolean;
  showUnreadCount?: boolean;
}

interface NotificationSettings {
  statusChanges: boolean;
  assignmentChanges: boolean;
  dueDateReminders: boolean;
  comments: boolean;
  dependencies: boolean;
  overdue: boolean;
  completed: boolean;
}

export function TaskNotifications({ task, compact = false, showUnreadCount = true }: TaskNotificationsProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  // Fetch task-specific notifications
  const { data: notifications } = useQuery<Notification[]>({
    queryKey: ["/api/notifications", { taskId: task.id }],
    enabled: isOpen,
  });

  // Fetch notification settings for this task
  const { data: settings } = useQuery<NotificationSettings>({
    queryKey: ["/api/notifications/settings", { taskId: task.id }],
    enabled: isOpen,
  });

  const unreadCount = notifications?.filter(n => !n.read).length || 0;
  const hasOverdueNotifications = notifications?.some(n =>
    n.type === 'task_overdue' && !n.read
  ) || false;

  // Mark notification as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      await apiRequest("PUT", `/api/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  // Update notification settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: Partial<NotificationSettings>) => {
      const response = await apiRequest("PUT", `/api/notifications/settings`, {
        taskId: task.id,
        ...newSettings
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/settings"] });
      toast({
        title: "Settings Updated",
        description: "Notification preferences saved successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update notification settings",
        variant: "destructive",
      });
    },
  });

  // Mark all notifications as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", "/api/notifications/mark-all-read", {
        taskId: task.id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({
        title: "Notifications Cleared",
        description: "All task notifications marked as read",
      });
    },
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'task_assigned':
      case 'task_reassigned':
        return <Users className="w-4 h-4 text-blue-500" />;
      case 'task_status_changed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'task_due_soon':
      case 'task_overdue':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'task_comment':
        return <MessageSquare className="w-4 h-4 text-purple-500" />;
      case 'task_dependency':
        return <Zap className="w-4 h-4 text-orange-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatNotificationMessage = (notification: Notification) => {
    switch (notification.type) {
      case 'task_assigned':
        return `You were assigned to this task`;
      case 'task_reassigned':
        return `Task was reassigned`;
      case 'task_status_changed':
        return `Status changed to ${notification.data?.newStatus || 'unknown'}`;
      case 'task_due_soon':
        return `Due date approaching`;
      case 'task_overdue':
        return `Task is overdue`;
      case 'task_comment':
        return `New comment added`;
      case 'task_dependency':
        return `Dependency status changed`;
      default:
        return notification.message || 'Task update';
    }
  };

  const updateNotificationSetting = (key: keyof NotificationSettings, value: boolean) => {
    updateSettingsMutation.mutate({ [key]: value });
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={`h-6 w-6 p-0 relative ${
                hasOverdueNotifications ? 'text-red-600' :
                unreadCount > 0 ? 'text-blue-600' : 'text-gray-400'
              }`}
            >
              {unreadCount > 0 ? <Bell className="w-3 h-3" /> : <BellOff className="w-3 h-3" />}
              {showUnreadCount && unreadCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs bg-red-500 text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Task Notifications</h4>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => markAllAsReadMutation.mutate()}
                    disabled={markAllAsReadMutation.isPending}
                  >
                    Mark all read
                  </Button>
                )}
              </div>

              {notifications && notifications.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {notifications.slice(0, 10).map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-2 rounded border cursor-pointer transition-colors ${
                        notification.read
                          ? 'bg-gray-50 dark:bg-gray-800 border-gray-200'
                          : 'bg-blue-50 dark:bg-blue-950 border-blue-200'
                      }`}
                      onClick={() => !notification.read && markAsReadMutation.mutate(notification.id)}
                    >
                      <div className="flex items-start gap-2">
                        {getNotificationIcon(notification.type)}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">
                            {formatNotificationMessage(notification)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(notification.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />
                        )}
                      </div>
                    </div>
                  ))}
                  {notifications.length > 10 && (
                    <p className="text-xs text-center text-muted-foreground py-2">
                      +{notifications.length - 10} more notifications...
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <BellOff className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No notifications</p>
                </div>
              )}

              <Separator />

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs font-medium">Quick Settings</Label>
                  <Settings className="w-3 h-3 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Status Changes</Label>
                    <Switch
                      checked={settings?.statusChanges ?? true}
                      onCheckedChange={(checked) => updateNotificationSetting('statusChanges', checked)}
                      disabled={updateSettingsMutation.isPending}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Due Date Alerts</Label>
                    <Switch
                      checked={settings?.dueDateReminders ?? true}
                      onCheckedChange={(checked) => updateNotificationSetting('dueDateReminders', checked)}
                      disabled={updateSettingsMutation.isPending}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Comments</Label>
                    <Switch
                      checked={settings?.comments ?? true}
                      onCheckedChange={(checked) => updateNotificationSetting('comments', checked)}
                      disabled={updateSettingsMutation.isPending}
                    />
                  </div>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Overdue indicator */}
        {hasOverdueNotifications && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="destructive" className="h-4 px-1 text-xs">
                  <AlertTriangle className="w-2 h-2" />
                </Badge>
              </TooltipTrigger>
              <TooltipContent>Task is overdue</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    );
  }

  // Full view for detailed pages
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Bell className="w-5 h-5 text-blue-600" />
          Notifications
          {unreadCount > 0 && (
            <Badge className="bg-blue-100 text-blue-800">
              {unreadCount} unread
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Recent Notifications */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium">Recent Activity</h4>
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
              >
                Mark all read
              </Button>
            )}
          </div>

          {notifications && notifications.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 rounded border cursor-pointer transition-colors ${
                    notification.read
                      ? 'bg-gray-50 dark:bg-gray-800'
                      : 'bg-blue-50 dark:bg-blue-950 border-blue-200'
                  }`}
                  onClick={() => !notification.read && markAsReadMutation.mutate(notification.id)}
                >
                  <div className="flex items-start gap-3">
                    {getNotificationIcon(notification.type)}
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {formatNotificationMessage(notification)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(notification.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <BellOff className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No notifications for this task</p>
            </div>
          )}
        </div>

        <Separator />

        {/* Notification Settings */}
        <div>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Notification Preferences
          </h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Status Changes</Label>
                <p className="text-xs text-muted-foreground">Notify when task status is updated</p>
              </div>
              <Switch
                checked={settings?.statusChanges ?? true}
                onCheckedChange={(checked) => updateNotificationSetting('statusChanges', checked)}
                disabled={updateSettingsMutation.isPending}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Assignment Changes</Label>
                <p className="text-xs text-muted-foreground">Notify when task is assigned or reassigned</p>
              </div>
              <Switch
                checked={settings?.assignmentChanges ?? true}
                onCheckedChange={(checked) => updateNotificationSetting('assignmentChanges', checked)}
                disabled={updateSettingsMutation.isPending}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Due Date Reminders</Label>
                <p className="text-xs text-muted-foreground">Remind when due date is approaching</p>
              </div>
              <Switch
                checked={settings?.dueDateReminders ?? true}
                onCheckedChange={(checked) => updateNotificationSetting('dueDateReminders', checked)}
                disabled={updateSettingsMutation.isPending}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Comments & Mentions</Label>
                <p className="text-xs text-muted-foreground">Notify about new comments and @mentions</p>
              </div>
              <Switch
                checked={settings?.comments ?? true}
                onCheckedChange={(checked) => updateNotificationSetting('comments', checked)}
                disabled={updateSettingsMutation.isPending}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Dependencies</Label>
                <p className="text-xs text-muted-foreground">Notify when dependent tasks change</p>
              </div>
              <Switch
                checked={settings?.dependencies ?? true}
                onCheckedChange={(checked) => updateNotificationSetting('dependencies', checked)}
                disabled={updateSettingsMutation.isPending}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Overdue Alerts</Label>
                <p className="text-xs text-muted-foreground">Alert when task becomes overdue</p>
              </div>
              <Switch
                checked={settings?.overdue ?? true}
                onCheckedChange={(checked) => updateNotificationSetting('overdue', checked)}
                disabled={updateSettingsMutation.isPending}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}