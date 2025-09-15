import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useQuery } from "@tanstack/react-query";
import type { Client } from "@shared/schema";
import { 
  Plus, 
  Search, 
  Users, 
  Building, 
  Mail, 
  Phone,
  MoreHorizontal,
  TrendingUp
} from "lucide-react";

export default function Clients() {
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

  const { data: clients, isLoading: clientsLoading, error } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
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
          <Button data-testid="button-add-client">
            <Plus className="w-4 h-4 mr-2" />
            Add Client
          </Button>
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
                  <Button className="mt-4" data-testid="button-add-first-client">
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Client
                  </Button>
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
                          <Button variant="ghost" size="sm" data-testid={`button-actions-${index}`}>
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
