import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ProjectComment, ProjectActivity, User } from "@shared/schema";
import {
  MessageSquare,
  Activity,
  Send,
  Clock,
  FileText,
  User as UserIcon,
  CheckCircle,
  AlertCircle,
  Upload,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ProjectCommunicationProps {
  projectId: string;
  projectName: string;
}

export function ProjectCommunication({ projectId, projectName }: ProjectCommunicationProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [newComment, setNewComment] = useState("");

  // Fetch comments
  const { data: comments, isLoading: commentsLoading } = useQuery<ProjectComment[]>({
    queryKey: ["/api/projects", projectId, "comments"],
  });

  // Fetch activity
  const { data: activities, isLoading: activitiesLoading } = useQuery<ProjectActivity[]>({
    queryKey: ["/api/projects", projectId, "activity"],
  });

  // Fetch users for name resolution
  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest("POST", `/api/projects/${projectId}/comments`, {
        content,
        type: "comment",
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "comments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "activity"] });
      setNewComment("");
      toast({
        title: "Success",
        description: "Comment added successfully"
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive"
      });
    },
  });

  const getUserName = (userId: string | null) => {
    if (!userId) return "Unknown User";
    const userRecord = users?.find(u => u.id === userId);
    return userRecord ? `${userRecord.firstName || ''} ${userRecord.lastName || ''}`.trim() || userRecord.email || "Unknown User" : "Unknown User";
  };

  const getUserInitials = (userId: string | null) => {
    if (!userId) return "?";
    const userRecord = users?.find(u => u.id === userId);
    if (!userRecord) return "?";
    return `${userRecord.firstName?.[0] || ""}${userRecord.lastName?.[0] || ""}`.toUpperCase() || userRecord.email?.[0]?.toUpperCase() || "?";
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    addCommentMutation.mutate(newComment.trim());
  };

  const getActivityIcon = (action: string) => {
    switch (action) {
      case "created":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "updated":
        return <AlertCircle className="w-4 h-4 text-blue-600" />;
      case "comment_added":
        return <MessageSquare className="w-4 h-4 text-purple-600" />;
      case "task_added":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "file_uploaded":
        return <Upload className="w-4 h-4 text-indigo-600" />;
      default:
        return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  const getActivityDescription = (activity: ProjectActivity) => {
    const userName = getUserName(activity.userId);
    switch (activity.action) {
      case "created":
        return `${userName} created the project`;
      case "updated":
        return `${userName} updated the project`;
      case "comment_added":
        return `${userName} added a comment`;
      case "task_added":
        return `${userName} added a task`;
      case "file_uploaded":
        return `${userName} uploaded a file`;
      default:
        return `${userName} performed an action`;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Project Communication
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="comments" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="comments" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Comments ({comments?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Activity ({activities?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="comments" className="space-y-4">
            {/* Add Comment */}
            <div className="space-y-3">
              <Textarea
                placeholder={`Add a comment to ${projectName}...`}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[80px]"
              />
              <div className="flex justify-end">
                <Button
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || addCommentMutation.isPending}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  {addCommentMutation.isPending ? "Posting..." : "Post Comment"}
                </Button>
              </div>
            </div>

            {/* Comments List */}
            <div className="space-y-4">
              {commentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              ) : !comments?.length ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No comments yet</p>
                  <p className="text-sm text-muted-foreground">Be the first to share an update!</p>
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3 p-4 bg-muted/50 rounded-lg">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="text-xs">
                        {getUserInitials(comment.userId)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {getUserName(comment.userId)}
                          </span>
                          {comment.type && comment.type !== "comment" && (
                            <Badge variant="secondary" className="text-xs">
                              {comment.type}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {comment.createdAt ? formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true }) : 'Unknown time'}
                        </div>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{comment.content}</p>

                      {comment.attachments && Array.isArray(comment.attachments) && comment.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {(comment.attachments as any[]).map((attachment: any, index: number) => (
                            <div key={index} className="flex items-center gap-1 text-xs bg-background rounded px-2 py-1">
                              <FileText className="w-3 h-3" />
                              {attachment.name}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            {activitiesLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : !activities?.length ? (
              <div className="text-center py-8">
                <Activity className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No activity yet</p>
                <p className="text-sm text-muted-foreground">Project activity will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activities.map((activity) => (
                  <div key={activity.id} className="flex gap-3 p-3 border-l-2 border-muted-foreground/20">
                    <div className="flex-shrink-0 mt-0.5">
                      {getActivityIcon(activity.action)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">{getActivityDescription(activity)}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Clock className="w-3 h-3" />
                        {activity.createdAt ? formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true }) : 'Unknown time'}
                      </div>
                      {activity.details && typeof activity.details === 'object' && (
                        <div className="mt-2 text-xs text-muted-foreground bg-muted/50 rounded p-2">
                          {JSON.stringify(activity.details, null, 2)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}