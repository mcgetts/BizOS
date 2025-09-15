import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertClientSchema } from "@shared/schema";
import type { Client, InsertClient } from "@shared/schema";
import { z } from "zod";
import { 
  Plus, 
  Search, 
  Users, 
  Building, 
  Mail, 
  Phone,
  MoreHorizontal,
  TrendingUp,
  Edit,
  Trash2
} from "lucide-react";

// Form validation schema for client creation/editing
const clientFormSchema = insertClientSchema.extend({
  totalValue: z.string().optional(),
}).omit({ id: true, createdAt: true, updatedAt: true });

type ClientFormData = z.infer<typeof clientFormSchema>;

// Client Form Component
function ClientForm({ client, onSuccess }: { client?: Client; onSuccess: () => void }) {
  const { toast } = useToast();
  
  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: client?.name || "",
      email: client?.email || "",
      phone: client?.phone || "",
      company: client?.company || "",
      industry: client?.industry || "",
      website: client?.website || "",
      address: client?.address || "",
      status: client?.status || "lead",
      source: client?.source || "",
      totalValue: client?.totalValue?.toString() || "0",
      notes: client?.notes || "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertClient) => {
      const response = await apiRequest("POST", "/api/clients", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({ title: "Success", description: "Client created successfully" });
      onSuccess();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create client", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<InsertClient>) => {
      const response = await apiRequest("PUT", `/api/clients/${client?.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({ title: "Success", description: "Client updated successfully" });
      onSuccess();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update client", variant: "destructive" });
    },
  });

  const onSubmit = (data: ClientFormData) => {
    if (client) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name *</FormLabel>
                <FormControl>
                  <Input placeholder="John Smith" {...field} data-testid="input-client-name" />
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
                  <Input type="email" placeholder="john@company.com" {...field} data-testid="input-client-email" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input placeholder="+1 (555) 123-4567" {...field} data-testid="input-client-phone" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="company"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company</FormLabel>
                <FormControl>
                  <Input placeholder="Acme Corp" {...field} data-testid="input-client-company" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="industry"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Industry</FormLabel>
                <FormControl>
                  <Input placeholder="Technology" {...field} data-testid="input-client-industry" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="website"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Website</FormLabel>
                <FormControl>
                  <Input placeholder="https://company.com" {...field} data-testid="input-client-website" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-client-status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="lead">Lead</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                    <SelectItem value="proposal">Proposal</SelectItem>
                    <SelectItem value="client">Client</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="source"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Source</FormLabel>
                <FormControl>
                  <Input placeholder="Website, Referral, etc." {...field} data-testid="input-client-source" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="totalValue"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Total Value ($)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="0" {...field} data-testid="input-client-value" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Textarea placeholder="123 Main St, City, State 12345" {...field} data-testid="input-client-address" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea placeholder="Additional notes about this client..." {...field} data-testid="input-client-notes" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end space-x-2">
          <Button type="submit" disabled={isLoading} data-testid="button-save-client">
            {isLoading ? "Saving..." : client ? "Update Client" : "Create Client"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export default function Clients() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

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

  const { data: clients, isLoading: clientsLoading, error } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    enabled: isAuthenticated,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/clients/${id}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({ title: "Success", description: "Client deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete client", variant: "destructive" });
    },
  });

  const handleDeleteClient = (client: Client) => {
    deleteMutation.mutate(client.id);
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
      case "client": return "default";
      case "lead": return "secondary";
      case "qualified": return "outline";
      case "proposal": return "destructive";
      default: return "secondary";
    }
  };

  const filteredClients = clients?.filter((client: Client) =>
    client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <Layout title="Client Management" breadcrumbs={["Clients"]}>
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search clients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-80"
                data-testid="input-search-clients"
              />
            </div>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-client">
                <Plus className="w-4 h-4 mr-2" />
                Add Client
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Client</DialogTitle>
              </DialogHeader>
              <ClientForm onSuccess={() => setIsAddDialogOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="glassmorphism">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Clients</p>
                  <p className="text-2xl font-bold" data-testid="text-total-clients">
                    {clients?.filter((c: any) => c.status === 'client').length || 0}
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
                  <p className="text-sm font-medium text-muted-foreground">Active Leads</p>
                  <p className="text-2xl font-bold" data-testid="text-active-leads">
                    {clients?.filter((c: any) => c.status === 'lead').length || 0}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-success" />
              </div>
            </CardContent>
          </Card>

          <Card className="glassmorphism">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">In Pipeline</p>
                  <p className="text-2xl font-bold" data-testid="text-pipeline">
                    {clients?.filter((c: any) => ['qualified', 'proposal'].includes(c.status)).length || 0}
                  </p>
                </div>
                <Building className="w-8 h-8 text-warning" />
              </div>
            </CardContent>
          </Card>

          <Card className="glassmorphism">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold" data-testid="text-revenue">
                    ${clients?.reduce((sum: number, client: any) => sum + (parseFloat(client.totalValue) || 0), 0).toLocaleString() || '0'}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-success" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Clients Table */}
        <Card className="glassmorphism">
          <CardHeader>
            <CardTitle>All Clients</CardTitle>
          </CardHeader>
          <CardContent>
            {clientsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Failed to load clients</p>
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm ? "No clients found matching your search" : "No clients found. Add your first client to get started."}
                </p>
                {!searchTerm && (
                  <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="mt-4" data-testid="button-add-first-client">
                        <Plus className="w-4 h-4 mr-2" />
                        Add First Client
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Add Your First Client</DialogTitle>
                      </DialogHeader>
                      <ClientForm onSuccess={() => setIsAddDialogOpen(false)} />
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full" data-testid="table-clients">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-sm font-medium text-muted-foreground py-3">Client</th>
                      <th className="text-left text-sm font-medium text-muted-foreground py-3">Company</th>
                      <th className="text-left text-sm font-medium text-muted-foreground py-3">Contact</th>
                      <th className="text-left text-sm font-medium text-muted-foreground py-3">Status</th>
                      <th className="text-left text-sm font-medium text-muted-foreground py-3">Value</th>
                      <th className="text-left text-sm font-medium text-muted-foreground py-3">Last Contact</th>
                      <th className="text-left text-sm font-medium text-muted-foreground py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredClients.map((client: any, index: number) => (
                      <tr key={client.id} data-testid={`row-client-${index}`}>
                        <td className="py-4">
                          <div className="font-medium text-foreground">{client.name}</div>
                          <div className="text-sm text-muted-foreground">{client.industry}</div>
                        </td>
                        <td className="py-4">
                          <div className="text-sm text-foreground">{client.company}</div>
                        </td>
                        <td className="py-4">
                          <div className="space-y-1">
                            {client.email && (
                              <div className="flex items-center text-sm text-muted-foreground">
                                <Mail className="w-3 h-3 mr-1" />
                                {client.email}
                              </div>
                            )}
                            {client.phone && (
                              <div className="flex items-center text-sm text-muted-foreground">
                                <Phone className="w-3 h-3 mr-1" />
                                {client.phone}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-4">
                          <Badge variant={getStatusColor(client.status)} data-testid={`badge-status-${index}`}>
                            {client.status?.charAt(0).toUpperCase() + client.status?.slice(1)}
                          </Badge>
                        </td>
                        <td className="py-4">
                          <div className="text-sm text-foreground">
                            ${parseFloat(client.totalValue || 0).toLocaleString()}
                          </div>
                        </td>
                        <td className="py-4">
                          <div className="text-sm text-muted-foreground">
                            {client.lastContactDate 
                              ? new Date(client.lastContactDate).toLocaleDateString()
                              : 'Never'
                            }
                          </div>
                        </td>
                        <td className="py-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" data-testid={`button-actions-${index}`}>
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setEditingClient(client)} data-testid={`button-edit-${index}`}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem data-testid={`button-delete-${index}`} className="text-destructive">
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Client</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete {client.name}? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteClient(client)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Client Dialog */}
        {editingClient && (
          <Dialog open={!!editingClient} onOpenChange={() => setEditingClient(null)}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Client: {editingClient.name}</DialogTitle>
              </DialogHeader>
              <ClientForm 
                client={editingClient} 
                onSuccess={() => setEditingClient(null)} 
              />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </Layout>
  );
}
