import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createInsertSchema } from "drizzle-zod";
import { users } from "@shared/schema";
import type { Task, User, Project } from "@shared/schema";
import { 
  Plus, 
  Search, 
  Users, 
  UserCheck, 
  Clock,
  Mail, 
  Phone,
  MapPin,
  MoreHorizontal,
  Calendar,
  Award,
  Eye
} from "lucide-react";
import { z } from "zod";

// Form schema for adding team members
const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  skills: z.string().optional().transform(str => str ? str.split(',').map(s => s.trim()) : []),
});

type InsertUser = z.infer<typeof insertUserSchema>;

export default function Team() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<User | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: tasks } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
    enabled: isAuthenticated,
  });

  const { data: teamMembers, isLoading: isLoadingTeam } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: isAuthenticated,
  });

  // Form for adding new team members
  const form = useForm<InsertUser>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      role: "employee",
      department: "",
      position: "",
      phone: "",
      address: "",
      skills: [],
      isActive: true,
    },
  });

  // Mutation for adding team members
  const addMemberMutation = useMutation({
    mutationFn: async (data: InsertUser) => {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Failed to add team member');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "Team member added successfully!",
      });
      setIsAddDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error", 
        description: "Failed to add team member. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertUser) => {
    addMemberMutation.mutate(data);
  };


  if (isLoading || !isAuthenticated || isLoadingTeam) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const actualTeamMembers = teamMembers || [];

  const getStatusColor = (isActive: boolean) => {
    return isActive ? "default" : "secondary";
  };

  const getUserDisplayName = (user: User) => {
    return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Unknown User';
  };

  const getUserInitials = (user: User) => {
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U';
  };

  const getMemberTasks = (memberId: string) => {
    return tasks?.filter(task => task.assignedTo === memberId) || [];
  };

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "text-green-600 dark:text-green-400";
      case "in_progress": return "text-blue-600 dark:text-blue-400";
      case "review": return "text-yellow-600 dark:text-yellow-400";
      default: return "text-gray-600 dark:text-gray-400";
    }
  };

  const filteredMembers = actualTeamMembers.filter((member) => {
    const displayName = getUserDisplayName(member).toLowerCase();
    const role = (member.role || '').toLowerCase();
    const department = (member.department || '').toLowerCase();
    const email = (member.email || '').toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    
    return displayName.includes(searchLower) ||
           role.includes(searchLower) ||
           department.includes(searchLower) ||
           email.includes(searchLower);
  });

  const openDetailsDialog = (member: User) => {
    setSelectedMember(member);
    setIsDetailsDialogOpen(true);
  };

  return (
    <Layout title="Team Management" breadcrumbs={["Team"]}>
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search team members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-80"
                data-testid="input-search-team"
              />
            </div>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-member">
                <Plus className="w-4 h-4 mr-2" />
                Add Team Member
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add Team Member</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter first name" {...field} data-testid="input-first-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter last name" {...field} data-testid="input-last-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="Enter email" {...field} data-testid="input-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-role">
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="employee">Employee</SelectItem>
                            <SelectItem value="client">Client</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Department</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter department" {...field} data-testid="input-department" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="position"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Position</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter position" {...field} data-testid="input-position" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAddDialogOpen(false)}
                      className="flex-1"
                      data-testid="button-cancel"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={addMemberMutation.isPending}
                      className="flex-1"
                      data-testid="button-save"
                    >
                      {addMemberMutation.isPending ? "Adding..." : "Add Member"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="glassmorphism">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Members</p>
                  <p className="text-2xl font-bold" data-testid="text-total-members">
                    {actualTeamMembers.length}
                  </p>
                </div>
                <Users className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="glassmorphism">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Now</p>
                  <p className="text-2xl font-bold" data-testid="text-active-members">
                    {actualTeamMembers.filter(m => m.isActive).length}
                  </p>
                </div>
                <UserCheck className="w-8 h-8 text-success" />
              </div>
            </CardContent>
          </Card>

          <Card className="glassmorphism">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Avg Productivity</p>
                  <p className="text-2xl font-bold" data-testid="text-avg-productivity">
                    N/A
                  </p>
                </div>
                <Award className="w-8 h-8 text-warning" />
              </div>
            </CardContent>
          </Card>

          <Card className="glassmorphism">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Tasks</p>
                  <p className="text-2xl font-bold" data-testid="text-active-tasks">
                    {tasks?.filter((task: any) => task.status !== 'completed').length || 0}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-accent-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Team Members Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMembers.map((member, index) => {
            const memberTasks = getMemberTasks(member.id);
            const activeTasks = memberTasks.filter(task => task.status !== 'completed');
            
            return (
              <Card key={member.id} className="glassmorphism" data-testid={`card-member-${index}`}>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={member.profileImageUrl || ''} alt={getUserDisplayName(member)} />
                      <AvatarFallback>
                        {getUserInitials(member)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-foreground" data-testid={`text-name-${index}`}>
                        {getUserDisplayName(member)}
                      </h3>
                      <p className="text-sm text-muted-foreground">{member.role || 'No role assigned'}</p>
                    </div>
                  </div>
                  <Badge variant={getStatusColor(member.isActive || false)} data-testid={`badge-status-${index}`}>
                    {member.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Mail className="w-4 h-4 mr-2" />
                    {member.email}
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Phone className="w-4 h-4 mr-2" />
                    {member.phone}
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4 mr-2" />
                    Joined {new Date(member.createdAt || '').toLocaleDateString()}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Department</span>
                    <span className="font-medium">{member.department}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Active Tasks</span>
                    <span className="font-medium">{activeTasks.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Completed Tasks</span>
                    <span className="font-medium text-success">{memberTasks.filter(t => t.status === 'completed').length}</span>
                  </div>
                </div>

                {/* Assigned Tasks Section */}
                {memberTasks.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Current Tasks</p>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {activeTasks.slice(0, 3).map((task, taskIndex) => (
                        <div 
                          key={task.id} 
                          className="p-2 bg-muted/30 rounded-sm border border-border/50"
                          data-testid={`member-task-${taskIndex}`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="font-medium text-xs truncate" title={task.title}>
                              {task.title}
                            </div>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${getTaskStatusColor(task.status || "todo")}`}
                            >
                              {task.status || "todo"}
                            </Badge>
                          </div>
                          {task.priority && (
                            <Badge variant="outline" className="text-xs">
                              {task.priority}
                            </Badge>
                          )}
                        </div>
                      ))}
                      {activeTasks.length > 3 && (
                        <p className="text-xs text-muted-foreground text-center">
                          +{activeTasks.length - 3} more tasks
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {member.skills && member.skills.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Skills</p>
                    <div className="flex flex-wrap gap-1">
                      {member.skills.map((skill, skillIndex) => (
                        <Badge key={skillIndex} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full" 
                  onClick={() => openDetailsDialog(member)}
                  data-testid={`button-view-${index}`}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Details
                </Button>
              </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredMembers.length === 0 && (
          <Card className="glassmorphism">
            <CardContent className="text-center py-8">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? "No team members found matching your search" : "No team members found"}
              </p>
            </CardContent>
          </Card>
        )}

        {/* View Details Dialog */}
        <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Team Member Details</DialogTitle>
            </DialogHeader>
            {selectedMember && (
              <div className="space-y-6">
                <div className="flex items-center space-x-4">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={selectedMember.profileImageUrl || ''} alt={getUserDisplayName(selectedMember)} />
                    <AvatarFallback>
                      {getUserInitials(selectedMember)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-xl font-semibold">{getUserDisplayName(selectedMember)}</h3>
                    <p className="text-muted-foreground">{selectedMember.role || 'No role assigned'}</p>
                    <Badge variant={getStatusColor(selectedMember.isActive || false)} className="mt-1">
                      {selectedMember.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-2">Contact</h4>
                    <div className="space-y-2">
                      <div className="flex items-center text-sm">
                        <Mail className="w-4 h-4 mr-2 text-muted-foreground" />
                        {selectedMember.email || 'N/A'}
                      </div>
                      <div className="flex items-center text-sm">
                        <Phone className="w-4 h-4 mr-2 text-muted-foreground" />
                        {selectedMember.phone || 'N/A'}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-2">Work Info</h4>
                    <div className="space-y-2">
                      <div className="text-sm">
                        <span className="text-muted-foreground">Department: </span>
                        {selectedMember.department || 'N/A'}
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Position: </span>
                        {selectedMember.position || 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>

                {selectedMember.skills && selectedMember.skills.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-2">Skills</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedMember.skills.map((skill, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">Task Summary</h4>
                  <div className="grid grid-cols-3 gap-4">
                    {(() => {
                      const memberTasks = getMemberTasks(selectedMember.id);
                      const activeTasks = memberTasks.filter(task => task.status !== 'completed');
                      const completedTasks = memberTasks.filter(task => task.status === 'completed');
                      
                      return (
                        <>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                              {activeTasks.length}
                            </div>
                            <div className="text-xs text-muted-foreground">Active</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                              {completedTasks.length}
                            </div>
                            <div className="text-xs text-muted-foreground">Completed</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold">
                              {memberTasks.length}
                            </div>
                            <div className="text-xs text-muted-foreground">Total</div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {selectedMember.address && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-2">Address</h4>
                    <div className="flex items-start text-sm">
                      <MapPin className="w-4 h-4 mr-2 text-muted-foreground mt-0.5" />
                      {selectedMember.address}
                    </div>
                  </div>
                )}

                <div className="pt-4">
                  <Button
                    onClick={() => setIsDetailsDialogOpen(false)}
                    className="w-full"
                    data-testid="button-close-details"
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
