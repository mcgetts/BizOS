import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import type { SupportTicket } from "@shared/schema";
import { 
  Plus, 
  Search, 
  HelpCircle, 
  AlertTriangle,
  Clock,
  CheckCircle,
  User,
  MessageCircle,
  Star,
  Phone,
  Mail,
  Calendar,
  MoreHorizontal
} from "lucide-react";

export default function Support() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");

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

  const filteredTickets = tickets?.filter((ticket: SupportTicket) =>
    ticket.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.ticketNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.category?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const openTickets = tickets?.filter((t: SupportTicket) => t.status === 'open').length || 0;
  const inProgressTickets = tickets?.filter((t: SupportTicket) => t.status === 'in_progress').length || 0;
  const resolvedTickets = tickets?.filter((t: SupportTicket) => t.status === 'resolved').length || 0;
  const avgRating = (tickets && tickets.length > 0) ? 
    tickets.reduce((sum: number, ticket: SupportTicket) => 
      sum + (ticket.satisfactionRating || 0), 0) / (tickets.filter((t: SupportTicket) => t.satisfactionRating).length || 1) : 0;

  return (
    <Layout title="Service & Support" breadcrumbs={["Support"]}>
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
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
          </div>
          <Button data-testid="button-create-ticket">
            <Plus className="w-4 h-4 mr-2" />
            New Ticket
          </Button>
        </div>

        {/* Support Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="glassmorphism">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Open Tickets</p>
                  <p className="text-2xl font-bold text-destructive" data-testid="text-open-tickets">
                    {openTickets}
                  </p>
                </div>
                <div className="p-2 bg-destructive/10 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-destructive" />
                </div>
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                Requires immediate attention
              </div>
            </CardContent>
          </Card>

          <Card className="glassmorphism">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">In Progress</p>
                  <p className="text-2xl font-bold text-warning" data-testid="text-progress-tickets">
                    {inProgressTickets}
                  </p>
                </div>
                <div className="p-2 bg-warning/10 rounded-lg">
                  <Clock className="w-6 h-6 text-warning" />
                </div>
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                Being worked on
              </div>
            </CardContent>
          </Card>

          <Card className="glassmorphism">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Resolved</p>
                  <p className="text-2xl font-bold text-success" data-testid="text-resolved-tickets">
                    {resolvedTickets}
                  </p>
                </div>
                <div className="p-2 bg-success/10 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-success" />
                </div>
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                This month
              </div>
            </CardContent>
          </Card>

          <Card className="glassmorphism">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Satisfaction</p>
                  <p className="text-2xl font-bold text-primary" data-testid="text-satisfaction">
                    {avgRating.toFixed(1)}/5
                  </p>
                </div>
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Star className="w-6 h-6 text-primary" />
                </div>
              </div>
              <div className="flex text-sm text-warning mt-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star 
                    key={i} 
                    className={`w-3 h-3 ${i < Math.floor(avgRating) ? 'fill-current' : ''}`} 
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Support Content Tabs */}
        <Tabs defaultValue="tickets" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="tickets" data-testid="tab-tickets">Support Tickets</TabsTrigger>
            <TabsTrigger value="knowledge" data-testid="tab-knowledge">Knowledge Base</TabsTrigger>
            <TabsTrigger value="team" data-testid="tab-team">Support Team</TabsTrigger>
          </TabsList>

          <TabsContent value="tickets" className="space-y-4">
            <Card className="glassmorphism">
              <CardHeader>
                <CardTitle>Support Tickets</CardTitle>
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
                      {searchTerm ? "No tickets found matching your search" : "No support tickets found. Great! All issues are resolved."}
                    </p>
                    {!searchTerm && (
                      <Button className="mt-4" data-testid="button-create-first-ticket">
                        <Plus className="w-4 h-4 mr-2" />
                        Create Test Ticket
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredTickets.map((ticket: any, index: number) => {
                      const StatusIcon = getStatusIcon(ticket.status);
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
                                    <p className="text-foreground">Support Agent</p>
                                  </div>
                                  <div>
                                    <p className="font-medium text-muted-foreground">Created</p>
                                    <div className="flex items-center space-x-1 text-muted-foreground">
                                      <Calendar className="w-3 h-3" />
                                      <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                                    </div>
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
                              </div>
                              
                              <div className="flex items-center space-x-2 ml-4">
                                <Button variant="outline" size="sm" data-testid={`button-view-${index}`}>
                                  <MessageCircle className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" data-testid={`button-actions-${index}`}>
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
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

          <TabsContent value="knowledge" className="space-y-4">
            <Card className="glassmorphism">
              <CardHeader>
                <CardTitle>Customer Knowledge Base</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <HelpCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Knowledge base is empty. Add helpful articles for your customers.</p>
                  <Button className="mt-4" data-testid="button-add-article">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Help Article
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Sample support team members */}
              {[
                {
                  name: "Alex Thompson",
                  role: "Senior Support Specialist",
                  email: "alex.thompson@company.com",
                  phone: "+1 (555) 123-4567",
                  avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100",
                  activeTickets: 12,
                  avgRating: 4.8
                },
                {
                  name: "Sarah Kim",
                  role: "Technical Support Lead",
                  email: "sarah.kim@company.com", 
                  phone: "+1 (555) 234-5678",
                  avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100",
                  activeTickets: 8,
                  avgRating: 4.9
                }
              ].map((member, index) => (
                <Card key={index} className="glassmorphism" data-testid={`card-support-member-${index}`}>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4 mb-4">
                      <img
                        src={member.avatar}
                        alt={member.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div>
                        <h3 className="font-semibold text-foreground">{member.name}</h3>
                        <p className="text-sm text-muted-foreground">{member.role}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center space-x-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">{member.email}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">{member.phone}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-border">
                      <div className="text-center">
                        <p className="text-lg font-semibold text-foreground">{member.activeTickets}</p>
                        <p className="text-xs text-muted-foreground">Active Tickets</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-semibold text-primary">{member.avgRating}</p>
                        <p className="text-xs text-muted-foreground">Avg Rating</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
