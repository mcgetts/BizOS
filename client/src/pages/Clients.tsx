import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/Layout";
import { SalesPipeline } from "@/components/SalesPipeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertClientSchema } from "@shared/schema";
import type { Client as BaseClient, ClientWithCompany, InsertClient } from "@shared/schema";
import { useTableSort, SortConfig } from "@/hooks/useTableSort";
import { SortableHeader, SortableTableHead } from "@/components/SortableHeader";

// Use the imported ClientWithCompany type
type Client = ClientWithCompany;
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
  Trash2,
  Building2,
  Globe,
  MapPin
} from "lucide-react";

// Form validation schema for client creation/editing
const clientFormSchema = insertClientSchema;

type ClientFormData = z.infer<typeof clientFormSchema>;

// Company types
type Company = {
  id: string;
  name: string;
  industry: string | null;
  website: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  description: string | null;
  size: string | null;
  revenue: string | null;
  foundedYear: number | null;
  tags: string[];
  assignedTo: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type CompanyFormData = {
  name: string;
  industry: string;
  website: string;
  address: string;
  phone: string;
  email: string;
  description: string;
  size: string;
  revenue: string;
  foundedYear: string;
  tags: string[];
};

const initialCompanyFormData: CompanyFormData = {
  name: "",
  industry: "",
  website: "",
  address: "",
  phone: "",
  email: "",
  description: "",
  size: "",
  revenue: "",
  foundedYear: "",
  tags: [],
};

// Client Form Component
function ClientForm({ client, onSuccess, companies }: { client?: Client; onSuccess: () => void; companies?: Company[]; }) {
  const { toast } = useToast();
  
  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: client?.name || "",
      email: client?.email ?? "",
      phone: client?.phone ?? "",
      companyId: client?.companyId ?? "",
      position: client?.position ?? "",
      department: client?.department ?? "",
      source: client?.source ?? "",
      notes: client?.notes ?? "",
      tags: client?.tags ?? [],
      isPrimaryContact: client?.isPrimaryContact ?? false,
      isActive: client?.isActive ?? true,
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
            name="companyId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value ?? undefined}>
                  <FormControl>
                    <SelectTrigger data-testid="select-client-company">
                      <SelectValue placeholder="Select company" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {companies?.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  <Input placeholder="CEO, Manager, etc." {...field} data-testid="input-client-position" />
                </FormControl>
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
                  <Input placeholder="Sales, Marketing, etc." {...field} data-testid="input-client-department" />
                </FormControl>
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
        </div>
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

// Company Form Component
function CompanyForm({ company, onSuccess }: { company?: Company; onSuccess: () => void }) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<CompanyFormData>(
    company ? {
      name: company.name,
      industry: company.industry || "",
      website: company.website || "",
      address: company.address || "",
      phone: company.phone || "",
      email: company.email || "",
      description: company.description || "",
      size: company.size || "",
      revenue: company.revenue || "",
      foundedYear: company.foundedYear?.toString() || "",
      tags: company.tags || [],
    } : initialCompanyFormData
  );
  const [tagInput, setTagInput] = useState("");

  const createMutation = useMutation({
    mutationFn: async (data: CompanyFormData) => {
      const response = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create company");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      toast({ title: "Company created successfully" });
      onSuccess();
    },
    onError: () => {
      toast({ title: "Failed to create company", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: CompanyFormData) => {
      const response = await fetch(`/api/companies/${company!.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update company");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      toast({ title: "Company updated successfully" });
      onSuccess();
    },
    onError: () => {
      toast({ title: "Failed to update company", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (company) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] });
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove),
    });
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="text-sm font-medium">Company Name *</label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter company name"
            required
          />
        </div>

        <div>
          <label className="text-sm font-medium">Industry</label>
          <Input
            value={formData.industry}
            onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
            placeholder="e.g., Technology, Healthcare"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Company Size</label>
          <select
            value={formData.size}
            onChange={(e) => setFormData({ ...formData, size: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">Select size</option>
            <option value="startup">Startup (1-10)</option>
            <option value="small">Small (11-50)</option>
            <option value="medium">Medium (51-200)</option>
            <option value="large">Large (201-1000)</option>
            <option value="enterprise">Enterprise (1000+)</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">Website</label>
          <Input
            value={formData.website}
            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
            placeholder="https://company.com"
            type="url"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Phone</label>
          <Input
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="+1 (555) 123-4567"
          />
        </div>

        <div className="col-span-2">
          <label className="text-sm font-medium">Email</label>
          <Input
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="contact@company.com"
            type="email"
          />
        </div>

        <div className="col-span-2">
          <label className="text-sm font-medium">Address</label>
          <Textarea
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="Company address"
            rows={2}
          />
        </div>

        <div>
          <label className="text-sm font-medium">Annual Revenue</label>
          <Input
            value={formData.revenue}
            onChange={(e) => setFormData({ ...formData, revenue: e.target.value })}
            placeholder="1000000"
            type="number"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Founded Year</label>
          <Input
            value={formData.foundedYear}
            onChange={(e) => setFormData({ ...formData, foundedYear: e.target.value })}
            placeholder="2020"
            type="number"
            min="1800"
            max={new Date().getFullYear()}
          />
        </div>

        <div className="col-span-2">
          <label className="text-sm font-medium">Description</label>
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Brief description of the company"
            rows={3}
          />
        </div>

        <div className="col-span-2">
          <label className="text-sm font-medium">Tags</label>
          <div className="flex space-x-2 mb-2">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="Add a tag"
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
            />
            <Button type="button" onClick={addTag} variant="outline">
              Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                {tag} ×
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : company ? "Update Company" : "Create Company"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export default function Clients() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);
  const [viewingClient, setViewingClient] = useState<Client | null>(null);
  const [isViewClientDialogOpen, setIsViewClientDialogOpen] = useState(false);

  // Company state
  const [isAddCompanyDialogOpen, setIsAddCompanyDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [deletingCompany, setDeletingCompany] = useState<Company | null>(null);
  const [viewingCompany, setViewingCompany] = useState<Company | null>(null);
  const [isViewCompanyDialogOpen, setIsViewCompanyDialogOpen] = useState(false);

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

  // Clear cache to ensure we get the new data structure with company info
  useEffect(() => {
    if (isAuthenticated) {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
    }
  }, [isAuthenticated, queryClient]);

  const { data: clients, isLoading: clientsLoading, error } = useQuery<ClientWithCompany[]>({
    queryKey: ["/api/clients"],
    enabled: isAuthenticated,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Companies query
  const { data: companies, isLoading: companiesLoading } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
    enabled: isAuthenticated,
  });

  // Opportunities query
  const { data: opportunities } = useQuery({
    queryKey: ["/api/opportunities"],
    enabled: isAuthenticated,
  });

  // Projects query
  const { data: projects } = useQuery({
    queryKey: ["/api/projects"],
    enabled: isAuthenticated,
  });

  // Client delete mutation
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
    setDeletingClient(null);
  };

  // Company delete mutation
  const deleteCompanyMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/companies/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete company");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      toast({ title: "Company deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete company", variant: "destructive" });
    },
  });

  const handleDeleteCompany = (company: Company) => {
    deleteCompanyMutation.mutate(company.id);
    setDeletingCompany(null);
  };

  const handleViewCompany = (company: Company) => {
    setViewingCompany(company);
    setIsViewCompanyDialogOpen(true);
  };

  const handleEditCompanyFromView = (company: Company) => {
    setIsViewCompanyDialogOpen(false);
    setEditingCompany(company);
  };

  const handleDeleteCompanyFromView = (company: Company) => {
    setIsViewCompanyDialogOpen(false);
    setDeletingCompany(company);
  };

  // Helper functions to count active opportunities, projects, and contacts
  const getContactCount = (companyId: string) => {
    if (!clients) return 0;
    return clients.filter((client: Client) => client.companyId === companyId).length;
  };

  const getActiveOpportunityCount = (companyId: string) => {
    if (!opportunities || !Array.isArray(opportunities)) return 0;
    return opportunities.filter((opp: any) =>
      opp.companyId === companyId &&
      opp.stage !== 'closed_won' &&
      opp.stage !== 'closed_lost'
    ).length;
  };

  const getActiveProjectCount = (companyId: string) => {
    if (!projects || !Array.isArray(projects)) return 0;
    return projects.filter((project: any) =>
      project.companyId === companyId &&
      project.status === 'active'
    ).length;
  };

  // Helper functions for client-specific opportunities and projects
  const getClientActiveOpportunityCount = (clientId: string) => {
    if (!opportunities || !Array.isArray(opportunities)) return 0;
    return opportunities.filter((opp: any) =>
      opp.clientId === clientId &&
      opp.stage !== 'closed_won' &&
      opp.stage !== 'closed_lost'
    ).length;
  };

  const getClientActiveProjectCount = (clientId: string) => {
    if (!projects || !Array.isArray(projects)) return 0;
    return projects.filter((project: any) =>
      project.clientId === clientId &&
      project.status === 'active'
    ).length;
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
    client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.position?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.company?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.company?.industry?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Filter companies based on search term
  const filteredCompanies = companies?.filter((company) =>
    company.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.industry?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Companies sorting configuration
  const companySortConfigs: SortConfig[] = [
    { key: 'name', type: 'string' },
    { key: 'industry', type: 'string' },
    {
      key: 'contacts',
      type: 'number',
      accessor: (company: any) => getContactCount(company.id)
    },
    {
      key: 'opportunities',
      type: 'number',
      accessor: (company: any) => getActiveOpportunityCount(company.id)
    },
    {
      key: 'projects',
      type: 'number',
      accessor: (company: any) => getActiveProjectCount(company.id)
    },
    { key: 'size', type: 'string' }
  ];

  // Clients sorting configuration
  const clientSortConfigs: SortConfig[] = [
    { key: 'name', type: 'string' },
    {
      key: 'company',
      type: 'string',
      accessor: (client: Client) => client.company?.name || ''
    },
    { key: 'position', type: 'string' },
    { key: 'email', type: 'string' },
    { key: 'phone', type: 'string' },
    {
      key: 'opportunities',
      type: 'number',
      accessor: (client: Client) => getClientActiveOpportunityCount(client.id)
    },
    {
      key: 'projects',
      type: 'number',
      accessor: (client: Client) => getClientActiveProjectCount(client.id)
    }
  ];

  const { sortedData: sortedCompanies, sortState: companySortState, handleSort: handleCompanySort } = useTableSort(filteredCompanies, companySortConfigs);
  const { sortedData: sortedClients, sortState: clientSortState, handleSort: handleClientSort } = useTableSort(filteredClients, clientSortConfigs);

  return (
    <Layout title="Customer Relationship Management" breadcrumbs={["CRM"]}>
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="glassmorphism">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Contacts</p>
                  <p className="text-2xl font-bold" data-testid="text-total-clients">
                    {clients?.length || 0}
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
                  <p className="text-sm font-medium text-muted-foreground">Total Companies</p>
                  <p className="text-2xl font-bold" data-testid="text-total-companies">
                    {companies?.length || 0}
                  </p>
                </div>
                <Building2 className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="glassmorphism">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Contacts</p>
                  <p className="text-2xl font-bold" data-testid="text-active-contacts">
                    {clients?.filter((c: any) => c.isActive).length || 0}
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
                  <p className="text-sm font-medium text-muted-foreground">Primary Contacts</p>
                  <p className="text-2xl font-bold" data-testid="text-primary-contacts">
                    {clients?.filter((c: any) => c.isPrimaryContact).length || 0}
                  </p>
                </div>
                <Users className="w-8 h-8 text-warning" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts, companies, positions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-80"
              data-testid="input-search-clients"
            />
          </div>
        </div>

        {/* Sales Pipeline */}
        <SalesPipeline />

        {/* Companies Section */}
        <Card className="glassmorphism">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Companies
            </CardTitle>
            <Dialog open={isAddCompanyDialogOpen} onOpenChange={setIsAddCompanyDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Company
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Company</DialogTitle>
                  <DialogDescription>
                    Add a new company to your CRM system.
                  </DialogDescription>
                </DialogHeader>
                <CompanyForm onSuccess={() => setIsAddCompanyDialogOpen(false)} />
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {companiesLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
              </div>
            ) : companies && companies.length > 0 ? (
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableTableHead
                        column="name"
                        currentSort={companySortState.column}
                        direction={companySortState.direction}
                        onSort={handleCompanySort}
                      >
                        Company
                      </SortableTableHead>
                      <SortableTableHead
                        column="industry"
                        currentSort={companySortState.column}
                        direction={companySortState.direction}
                        onSort={handleCompanySort}
                      >
                        Industry
                      </SortableTableHead>
                      <SortableTableHead
                        column="contacts"
                        currentSort={companySortState.column}
                        direction={companySortState.direction}
                        onSort={handleCompanySort}
                      >
                        Contacts
                      </SortableTableHead>
                      <SortableTableHead
                        column="opportunities"
                        currentSort={companySortState.column}
                        direction={companySortState.direction}
                        onSort={handleCompanySort}
                      >
                        Active Opportunities
                      </SortableTableHead>
                      <SortableTableHead
                        column="projects"
                        currentSort={companySortState.column}
                        direction={companySortState.direction}
                        onSort={handleCompanySort}
                      >
                        Active Projects
                      </SortableTableHead>
                      <SortableTableHead
                        column="size"
                        currentSort={companySortState.column}
                        direction={companySortState.direction}
                        onSort={handleCompanySort}
                      >
                        Size
                      </SortableTableHead>
                      <th className="text-right p-2">Actions</th>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedCompanies.map((company) => (
                      <TableRow key={company.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                              <Building2 className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                              <div
                                className="font-medium cursor-pointer hover:text-blue-600 hover:underline"
                                onClick={() => handleViewCompany(company)}
                              >
                                {company.name}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{company.industry || "—"}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium">{getContactCount(company.id)}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium">{getActiveOpportunityCount(company.id)}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium">{getActiveProjectCount(company.id)}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm capitalize">{company.size || "—"}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setEditingCompany(company)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setDeletingCompany(company)}
                                className="text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {sortedCompanies.length > 0 && (
                  <div className="text-center text-sm text-muted-foreground mt-2">
                    {sortedCompanies.length} {sortedCompanies.length === 1 ? 'company' : 'companies'} total
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No companies found. Add your first company to get started.</p>
                <Dialog open={isAddCompanyDialogOpen} onOpenChange={setIsAddCompanyDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="mt-4">
                      <Plus className="w-4 h-4 mr-2" />
                      Add First Company
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Add Your First Company</DialogTitle>
                    </DialogHeader>
                    <CompanyForm onSuccess={() => setIsAddCompanyDialogOpen(false)} />
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contacts Table */}
        <Card className="glassmorphism">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle>Clients</CardTitle>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-client">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Contact
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Contact</DialogTitle>
                </DialogHeader>
                <ClientForm onSuccess={() => setIsAddDialogOpen(false)} companies={companies} />
              </DialogContent>
            </Dialog>
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
                  {searchTerm ? "No contacts found matching your search" : "No contacts found. Add your first contact to get started."}
                </p>
                {!searchTerm && (
                  <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="mt-4" data-testid="button-add-first-client">
                        <Plus className="w-4 h-4 mr-2" />
                        Add First Contact
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Add Your First Contact</DialogTitle>
                      </DialogHeader>
                      <ClientForm onSuccess={() => setIsAddDialogOpen(false)} companies={companies} />
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                <div className="overflow-x-auto">
                  <table className="w-full" data-testid="table-clients">
                    <thead>
                      <tr className="border-b border-border">
                        <SortableHeader
                          column="name"
                          currentSort={clientSortState.column}
                          direction={clientSortState.direction}
                          onSort={handleClientSort}
                        >
                          Contact
                        </SortableHeader>
                        <SortableHeader
                          column="company"
                          currentSort={clientSortState.column}
                          direction={clientSortState.direction}
                          onSort={handleClientSort}
                        >
                          Company
                        </SortableHeader>
                        <SortableHeader
                          column="position"
                          currentSort={clientSortState.column}
                          direction={clientSortState.direction}
                          onSort={handleClientSort}
                        >
                          Position
                        </SortableHeader>
                        <SortableHeader
                          column="email"
                          currentSort={clientSortState.column}
                          direction={clientSortState.direction}
                          onSort={handleClientSort}
                        >
                          Email
                        </SortableHeader>
                        <SortableHeader
                          column="phone"
                          currentSort={clientSortState.column}
                          direction={clientSortState.direction}
                          onSort={handleClientSort}
                        >
                          Phone
                        </SortableHeader>
                        <SortableHeader
                          column="opportunities"
                          currentSort={clientSortState.column}
                          direction={clientSortState.direction}
                          onSort={handleClientSort}
                        >
                          Active Opportunities
                        </SortableHeader>
                        <SortableHeader
                          column="projects"
                          currentSort={clientSortState.column}
                          direction={clientSortState.direction}
                          onSort={handleClientSort}
                        >
                          Active Projects
                        </SortableHeader>
                        <th className="text-left text-sm font-medium text-muted-foreground py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {sortedClients.map((client: any, index: number) => (
                        <tr key={client.id} data-testid={`row-client-${index}`} className="hover:bg-muted/50">
                          <td className="py-4">
                            <div
                              className="font-medium text-foreground cursor-pointer hover:text-blue-600 hover:underline"
                              onClick={() => {setViewingClient(client); setIsViewClientDialogOpen(true);}}
                            >
                              {client.name}
                            </div>
                          </td>
                          <td className="py-4">
                            <div className="text-sm text-foreground">
                              {client.company?.name || '—'}
                            </div>
                          </td>
                          <td className="py-4">
                            <div className="text-sm text-foreground">
                              {client.position || 'Contact'}
                            </div>
                          </td>
                          <td className="py-4">
                            <div className="text-sm text-foreground">
                              {client.email || '—'}
                            </div>
                          </td>
                          <td className="py-4">
                            <div className="text-sm text-foreground">
                              {client.phone || '—'}
                            </div>
                          </td>
                          <td className="py-4">
                            <span className="text-sm font-medium">{getClientActiveOpportunityCount(client.id)}</span>
                          </td>
                          <td className="py-4">
                            <span className="text-sm font-medium">{getClientActiveProjectCount(client.id)}</span>
                          </td>
                          <td className="py-4" onClick={(e) => e.stopPropagation()}>
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
                                <DropdownMenuItem
                                  onClick={() => setDeletingClient(client)}
                                  data-testid={`button-delete-${index}`}
                                  className="text-destructive"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {sortedClients.length > 0 && (
                  <div className="text-center text-sm text-muted-foreground mt-2">
                    {sortedClients.length} {sortedClients.length === 1 ? 'client' : 'clients'} total
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Client Dialog */}
        {editingClient && (
          <Dialog open={!!editingClient} onOpenChange={() => setEditingClient(null)}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Contact: {editingClient.name}</DialogTitle>
              </DialogHeader>
              <ClientForm
                client={editingClient}
                onSuccess={() => setEditingClient(null)}
                companies={companies}
              />
            </DialogContent>
          </Dialog>
        )}

        {/* Delete Client Confirmation */}
        {deletingClient && (
          <AlertDialog open={!!deletingClient} onOpenChange={() => setDeletingClient(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Contact</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete {deletingClient.name}? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeletingClient(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleDeleteClient(deletingClient)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {/* View Company Details Dialog */}
        {viewingCompany && (
          <Dialog open={isViewCompanyDialogOpen} onOpenChange={setIsViewCompanyDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{viewingCompany.name}</DialogTitle>
                <DialogDescription>
                  Company details and information
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="font-medium">Company Name</label>
                    <div className="flex items-center space-x-2">
                      <Building2 className="w-4 h-4 text-blue-600" />
                      <span>{viewingCompany.name}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="font-medium">Industry</label>
                    <span>{viewingCompany.industry || "—"}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="font-medium">Company Size</label>
                    <span className="capitalize">{viewingCompany.size || "—"}</span>
                  </div>
                  <div className="space-y-2">
                    <label className="font-medium">Founded Year</label>
                    <span>{viewingCompany.foundedYear || "—"}</span>
                  </div>
                </div>

                {viewingCompany.website && (
                  <div className="space-y-2">
                    <label className="font-medium">Website</label>
                    <a
                      href={viewingCompany.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center"
                    >
                      <Globe className="w-4 h-4 mr-2" />
                      {viewingCompany.website}
                    </a>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="font-medium">Phone</label>
                    <div className="flex items-center space-x-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span>{viewingCompany.phone || "—"}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="font-medium">Email</label>
                    <div className="flex items-center space-x-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span>{viewingCompany.email || "—"}</span>
                    </div>
                  </div>
                </div>

                {viewingCompany.address && (
                  <div className="space-y-2">
                    <label className="font-medium">Address</label>
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span>{viewingCompany.address}</span>
                    </div>
                  </div>
                )}

                {viewingCompany.description && (
                  <div className="space-y-2">
                    <label className="font-medium">Description</label>
                    <p className="text-sm text-gray-600">{viewingCompany.description}</p>
                  </div>
                )}

                {viewingCompany.revenue && (
                  <div className="space-y-2">
                    <label className="font-medium">Annual Revenue</label>
                    <div className="mt-1">
                      <span>${parseInt(viewingCompany.revenue).toLocaleString()}</span>
                    </div>
                  </div>
                )}

                {viewingCompany.tags && viewingCompany.tags.length > 0 && (
                  <div className="space-y-2">
                    <label className="font-medium">Tags</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {viewingCompany.tags.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Business Activity - moved below tags */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="font-medium">Contacts</label>
                    <div className="mt-2">
                      <span className="text-lg font-semibold">{getContactCount(viewingCompany.id)}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="font-medium">Active Opportunities</label>
                    <div className="mt-2">
                      <span className="text-lg font-semibold">{getActiveOpportunityCount(viewingCompany.id)}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="font-medium">Active Projects</label>
                    <div className="mt-2">
                      <span className="text-lg font-semibold">{getActiveProjectCount(viewingCompany.id)}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
                  <div>
                    <label className="font-medium">Created</label>
                    <div className="mt-1">{new Date(viewingCompany.createdAt).toLocaleDateString()}</div>
                  </div>
                  <div>
                    <label className="font-medium">Last Updated</label>
                    <div className="mt-1">{new Date(viewingCompany.updatedAt).toLocaleDateString()}</div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsViewCompanyDialogOpen(false)}>
                  Close
                </Button>
                <div className="flex space-x-2">
                  <Button
                    variant="destructive"
                    onClick={() => handleDeleteCompanyFromView(viewingCompany)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                  <Button onClick={() => handleEditCompanyFromView(viewingCompany)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Edit Company Dialog */}
        {editingCompany && (
          <Dialog open={!!editingCompany} onOpenChange={() => setEditingCompany(null)}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Company: {editingCompany.name}</DialogTitle>
                <DialogDescription>
                  Update the company information below.
                </DialogDescription>
              </DialogHeader>
              <CompanyForm
                company={editingCompany}
                onSuccess={() => setEditingCompany(null)}
              />
            </DialogContent>
          </Dialog>
        )}

        {/* Delete Company Confirmation */}
        {deletingCompany && (
          <AlertDialog open={!!deletingCompany} onOpenChange={() => setDeletingCompany(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Company</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete {deletingCompany.name}? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeletingCompany(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleDeleteCompany(deletingCompany)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {/* View Client Details Dialog */}
        {viewingClient && (
          <Dialog open={isViewClientDialogOpen} onOpenChange={setIsViewClientDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{viewingClient.name}</DialogTitle>
                <DialogDescription>
                  Contact details and information
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="font-medium">Full Name</label>
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4 text-blue-600" />
                      <span>{viewingClient.name}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="font-medium">Position</label>
                    <div>
                      <span>{viewingClient.position || "—"}</span>
                    </div>
                  </div>
                </div>

                {viewingClient.company && (
                  <div className="space-y-2">
                    <label className="font-medium">Company</label>
                    <div className="flex items-center space-x-2">
                      <Building2 className="w-4 h-4 text-blue-600" />
                      <span className="font-medium">{viewingClient.company.name}</span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="font-medium">Email</label>
                    <div className="flex items-center space-x-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span>{viewingClient.email || "—"}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="font-medium">Phone</label>
                    <div className="flex items-center space-x-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span>{viewingClient.phone || "—"}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="font-medium">Department</label>
                    <div>
                      <span>{viewingClient.department || "—"}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="font-medium">Source</label>
                    <div>
                      <span className="capitalize">{viewingClient.source || "—"}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="font-medium">Notes</label>
                  <p className="text-sm text-gray-600">{viewingClient.notes || "—"}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="font-medium">Active Opportunities</label>
                    <div className="mt-2">
                      <span className="text-lg font-semibold">{getClientActiveOpportunityCount(viewingClient.id)}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="font-medium">Active Projects</label>
                    <div className="mt-2">
                      <span className="text-lg font-semibold">{getClientActiveProjectCount(viewingClient.id)}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
                  <div>
                    <label className="font-medium">Primary Contact</label>
                    <div className="mt-1">{viewingClient.isPrimaryContact ? 'Yes' : 'No'}</div>
                  </div>
                  <div>
                    <label className="font-medium">Status</label>
                    <div className="mt-1">{viewingClient.isActive ? 'Active' : 'Inactive'}</div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsViewClientDialogOpen(false)}>
                  Close
                </Button>
                <div className="flex space-x-2">
                  <Button
                    variant="destructive"
                    onClick={() => {setIsViewClientDialogOpen(false); setDeletingClient(viewingClient);}}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                  <Button onClick={() => {setIsViewClientDialogOpen(false); setEditingClient(viewingClient);}}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </Layout>
  );
}
