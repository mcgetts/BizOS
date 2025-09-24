import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertInvoiceSchema, insertExpenseSchema } from "@shared/schema";
import type { Invoice, Expense, InsertInvoice, InsertExpense, Client, Project, User, TimeEntry } from "@shared/schema";
import { useTableSort, SortConfig } from "@/hooks/useTableSort";
import { SortableHeader } from "@/components/SortableHeader";
import { z } from "zod";
import {
  Plus,
  Search,
  DollarSign,
  PoundSterling,
  FileText,
  CreditCard,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Calendar,
  Download,
  MoreHorizontal,
  Edit,
  Trash2,
  Send,
  CheckCircle,
  Clock,
  XCircle,
  Receipt,
  Building2,
  User as UserIcon,
  Table,
  LayoutGrid,
  Target,
  BarChart3,
  PieChart,
  Calculator,
  Banknote,
  Settings,
  FolderOpen,
  Filter,
  RefreshCw
} from "lucide-react";

// Utility functions for precise decimal math
function toCents(poundAmount: string | number): number {
  const amount = typeof poundAmount === 'string' ? parseFloat(poundAmount || '0') : (poundAmount || 0);
  return Math.round(amount * 100);
}

function toPounds(centsAmount: number): number {
  return centsAmount / 100;
}

function addDecimal(amount1: string | number, amount2: string | number): string {
  const cents1 = toCents(amount1 || 0);
  const cents2 = toCents(amount2 || 0);
  return (toPounds(cents1 + cents2)).toFixed(2);
}

function sumAmounts(amounts: (string | number)[]): number {
  const totalCents = amounts.reduce((sum: number, amount) => sum + toCents(amount || 0), 0);
  return toPounds(totalCents);
}

// Combined interfaces from both Finance and Budget pages
interface ProjectBudget {
  id: string;
  projectId: string;
  categoryId: string;
  budgetedAmount: string;
  spentAmount: string;
  committedAmount: string;
  forecastAmount: string;
  category?: {
    name: string;
    categoryType: string;
  };
}

interface BudgetSummary {
  totalBudget: number;
  totalSpent: number;
  totalRevenue: number;
  profitMargin: number;
  activeProjects: number;
  overBudgetProjects: number;
}

interface FinancialOverview {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  outstandingInvoices: number;
  overdueInvoices: number;
  monthlyRevenue: number[];
  monthlyExpenses: number[];
}

// Form validation schemas
const invoiceFormSchema = insertInvoiceSchema.extend({
  amount: z.string().min(1, "Amount is required"),
  tax: z.string().optional().default("0"),
  total: z.string().min(1, "Total is required"),
  dueDate: z.string().optional(),
  paidAt: z.string().optional(),
}).omit({
  dueDate: true,
  paidAt: true,
}).extend({
  dueDate: z.string().optional(),
  paidAt: z.string().optional(),
});

const expenseFormSchema = insertExpenseSchema.extend({
  amount: z.string().min(1, "Amount is required"),
  date: z.string().min(1, "Date is required"),
}).omit({
  date: true,
}).extend({
  date: z.string().min(1, "Date is required"),
});

type InvoiceFormData = z.infer<typeof invoiceFormSchema>;
type ExpenseFormData = z.infer<typeof expenseFormSchema>;

