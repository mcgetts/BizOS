import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import SupportAnalytics from "@/components/SupportAnalytics";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { insertSupportTicketSchema, type SupportTicket, type InsertSupportTicket, type User, type Client } from "@shared/schema";
import { z } from "zod";
import {
  Plus,
  Search,
  HelpCircle,
  AlertTriangle,
  Clock,
  CheckCircle,
  BookOpen,
  User as UserIcon,
  MessageCircle,
  Star,
  Phone,
  Mail,
  Calendar,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  UserCheck,
  ArrowRight,
  X,
  StarIcon,
  BarChart3,
  Tickets
} from "lucide-react";

// Enhanced form schema with better validation
const formSchema = insertSupportTicketSchema.extend({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  category: z.string().min(1, "Category is required"),
  priority: z.string().min(1, "Priority is required"),
});

type FormData = z.infer<typeof formSchema>;

export default function Support() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<SupportTicket | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [ratingTicket, setRatingTicket] = useState<SupportTicket | null>(null);
  const [selectedRating, setSelectedRating] = useState<number>(0);

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

  const { data: tickets, isLoading: ticketsLoading } = useQuery<SupportTicket[]>({
    queryKey: ["/api/support/tickets"],
    enabled: isAuthenticated,
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: isAuthenticated,
  });

  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    enabled: isAuthenticated,
  });

  // Create ticket form
  const createForm = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "general",
      priority: "medium",
      status: "open",
    },
  });

  // Edit ticket form
  const editForm = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "general",
      priority: "medium",
      status: "open",
    },
  });

  // Create ticket mutation (server generates ticket number automatically)
  const createTicketMutation = useMutation({
    mutationFn: async (data: InsertSupportTicket) => {
      // Server handles ticket number generation and timestamps
      return apiRequest("/api/support/tickets", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/support/tickets"] });
      setCreateModalOpen(false);
      createForm.reset();
      toast({
        title: "Success",
        description: "Support ticket created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create ticket",
        variant: "destructive",
      });
    },
  });

  // Update ticket mutation
  const updateTicketMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertSupportTicket> }) => {
      return apiRequest(`/api/support/tickets/${id}`, "PUT", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/support/tickets"] });
      setEditModalOpen(false);
      setEditingTicket(null);
      editForm.reset();
      toast({
        title: "Success",
        description: "Support ticket updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update ticket",
        variant: "destructive",
      });
    },
  });

  // Delete ticket mutation
  const deleteTicketMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/support/tickets/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/support/tickets"] });
      toast({
        title: "Success",
        description: "Support ticket deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete ticket",
        variant: "destructive",
      });
    },
  });

  // Rate ticket mutation
  const rateTicketMutation = useMutation({
    mutationFn: async ({ id, rating }: { id: string; rating: number }) => {
      return apiRequest(`/api/support/tickets/${id}`, "PUT", { 
        satisfactionRating: rating,
        status: "closed" 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/support/tickets"] });
      setRatingModalOpen(false);
      setRatingTicket(null);
      setSelectedRating(0);
      toast({
        title: "Success",
        description: "Thank you for your feedback!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit rating",
        variant: "destructive",
      });
    },
  });

  // Handle ticket status update
  const updateTicketStatus = (ticketId: string, newStatus: string, resolution?: string) => {
    updateTicketMutation.mutate({
      id: ticketId,
      data: {
        status: newStatus,
        ...(resolution && { resolution }),
        ...(newStatus === "resolved" && { resolvedAt: new Date() }),
      },
    });
  };

  // Handle edit ticket
  const handleEditTicket = (ticket: SupportTicket) => {
    setEditingTicket(ticket);
    editForm.reset({
      title: ticket.title || "",
      description: ticket.description || "",
      category: ticket.category || "general",
      priority: ticket.priority || "medium",
      status: ticket.status || "open",
      clientId: ticket.clientId || "",
      assignedTo: ticket.assignedTo || "",
    });
    setEditModalOpen(true);
  };

  // Handle rate ticket
  const handleRateTicket = (ticket: SupportTicket) => {
    setRatingTicket(ticket);
    setSelectedRating(ticket.satisfactionRating || 0);
    setRatingModalOpen(true);
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "destructive";
      case "in_progress": return "outline";
      case "resolved": return "default";
      case "closed": return "secondary";
      default: return "secondary";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "destructive";
      case "high": return "outline";
      case "medium": return "outline";
      case "low": return "secondary";
      default: return "secondary";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open": return AlertTriangle;
      case "in_progress": return Clock;
      case "resolved": return CheckCircle;
      case "closed": return CheckCircle;
      default: return HelpCircle;
    }
  };

  const filteredTickets = tickets?.filter((ticket: SupportTicket) => {
    const matchesSearch = ticket.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.ticketNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.category?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === "all" || ticket.category === selectedCategory;
    const matchesStatus = selectedStatus === "all" || ticket.status === selectedStatus;
    
    return matchesSearch && matchesCategory && matchesStatus;
  }) || [];

  const openTickets = tickets?.filter((t: SupportTicket) => t.status === 'open').length || 0;
  const inProgressTickets = tickets?.filter((t: SupportTicket) => t.status === 'in_progress').length || 0;
  const resolvedTickets = tickets?.filter((t: SupportTicket) => t.status === 'resolved').length || 0;
  const closedTickets = tickets?.filter((t: SupportTicket) => t.status === 'closed').length || 0;
  const avgRating = (tickets && tickets.length > 0) ? 
    tickets.reduce((sum: number, ticket: SupportTicket) => 
      sum + (ticket.satisfactionRating || 0), 0) / (tickets.filter((t: SupportTicket) => t.satisfactionRating).length || 1) : 0;

  const onCreateSubmit = (data: FormData) => {
    createTicketMutation.mutate(data);
  };

  const onEditSubmit = (data: FormData) => {
    if (!editingTicket) return;
    updateTicketMutation.mutate({
      id: editingTicket.id,
      data,
    });
  };

  return (
    <Layout title="Service & Support" breadcrumbs={["Support"]}>
      <div className="space-y-6">
        {/* Support Content with Tabs */}
        <Tabs defaultValue="tickets" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="tickets" className="flex items-center space-x-2">
              <Tickets className="w-4 h-4" />
              <span>Support Tickets</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4" />
              <span>Analytics & KPIs</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tickets" className="space-y-6">
            {/* Support Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="glassmorphism">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Open Tickets</p>
                      <p className="text-2xl font-bold" data-testid="text-open-tickets">
                        {tickets?.filter(t => t.status === 'open').length || 0}
                      </p>
                    </div>
                    <BookOpen className="w-8 h-8 text-destructive" />
                  </div>
                </CardContent>
              </Card>
              <Card className="glassmorphism">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">In Progress</p>
                      <p className="text-2xl font-bold" data-testid="text-in-progress-tickets">
                        {tickets?.filter(t => t.status === 'in_progress').length || 0}
                      </p>
                    </div>
                    <Clock className="w-8 h-8 text-warning" />
                  </div>
                </CardContent>
              </Card>
              <Card className="glassmorphism">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Resolved</p>
                      <p className="text-2xl font-bold text-success" data-testid="text-resolved-tickets">
                        {tickets?.filter(t => t.status === 'resolved').length || 0}
                      </p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-success" />
                  </div>
                </CardContent>
              </Card>
              <Card className="glassmorphism">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Satisfaction</p>
                      <p className="text-2xl font-bold" data-testid="text-satisfaction-score">
                        {avgRating > 0 ? avgRating.toFixed(1) : 'N/A'}
                      </p>
                    </div>
                    <Star className="w-8 h-8 text-accent-foreground" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Search and Filters */}
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search tickets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-80"
                  data-testid="input-search-support"
                />
              </div>

              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-40" data-testid="select-category">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="technical">Technical</SelectItem>
                  <SelectItem value="billing">Billing</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="feature">Feature Request</SelectItem>
                  <SelectItem value="bug">Bug Report</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-40" data-testid="select-status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tickets List */}
            <Card className="glassmorphism">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Support Tickets</CardTitle>
                  <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
                    <DialogTrigger asChild>
                      <Button data-testid="button-create-ticket">
                        <Plus className="w-4 h-4 mr-2" />
                        New Ticket
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Create Support Ticket</DialogTitle>
                      </DialogHeader>
                      <Form {...createForm}>
                        <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={createForm.control}
                              name="category"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Category</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger data-testid="input-category">
                                        <SelectValue placeholder="Select category" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="technical">Technical</SelectItem>
                                      <SelectItem value="billing">Billing</SelectItem>
                                      <SelectItem value="general">General</SelectItem>
                                      <SelectItem value="feature">Feature Request</SelectItem>
                                      <SelectItem value="bug">Bug Report</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={createForm.control}
                              name="priority"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Priority</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger data-testid="input-priority">
                                        <SelectValue placeholder="Select priority" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="low">Low</SelectItem>
                                      <SelectItem value="medium">Medium</SelectItem>
                                      <SelectItem value="high">High</SelectItem>
                                      <SelectItem value="urgent">Urgent</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={createForm.control}
                              name="clientId"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Client (Optional)</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                                    <FormControl>
                                      <SelectTrigger data-testid="input-client">
                                        <SelectValue placeholder="Select client" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {clients?.map((client) => (
                                        <SelectItem key={client.id} value={client.id}>
                                          {client.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={createForm.control}
                              name="assignedTo"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Assign To (Optional)</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                                    <FormControl>
                                      <SelectTrigger data-testid="input-assigned-to">
                                        <SelectValue placeholder="Assign to agent" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {users?.filter(user => user.role === 'employee' || user.role === 'manager' || user.role === 'admin').map((user) => (
                                        <SelectItem key={user.id} value={user.id}>
                                          {`${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Unknown User'}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <FormField
                            control={createForm.control}
                            name="title"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Title</FormLabel>
                                <FormControl>
                                  <Input placeholder="Brief description of the issue" {...field} data-testid="input-title" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={createForm.control}
                            name="description"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Description</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Detailed description of the issue, steps to reproduce, expected behavior..."
                                    className="min-h-[120px]"
                                    {...field}
                                    data-testid="input-description"
                                  />
                                </FormControl>
                                <FormDescription>
                                  Provide as much detail as possible to help us resolve your issue quickly.
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="flex justify-end space-x-4">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setCreateModalOpen(false)}
                              data-testid="button-cancel-create"
                            >
                              Cancel
                            </Button>
                            <Button
                              type="submit"
                              disabled={createTicketMutation.isPending}
                              data-testid="button-submit-create"
                            >
                              {createTicketMutation.isPending ? "Creating..." : "Create Ticket"}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {ticketsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                  </div>
                ) : filteredTickets.length === 0 ? (
                  <div className="text-center py-8">
                    <HelpCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      {searchTerm || selectedCategory !== "all" || selectedStatus !== "all"
                        ? "No tickets found matching your filters"
                        : "No support tickets found. Great! All issues are resolved."}
                    </p>
                    {!searchTerm && selectedCategory === "all" && selectedStatus === "all" && (
                      <Button className="mt-4" onClick={() => setCreateModalOpen(true)} data-testid="button-create-first-ticket">
                        <Plus className="w-4 h-4 mr-2" />
                        Create Test Ticket
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredTickets.map((ticket: any, index: number) => {
                      const StatusIcon = getStatusIcon(ticket.status);
                      const assignedUser = users?.find(u => u.id === ticket.assignedTo);
                      const ticketClient = clients?.find(c => c.id === ticket.clientId);

                      return (
                        <Card key={ticket.id} className="border-l-4 border-l-primary hover:shadow-lg transition-shadow" data-testid={`card-ticket-${index}`}>
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-3 mb-2">
                                  <StatusIcon className="w-5 h-5 text-muted-foreground" />
                                  <h3 className="font-semibold text-foreground" data-testid={`text-ticket-title-${index}`}>
                                    {ticket.title}
                                  </h3>
                                  <Badge variant={getStatusColor(ticket.status)} data-testid={`badge-status-${index}`}>
                                    {ticket.status?.replace('_', ' ')}
                                  </Badge>
                                  <Badge variant={getPriorityColor(ticket.priority)} data-testid={`badge-priority-${index}`}>
                                    {ticket.priority}
                                  </Badge>
                                </div>

                                <p className="text-sm text-muted-foreground mb-4">
                                  {ticket.description?.substring(0, 200)}...
                                </p>

                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                                  <div>
                                    <p className="font-medium text-muted-foreground">Ticket #</p>
                                    <p className="text-foreground">{ticket.ticketNumber}</p>
                                  </div>
                                  <div>
                                    <p className="font-medium text-muted-foreground">Category</p>
                                    <p className="text-foreground capitalize">{ticket.category}</p>
                                  </div>
                                  <div>
                                    <p className="font-medium text-muted-foreground">Assigned To</p>
                                    <p className="text-foreground">
                                      {assignedUser ? `${assignedUser.firstName} ${assignedUser.lastName}` : "Unassigned"}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="font-medium text-muted-foreground">Client</p>
                                    <p className="text-foreground">
                                      {ticketClient ? ticketClient.name : "Internal"}
                                    </p>
                                  </div>
                                </div>

                                {ticket.satisfactionRating && (
                                  <div className="mt-4">
                                    <p className="text-sm font-medium text-muted-foreground mb-1">Customer Rating</p>
                                    <div className="flex text-warning">
                                      {Array.from({ length: 5 }).map((_, i) => (
                                        <Star
                                          key={i}
                                          className={`w-4 h-4 ${i < ticket.satisfactionRating ? 'fill-current' : ''}`}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Status workflow buttons */}
                                <div className="flex items-center space-x-2 mt-4">
                                  {ticket.status === "open" && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => updateTicketStatus(ticket.id, "in_progress")}
                                      data-testid={`button-start-progress-${index}`}
                                    >
                                      <ArrowRight className="w-4 h-4 mr-1" />
                                      Start Progress
                                    </Button>
                                  )}
                                  {ticket.status === "in_progress" && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => updateTicketStatus(ticket.id, "resolved", "Issue has been resolved")}
                                      data-testid={`button-resolve-${index}`}
                                    >
                                      <CheckCircle className="w-4 h-4 mr-1" />
                                      Mark Resolved
                                    </Button>
                                  )}
                                  {ticket.status === "resolved" && !ticket.satisfactionRating && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleRateTicket(ticket)}
                                      data-testid={`button-rate-${index}`}
                                    >
                                      <Star className="w-4 h-4 mr-1" />
                                      Rate & Close
                                    </Button>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center space-x-2 ml-4">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" data-testid={`button-actions-${index}`}>
                                      <MoreHorizontal className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleEditTicket(ticket)} data-testid={`action-edit-${index}`}>
                                      <Edit className="w-4 h-4 mr-2" />
                                      Edit Ticket
                                    </DropdownMenuItem>
                                    {ticket.status === "resolved" && !ticket.satisfactionRating && (
                                      <DropdownMenuItem onClick={() => handleRateTicket(ticket)} data-testid={`action-rate-${index}`}>
                                        <Star className="w-4 h-4 mr-2" />
                                        Rate & Close
                                      </DropdownMenuItem>
                                    )}
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <DropdownMenuItem
                                          onSelect={(e) => e.preventDefault()}
                                          className="text-destructive focus:text-destructive"
                                          data-testid={`action-delete-${index}`}
                                        >
                                          <Trash2 className="w-4 h-4 mr-2" />
                                          Delete Ticket
                                        </DropdownMenuItem>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Delete Support Ticket</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Are you sure you want to delete ticket "{ticket.title}"?
                                            This action cannot be undone.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel data-testid={`button-cancel-delete-${index}`}>Cancel</AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() => deleteTicketMutation.mutate(ticket.id)}
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                            data-testid={`button-confirm-delete-${index}`}
                                          >
                                            Delete
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <SupportAnalytics />
          </TabsContent>
        </Tabs>

        {/* Edit Ticket Dialog */}
        <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Support Ticket</DialogTitle>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={editForm.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="edit-input-category">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="technical">Technical</SelectItem>
                            <SelectItem value="billing">Billing</SelectItem>
                            <SelectItem value="general">General</SelectItem>
                            <SelectItem value="feature">Feature Request</SelectItem>
                            <SelectItem value="bug">Bug Report</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="edit-input-priority">
                              <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                          <FormControl>
                            <SelectTrigger data-testid="edit-input-status">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="clientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                          <FormControl>
                            <SelectTrigger data-testid="edit-input-client">
                              <SelectValue placeholder="Select client" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {clients?.map((client) => (
                              <SelectItem key={client.id} value={client.id}>
                                {client.name} - {client.company}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="assignedTo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assign To</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                          <FormControl>
                            <SelectTrigger data-testid="edit-input-assigned-to">
                              <SelectValue placeholder="Assign to agent" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {users?.filter(user => user.role === 'employee' || user.role === 'manager' || user.role === 'admin').map((user) => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.firstName} {user.lastName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={editForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Brief description of the issue" {...field} data-testid="edit-input-title" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Detailed description of the issue"
                          className="min-h-[120px]"
                          {...field} 
                          data-testid="edit-input-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setEditModalOpen(false);
                      setEditingTicket(null);
                    }}
                    data-testid="button-cancel-edit"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={updateTicketMutation.isPending}
                    data-testid="button-submit-edit"
                  >
                    {updateTicketMutation.isPending ? "Updating..." : "Update Ticket"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Rating Dialog */}
        <Dialog open={ratingModalOpen} onOpenChange={setRatingModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Rate Support Experience</DialogTitle>
            </DialogHeader>
            <div className="py-6">
              <p className="text-center text-muted-foreground mb-6">
                How would you rate your support experience for ticket "{ratingTicket?.ticketNumber}"?
              </p>
              <div className="flex justify-center space-x-2 mb-6">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Button
                    key={i}
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedRating(i + 1)}
                    className={`p-2 ${selectedRating > i ? 'text-warning' : 'text-muted-foreground'}`}
                    data-testid={`button-rating-${i + 1}`}
                  >
                    <StarIcon className={`w-8 h-8 ${selectedRating > i ? 'fill-current' : ''}`} />
                  </Button>
                ))}
              </div>
              <div className="flex justify-end space-x-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setRatingModalOpen(false);
                    setRatingTicket(null);
                    setSelectedRating(0);
                  }}
                  data-testid="button-cancel-rating"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    if (ratingTicket && selectedRating > 0) {
                      rateTicketMutation.mutate({
                        id: ratingTicket.id,
                        rating: selectedRating,
                      });
                    }
                  }}
                  disabled={selectedRating === 0 || rateTicketMutation.isPending}
                  data-testid="button-submit-rating"
                >
                  {rateTicketMutation.isPending ? "Submitting..." : "Submit Rating"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}