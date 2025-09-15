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
import type { Invoice, Expense } from "@shared/schema";
import { 
  Plus, 
  Search, 
  DollarSign, 
  FileText,
  CreditCard,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Calendar,
  Download,
  MoreHorizontal
} from "lucide-react";

export default function Finance() {
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

  const { data: invoices, isLoading: invoicesLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
    enabled: isAuthenticated,
  });

  const { data: expenses, isLoading: expensesLoading } = useQuery<Expense[]>({
    queryKey: ["/api/expenses"],
    enabled: isAuthenticated,
  });

  if (isLoading || !isAuthenticated) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const getInvoiceStatusColor = (status: string) => {
    switch (status) {
      case "paid": return "default";
      case "sent": return "outline";
      case "overdue": return "destructive";
      case "draft": return "secondary";
      default: return "secondary";
    }
  };

  const totalRevenue = invoices?.reduce((sum: number, invoice: Invoice) => 
    sum + (invoice.status === 'paid' ? parseFloat(invoice.total || '0') : 0), 0) || 0;

  const totalExpenses = expenses?.reduce((sum: number, expense: Expense) => 
    sum + parseFloat(expense.amount || '0'), 0) || 0;

  const overdueInvoices = invoices?.filter((invoice: Invoice) => 
    invoice.status === 'overdue').length || 0;

  const filteredInvoices = invoices?.filter((invoice: Invoice) =>
    invoice.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const filteredExpenses = expenses?.filter((expense: Expense) =>
    expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    expense.category?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <Layout title="Financial Management" breadcrumbs={["Finance"]}>
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-80"
                data-testid="input-search-finance"
              />
            </div>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" data-testid="button-add-expense">
              <Plus className="w-4 h-4 mr-2" />
              Add Expense
            </Button>
            <Button data-testid="button-create-invoice">
              <FileText className="w-4 h-4 mr-2" />
              Create Invoice
            </Button>
          </div>
        </div>

        {/* Financial Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="glassmorphism">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold text-success" data-testid="text-total-revenue">
                    ${totalRevenue.toLocaleString()}
                  </p>
                </div>
                <div className="p-2 bg-success/10 rounded-lg">
                  <DollarSign className="w-6 h-6 text-success" />
                </div>
              </div>
              <div className="flex items-center space-x-1 text-sm text-success mt-2">
                <TrendingUp className="w-3 h-3" />
                <span>+12.5%</span>
              </div>
            </CardContent>
          </Card>

          <Card className="glassmorphism">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Expenses</p>
                  <p className="text-2xl font-bold text-destructive" data-testid="text-total-expenses">
                    ${totalExpenses.toLocaleString()}
                  </p>
                </div>
                <div className="p-2 bg-destructive/10 rounded-lg">
                  <CreditCard className="w-6 h-6 text-destructive" />
                </div>
              </div>
              <div className="flex items-center space-x-1 text-sm text-destructive mt-2">
                <TrendingDown className="w-3 h-3" />
                <span>+5.2%</span>
              </div>
            </CardContent>
          </Card>

          <Card className="glassmorphism">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Net Profit</p>
                  <p className="text-2xl font-bold text-primary" data-testid="text-net-profit">
                    ${(totalRevenue - totalExpenses).toLocaleString()}
                  </p>
                </div>
                <div className="p-2 bg-primary/10 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
              </div>
              <div className="flex items-center space-x-1 text-sm text-success mt-2">
                <TrendingUp className="w-3 h-3" />
                <span>+8.1%</span>
              </div>
            </CardContent>
          </Card>

          <Card className="glassmorphism">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Overdue Invoices</p>
                  <p className="text-2xl font-bold text-warning" data-testid="text-overdue-invoices">
                    {overdueInvoices}
                  </p>
                </div>
                <div className="p-2 bg-warning/10 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-warning" />
                </div>
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                Requires attention
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Financial Data Tabs */}
        <Tabs defaultValue="invoices" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="invoices" data-testid="tab-invoices">Invoices</TabsTrigger>
            <TabsTrigger value="expenses" data-testid="tab-expenses">Expenses</TabsTrigger>
            <TabsTrigger value="reports" data-testid="tab-reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="invoices" className="space-y-4">
            <Card className="glassmorphism">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Invoices</CardTitle>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {invoicesLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                  </div>
                ) : filteredInvoices.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      {searchTerm ? "No invoices found matching your search" : "No invoices found. Create your first invoice to get started."}
                    </p>
                    {!searchTerm && (
                      <Button className="mt-4" data-testid="button-create-first-invoice">
                        <Plus className="w-4 h-4 mr-2" />
                        Create First Invoice
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full" data-testid="table-invoices">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left text-sm font-medium text-muted-foreground py-3">Invoice #</th>
                          <th className="text-left text-sm font-medium text-muted-foreground py-3">Client</th>
                          <th className="text-left text-sm font-medium text-muted-foreground py-3">Amount</th>
                          <th className="text-left text-sm font-medium text-muted-foreground py-3">Status</th>
                          <th className="text-left text-sm font-medium text-muted-foreground py-3">Due Date</th>
                          <th className="text-left text-sm font-medium text-muted-foreground py-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredInvoices.map((invoice: any, index: number) => (
                          <tr key={invoice.id} data-testid={`row-invoice-${index}`}>
                            <td className="py-4">
                              <div className="font-medium text-foreground">{invoice.invoiceNumber}</div>
                            </td>
                            <td className="py-4">
                              <div className="text-sm text-foreground">Client {index + 1}</div>
                            </td>
                            <td className="py-4">
                              <div className="font-medium text-foreground">
                                ${parseFloat(invoice.total || 0).toLocaleString()}
                              </div>
                            </td>
                            <td className="py-4">
                              <Badge variant={getInvoiceStatusColor(invoice.status)} data-testid={`badge-status-${index}`}>
                                {invoice.status?.charAt(0).toUpperCase() + invoice.status?.slice(1)}
                              </Badge>
                            </td>
                            <td className="py-4">
                              <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                                <Calendar className="w-3 h-3" />
                                {invoice.dueDate 
                                  ? new Date(invoice.dueDate).toLocaleDateString()
                                  : 'Not set'
                                }
                              </div>
                            </td>
                            <td className="py-4">
                              <Button variant="ghost" size="sm" data-testid={`button-invoice-actions-${index}`}>
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
          </TabsContent>

          <TabsContent value="expenses" className="space-y-4">
            <Card className="glassmorphism">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Expenses</CardTitle>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {expensesLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                  </div>
                ) : filteredExpenses.length === 0 ? (
                  <div className="text-center py-8">
                    <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      {searchTerm ? "No expenses found matching your search" : "No expenses recorded yet."}
                    </p>
                    {!searchTerm && (
                      <Button className="mt-4" data-testid="button-add-first-expense">
                        <Plus className="w-4 h-4 mr-2" />
                        Add First Expense
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full" data-testid="table-expenses">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left text-sm font-medium text-muted-foreground py-3">Description</th>
                          <th className="text-left text-sm font-medium text-muted-foreground py-3">Category</th>
                          <th className="text-left text-sm font-medium text-muted-foreground py-3">Amount</th>
                          <th className="text-left text-sm font-medium text-muted-foreground py-3">Date</th>
                          <th className="text-left text-sm font-medium text-muted-foreground py-3">Billable</th>
                          <th className="text-left text-sm font-medium text-muted-foreground py-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredExpenses.map((expense: any, index: number) => (
                          <tr key={expense.id} data-testid={`row-expense-${index}`}>
                            <td className="py-4">
                              <div className="font-medium text-foreground">{expense.description}</div>
                            </td>
                            <td className="py-4">
                              <Badge variant="outline">{expense.category || 'Uncategorized'}</Badge>
                            </td>
                            <td className="py-4">
                              <div className="font-medium text-destructive">
                                ${parseFloat(expense.amount || 0).toLocaleString()}
                              </div>
                            </td>
                            <td className="py-4">
                              <div className="text-sm text-muted-foreground">
                                {new Date(expense.date).toLocaleDateString()}
                              </div>
                            </td>
                            <td className="py-4">
                              <Badge variant={expense.billable ? "default" : "secondary"}>
                                {expense.billable ? "Yes" : "No"}
                              </Badge>
                            </td>
                            <td className="py-4">
                              <Button variant="ghost" size="sm" data-testid={`button-expense-actions-${index}`}>
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
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="glassmorphism">
                <CardHeader>
                  <CardTitle>Financial Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="chart-container rounded-lg p-4 h-48 flex items-end justify-center">
                    <p className="text-muted-foreground">Revenue vs Expenses Chart</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Revenue</span>
                      <span className="font-medium text-success">${totalRevenue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Expenses</span>
                      <span className="font-medium text-destructive">${totalExpenses.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm font-medium">
                      <span>Net Profit</span>
                      <span className="text-primary">${(totalRevenue - totalExpenses).toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glassmorphism">
                <CardHeader>
                  <CardTitle>Quick Reports</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="w-4 h-4 mr-2" />
                    Profit & Loss Statement
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Cash Flow Report
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <CreditCard className="w-4 h-4 mr-2" />
                    Expense Report
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <DollarSign className="w-4 h-4 mr-2" />
                    Revenue Report
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