export default function FinanceHub() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

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

  // Fetch financial data
  const { data: invoices, isLoading: invoicesLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
    enabled: isAuthenticated,
  });

  const { data: expenses, isLoading: expensesLoading } = useQuery<Expense[]>({
    queryKey: ["/api/expenses"],
    enabled: isAuthenticated,
  });

  const { data: projects, isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    enabled: isAuthenticated,
  });

  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    enabled: isAuthenticated,
  });

  const { data: budgetSummary } = useQuery<BudgetSummary>({
    queryKey: ["/api/budget/summary"],
    enabled: isAuthenticated,
  });

  // Calculate financial overview
  const financialOverview: FinancialOverview = {
    totalRevenue: sumAmounts((invoices || []).filter(i => i.status === 'paid').map(i => i.total)),
    totalExpenses: sumAmounts((expenses || []).map(e => e.amount)),
    netProfit: 0, // Will be calculated below
    profitMargin: 0, // Will be calculated below
    outstandingInvoices: (invoices || []).filter(i => i.status === 'sent').length,
    overdueInvoices: (invoices || []).filter(i => i.status === 'overdue').length,
    monthlyRevenue: [], // Simplified for now
    monthlyExpenses: [] // Simplified for now
  };

  financialOverview.netProfit = financialOverview.totalRevenue - financialOverview.totalExpenses;
  financialOverview.profitMargin = financialOverview.totalRevenue > 0
    ? (financialOverview.netProfit / financialOverview.totalRevenue) * 100
    : 0;

  if (isLoading || invoicesLoading || expensesLoading || projectsLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p>Loading financial data...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Finance Hub</h2>
          <div className="flex items-center space-x-2">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="invoicing">Invoicing</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="budgets">Budgets</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">£{financialOverview.totalRevenue.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">
                    <TrendingUp className="h-3 w-3 inline mr-1" />
                    +12% from last month
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">£{financialOverview.totalExpenses.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">
                    <TrendingDown className="h-3 w-3 inline mr-1" />
                    -5% from last month
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${financialOverview.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    £{financialOverview.netProfit.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {financialOverview.profitMargin.toFixed(1)}% margin
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{financialOverview.outstandingInvoices}</div>
                  <p className="text-xs text-muted-foreground">
                    {financialOverview.overdueInvoices} overdue
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="cursor-pointer hover:bg-accent" onClick={() => setIsInvoiceDialogOpen(true)}>
                <CardContent className="flex items-center p-4">
                  <FileText className="h-8 w-8 mr-3 text-blue-600" />
                  <div>
                    <p className="font-medium">Create Invoice</p>
                    <p className="text-sm text-muted-foreground">New client invoice</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:bg-accent" onClick={() => setIsExpenseDialogOpen(true)}>
                <CardContent className="flex items-center p-4">
                  <Receipt className="h-8 w-8 mr-3 text-green-600" />
                  <div>
                    <p className="font-medium">Add Expense</p>
                    <p className="text-sm text-muted-foreground">Record new expense</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:bg-accent">
                <CardContent className="flex items-center p-4">
                  <BarChart3 className="h-8 w-8 mr-3 text-purple-600" />
                  <div>
                    <p className="font-medium">View Reports</p>
                    <p className="text-sm text-muted-foreground">Financial analytics</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:bg-accent">
                <CardContent className="flex items-center p-4">
                  <Calculator className="h-8 w-8 mr-3 text-orange-600" />
                  <div>
                    <p className="font-medium">Budget Planning</p>
                    <p className="text-sm text-muted-foreground">Set project budgets</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Financial Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(invoices || []).slice(0, 5).map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between border-b pb-2">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-4 w-4 text-blue-600" />
                        <div>
                          <p className="font-medium">{invoice.invoiceNumber}</p>
                          <p className="text-sm text-muted-foreground">
                            {clients?.find(c => c.id === invoice.clientId)?.name || 'No client'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">£{invoice.total}</p>
                        <Badge variant={
                          invoice.status === 'paid' ? 'default' :
                          invoice.status === 'overdue' ? 'destructive' : 'secondary'
                        }>
                          {invoice.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Invoicing Tab */}
          <TabsContent value="invoicing" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Input
                  placeholder="Search invoices..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64"
                />
                <Button variant="outline">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
              </div>
              <Button onClick={() => setIsInvoiceDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Invoice
              </Button>
            </div>

            {/* Invoice List */}
            <Card>
              <CardHeader>
                <CardTitle>Invoices</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(invoices || []).map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="font-medium">{invoice.invoiceNumber}</p>
                          <p className="text-sm text-muted-foreground">
                            {clients?.find(c => c.id === invoice.clientId)?.name || 'No client'} •
                            {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'No due date'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="text-right">
                          <p className="font-medium">£{invoice.total}</p>
                          <Badge variant={
                            invoice.status === 'paid' ? 'default' :
                            invoice.status === 'overdue' ? 'destructive' : 'secondary'
                          }>
                            {invoice.status}
                          </Badge>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => {
                              setEditingInvoice(invoice);
                              setIsInvoiceDialogOpen(true);
                            }}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Send className="h-4 w-4 mr-2" />
                              Send
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Expenses Tab */}
          <TabsContent value="expenses" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Input
                  placeholder="Search expenses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64"
                />
                <Button variant="outline">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
              </div>
              <Button onClick={() => setIsExpenseDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Expense
              </Button>
            </div>

            {/* Expense List */}
            <Card>
              <CardHeader>
                <CardTitle>Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(expenses || []).map((expense) => (
                    <div key={expense.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Receipt className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="font-medium">{expense.description}</p>
                          <p className="text-sm text-muted-foreground">
                            {expense.category} • {new Date(expense.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="text-right">
                          <p className="font-medium">£{expense.amount}</p>
                          <Badge variant="outline">{expense.category}</Badge>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => {
                              setEditingExpense(expense);
                              setIsExpenseDialogOpen(true);
                            }}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Budgets Tab */}
          <TabsContent value="budgets" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">£{budgetSummary?.totalBudget?.toFixed(2) || '0.00'}</div>
                  <Progress value={75} className="mt-2" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">£{budgetSummary?.totalSpent?.toFixed(2) || '0.00'}</div>
                  <Progress value={60} className="mt-2" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
                  <FolderOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{budgetSummary?.activeProjects || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {budgetSummary?.overBudgetProjects || 0} over budget
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Profit Margin</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{budgetSummary?.profitMargin?.toFixed(1) || '0.0'}%</div>
                  <p className="text-xs text-muted-foreground">Above target</p>
                </CardContent>
              </Card>
            </div>

            {/* Project Budgets */}
            <Card>
              <CardHeader>
                <CardTitle>Project Budgets</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(projects || []).map((project) => {
                    const budgetAmount = Math.random() * 50000 + 10000; // Mock data
                    const spentAmount = budgetAmount * (Math.random() * 0.8 + 0.1);
                    const utilizationPercent = (spentAmount / budgetAmount) * 100;

                    return (
                      <div key={project.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">{project.name}</h4>
                            <Badge variant={utilizationPercent > 90 ? "destructive" : utilizationPercent > 75 ? "secondary" : "default"}>
                              {utilizationPercent.toFixed(1)}% used
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                            <span>£{spentAmount.toFixed(0)} / £{budgetAmount.toFixed(0)}</span>
                            <span>£{(budgetAmount - spentAmount).toFixed(0)} remaining</span>
                          </div>
                          <Progress value={utilizationPercent} className="h-2" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue vs Expenses</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mb-2" />
                    <p>Chart will be rendered here</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Expense Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    <PieChart className="h-12 w-12 mb-2" />
                    <p>Chart will be rendered here</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Reports */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="cursor-pointer hover:bg-accent">
                <CardContent className="flex items-center p-4">
                  <FileText className="h-8 w-8 mr-3 text-blue-600" />
                  <div>
                    <p className="font-medium">P&L Statement</p>
                    <p className="text-sm text-muted-foreground">Profit & Loss report</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:bg-accent">
                <CardContent className="flex items-center p-4">
                  <Receipt className="h-8 w-8 mr-3 text-green-600" />
                  <div>
                    <p className="font-medium">Expense Report</p>
                    <p className="text-sm text-muted-foreground">Detailed expenses</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:bg-accent">
                <CardContent className="flex items-center p-4">
                  <Calculator className="h-8 w-8 mr-3 text-purple-600" />
                  <div>
                    <p className="font-medium">Tax Summary</p>
                    <p className="text-sm text-muted-foreground">Tax calculations</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Dialogs for Invoice and Expense forms will be added here */}
        {/* For now, using simplified placeholder dialogs */}
        <Dialog open={isInvoiceDialogOpen} onOpenChange={setIsInvoiceDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Invoice</DialogTitle>
            </DialogHeader>
            <p>Invoice form will be implemented here</p>
          </DialogContent>
        </Dialog>

        <Dialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Expense</DialogTitle>
            </DialogHeader>
            <p>Expense form will be implemented here</p>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}