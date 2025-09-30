import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, MessageSquare, Send } from "lucide-react";
import type { Task } from "@shared/schema";

interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  type: string;
  createdAt: Date;
  editedAt: Date | null;
  userFirstName: string | null;
  userLastName: string | null;
}

interface TaskCommentsProps {
  task: Task;
}

export function TaskComments({ task }: TaskCommentsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [newComment, setNewComment] = useState("");

  // Fetch comments
  const { data: comments, isLoading } = useQuery<TaskComment[]>({
    queryKey: [`/api/tasks/${task.id}/comments`],
    enabled: !!task.id,
  });

  // Create comment mutation
  const createCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest("POST", `/api/tasks/${task.id}/comments`, {
        content,
        type: "comment",
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${task.id}/comments`] });
      setNewComment("");
      toast({
        title: "Success",
        description: "Comment added successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive",
      });
    },
  });

  const handleSubmitComment = () => {
    if (!newComment.trim()) return;
    createCommentMutation.mutate(newComment);
  };

  const getInitials = (firstName: string | null, lastName: string | null) => {
    const first = firstName?.[0] || "";
    const last = lastName?.[0] || "";
    return (first + last).toUpperCase() || "?";
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Comment Input */}
      <Card>
        <CardContent className="pt-4">
          <div className="space-y-3">
            <Textarea
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={3}
              className="resize-none"
            />
            <div className="flex justify-end">
              <Button
                onClick={handleSubmitComment}
                disabled={!newComment.trim() || createCommentMutation.isPending}
                size="sm"
              >
                {createCommentMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Posting...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Post Comment
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comments List */}
      <div className="space-y-3">
        {comments && comments.length > 0 ? (
          comments.map((comment) => (
            <Card key={comment.id}>
              <CardContent className="pt-4">
                <div className="flex gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {getInitials(comment.userFirstName, comment.userLastName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {comment.userFirstName} {comment.userLastName}
                        </span>
                        {comment.userId === user?.id && (
                          <span className="text-xs text-muted-foreground">(You)</span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(comment.createdAt)}
                        {comment.editedAt && " (edited)"}
                      </span>
                    </div>
                    <p className="text-sm text-foreground whitespace-pre-wrap">
                      {comment.content}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="pt-6 pb-6">
              <div className="flex flex-col items-center justify-center text-center py-4">
                <MessageSquare className="h-10 w-10 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  No comments yet. Be the first to comment!
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}