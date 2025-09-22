import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import type { Invoice, Expense, InsertInvoice, InsertExpense, Client, Project, User } from "@shared/schema";
import { useTableSort, SortConfig } from "@/hooks/useTableSort";
import { SortableHeader } from "@/components/SortableHeader";
import { z } from "zod";
import {
  Plus,
  Search,
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
  LayoutGrid
} from "lucide-react";

// Utility functions for precise decimal math (to avoid floating-point issues)
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

// Form validation schemas derived from shared schemas with UI extensions
const invoiceFormSchema = insertInvoiceSchema.extend({
  // Convert string inputs to appropriate types
  amount: z.string().min(1, "Amount is required"),
  tax: z.string().optional().default("0"),
  total: z.string().min(1, "Total is required"),
  // Convert date to string for HTML inputs
  dueDate: z.string().optional(),
  paidAt: z.string().optional(),
}).omit({
  // Remove server-handled date fields that conflict with string inputs
  dueDate: true,
  paidAt: true,
}).extend({
  // Add back as string inputs for forms
  dueDate: z.string().optional(),
  paidAt: z.string().optional(),
});

const expenseFormSchema = insertExpenseSchema.extend({
  // Convert string inputs to appropriate types
  amount: z.string().min(1, "Amount is required"),
  // Convert date to string for HTML inputs
  date: z.string().min(1, "Date is required"),
}).omit({
  // Remove server-handled date field
  date: true,
}).extend({
  // Add back as string input for forms
  date: z.string().min(1, "Date is required"),
});

type InvoiceFormData = z.infer<typeof invoiceFormSchema>;
type ExpenseFormData = z.infer<typeof expenseFormSchema>;

// Invoice Form Component
function InvoiceForm({
  invoice,
  onSuccess,
  isOpen = false,
  onOpenChange
}: {
  invoice?: Invoice;
  onSuccess: () => void;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const { toast } = useToast();
  
  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      invoiceNumber: invoice?.invoiceNumber || `INV-${Date.now()}`,
      clientId: invoice?.clientId || "none",
      projectId: invoice?.projectId || "none",
      amount: invoice?.amount || "0",
      tax: invoice?.tax || "0",
      total: invoice?.total || "0",
      status: invoice?.status || "draft",
      dueDate: invoice?.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : "",
      notes: invoice?.notes || "",
      terms: invoice?.terms || "",
    },
  });

  // Fetch clients for dropdown
  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  // Fetch projects for dropdown
  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  // Calculate total when amount or tax changes
  const watchedAmount = form.watch("amount");
  const watchedTax = form.watch("tax");
  
  useEffect(() => {
    const total = addDecimal(watchedAmount || "0", watchedTax || "0");
    form.setValue("total", total);
  }, [watchedAmount, watchedTax, form]);

  const createMutation = useMutation({
    mutationFn: async (data: InsertInvoice) => {
      const response = await apiRequest("POST", "/api/invoices", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: "Success", description: "Invoice created successfully" });
      onOpenChange?.(false);
      onSuccess();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create invoice", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<InsertInvoice>) => {
      const response = await apiRequest("PUT", `/api/invoices/${invoice?.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: "Success", description: "Invoice updated successfully" });
      onOpenChange?.(false);
      onSuccess();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update invoice", variant: "destructive" });
    },
  });

  const onSubmit = (data: InvoiceFormData) => {
    const submitData: InsertInvoice = {
      invoiceNumber: data.invoiceNumber,
      clientId: data.clientId && data.clientId.trim() !== "" && data.clientId !== "none" ? data.clientId : null,
      projectId: data.projectId && data.projectId.trim() !== "" && data.projectId !== "none" ? data.projectId : null,
      amount: data.amount,
      tax: data.tax || null,
      total: data.total,
      status: data.status || null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      paidAt: data.paidAt ? new Date(data.paidAt) : null,
      notes: data.notes || null,
      terms: data.terms || null,
    };

    if (invoice) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      {!invoice && (
        <DialogTrigger asChild>
          <Button data-testid="button-create-invoice">
            <FileText className="w-4 h-4 mr-2" />
            Create Invoice
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{invoice ? "Edit Invoice" : "Create New Invoice"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="invoiceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice Number *</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-invoice-number" />
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
                    <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger data-testid="select-invoice-status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="sent">Sent</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger data-testid="select-invoice-client">
                          <SelectValue placeholder="Select client" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No client</SelectItem>
                        {clients?.map((client) => (
                          <SelectItem key={client.id} value={client.id!}>
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
                control={form.control}
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger data-testid="select-invoice-project">
                          <SelectValue placeholder="Select project" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No project</SelectItem>
                        {projects?.map((project) => (
                          <SelectItem key={project.id} value={project.id!}>
                            {project.name}
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
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} data-testid="input-invoice-amount" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tax"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tax</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} data-testid="input-invoice-tax" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="total"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} readOnly data-testid="input-invoice-total" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-invoice-due-date" />
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
                    <Textarea placeholder="Additional notes..." {...field} value={field.value || ''} data-testid="textarea-invoice-notes" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="terms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Terms & Conditions</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Payment terms and conditions..." {...field} value={field.value || ''} data-testid="textarea-invoice-terms" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange?.(false)} data-testid="button-cancel-invoice">
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading} data-testid="button-save-invoice">
                {isLoading ? "Saving..." : invoice ? "Update Invoice" : "Create Invoice"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Expense Form Component
function ExpenseForm({
  expense,
  onSuccess,
  isOpen = false,
  onOpenChange
}: {
  expense?: Expense;
  onSuccess: () => void;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const { toast } = useToast();
  
  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      description: expense?.description || "",
      amount: expense?.amount || "0",
      category: expense?.category || "",
      projectId: expense?.projectId || "none",
      userId: expense?.userId || "none",
      date: expense?.date ? new Date(expense.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      billable: expense?.billable ?? false,
      reimbursed: expense?.reimbursed ?? false,
      receiptUrl: expense?.receiptUrl || "",
    },
  });

  // Fetch projects for dropdown
  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  // Fetch users for dropdown
  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertExpense) => {
      const response = await apiRequest("POST", "/api/expenses", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      toast({ title: "Success", description: "Expense created successfully" });
      onOpenChange?.(false);
      onSuccess();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create expense", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<InsertExpense>) => {
      const response = await apiRequest("PUT", `/api/expenses/${expense?.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      toast({ title: "Success", description: "Expense updated successfully" });
      onOpenChange?.(false);
      onSuccess();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update expense", variant: "destructive" });
    },
  });

  const onSubmit = (data: ExpenseFormData) => {
    const submitData: InsertExpense = {
      description: data.description,
      amount: data.amount,
      category: data.category || null,
      projectId: data.projectId && data.projectId.trim() !== "" && data.projectId !== "none" ? data.projectId : null,
      userId: data.userId && data.userId.trim() !== "" && data.userId !== "none" ? data.userId : null,
      date: new Date(data.date),
      billable: data.billable ?? false,
      reimbursed: data.reimbursed ?? false,
      receiptUrl: data.receiptUrl || null,
    };

    if (expense) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;
  const categories = ["travel", "meals", "supplies", "software", "equipment", "marketing", "training", "other"];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      {!expense && (
        <DialogTrigger asChild>
          <Button variant="outline" data-testid="button-add-expense">
            <Plus className="w-4 h-4 mr-2" />
            Add Expense
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{expense ? "Edit Expense" : "Add New Expense"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Description *</FormLabel>
                    <FormControl>
                      <Input placeholder="Office supplies, travel expenses, etc." {...field} data-testid="input-expense-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} data-testid="input-expense-amount" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger data-testid="select-expense-category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category.charAt(0).toUpperCase() + category.slice(1)}
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
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger data-testid="select-expense-project">
                          <SelectValue placeholder="Select project" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No project</SelectItem>
                        {projects?.map((project) => (
                          <SelectItem key={project.id} value={project.id!}>
                            {project.name}
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
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>User</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger data-testid="select-expense-user">
                          <SelectValue placeholder="Select user" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No user</SelectItem>
                        {users?.map((user) => (
                          <SelectItem key={user.id} value={user.id!}>
                            {user.firstName} {user.lastName}
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
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-expense-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="receiptUrl"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Receipt URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." {...field} value={field.value || ''} data-testid="input-expense-receipt" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="billable"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Billable to Client</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Can this expense be billed to client?
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value || false}
                        onCheckedChange={field.onChange}
                        data-testid="switch-expense-billable"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="reimbursed"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Reimbursed</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Has this expense been reimbursed?
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value || false}
                        onCheckedChange={field.onChange}
                        data-testid="switch-expense-reimbursed"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange?.(false)} data-testid="button-cancel-expense">
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading} data-testid="button-save-expense">
                {isLoading ? "Saving..." : expense ? "Update Expense" : "Add Expense"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Status Badge Component
function StatusBadge({ status, type }: { status: string, type: "invoice" | "expense" }) {
  const getVariant = (status: string, type: string) => {
    if (type === "invoice") {
      switch (status) {
        case "paid": return "default";
        case "sent": return "outline";
        case "overdue": return "destructive";
        case "cancelled": return "secondary";
        case "draft": return "secondary";
        default: return "secondary";
      }
    } else {
      return "outline";
    }
  };

  const getIcon = (status: string, type: string) => {
    if (type === "invoice") {
      switch (status) {
        case "paid": return <CheckCircle className="w-3 h-3" />;
        case "sent": return <Send className="w-3 h-3" />;
        case "overdue": return <AlertTriangle className="w-3 h-3" />;
        case "cancelled": return <XCircle className="w-3 h-3" />;
        case "draft": return <Clock className="w-3 h-3" />;
        default: return null;
      }
    }
    return null;
  };

  return (
    <Badge variant={getVariant(status, type)} className="flex items-center space-x-1">
      {getIcon(status, type)}
      <span>{status?.charAt(0).toUpperCase() + status?.slice(1)}</span>
    </Badge>
  );
}

// Invoice Card Component for Board View
function InvoiceCard({
  invoice,
  clients,
  projects,
  onEdit,
  onDelete
}: {
  invoice: Invoice;
  clients?: Client[];
  projects?: Project[];
  onEdit: (invoice: Invoice) => void;
  onDelete: (invoice: Invoice) => void;
}) {
  const client = clients?.find(c => c.id === invoice.clientId);
  const project = projects?.find(p => p.id === invoice.projectId);

  return (
    <Card className="mb-3 hover:shadow-md transition-shadow cursor-pointer">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h4 className="font-medium text-sm">{invoice.invoiceNumber}</h4>
            <p className="text-xs text-muted-foreground">{client?.name || 'No client'}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <MoreHorizontal className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(invoice)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(invoice)} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {project && (
          <p className="text-xs text-muted-foreground mb-2">{project.name}</p>
        )}
        <div className="flex items-center justify-between">
          <span className="font-bold text-lg">£{parseFloat(invoice.total || '0').toLocaleString()}</span>
        </div>
        {invoice.dueDate && (
          <div className="flex items-center space-x-1 text-xs text-muted-foreground mt-2">
            <Calendar className="w-3 h-3" />
            <span>Due {new Date(invoice.dueDate).toLocaleDateString()}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Expense Card Component for Board View
function ExpenseCard({
  expense,
  projects,
  onEdit,
  onDelete
}: {
  expense: Expense;
  projects?: Project[];
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
}) {
  const project = projects?.find(p => p.id === expense.projectId);

  return (
    <Card className="mb-3 hover:shadow-md transition-shadow cursor-pointer">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h4 className="font-medium text-sm line-clamp-2">{expense.description}</h4>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">{expense.category || 'Uncategorized'}</Badge>
              {expense.reimbursed && (
                <Badge variant="outline" className="text-xs">Reimbursed</Badge>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <MoreHorizontal className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(expense)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(expense)} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {project && (
          <p className="text-xs text-muted-foreground mb-2">{project.name}</p>
        )}
        <div className="flex items-center justify-between">
          <span className="font-bold text-lg text-destructive">£{parseFloat(expense.amount || '0').toLocaleString()}</span>
        </div>
        <div className="text-xs text-muted-foreground mt-2">
          {new Date(expense.date).toLocaleDateString()}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Finance() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "board">("table");
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

  const { data: invoices, isLoading: invoicesLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
    enabled: isAuthenticated,
  });

  const { data: expenses, isLoading: expensesLoading } = useQuery<Expense[]>({
    queryKey: ["/api/expenses"],
    enabled: isAuthenticated,
  });

  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    enabled: isAuthenticated,
  });

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    enabled: isAuthenticated,
  });

  // Delete mutations
  const deleteInvoiceMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/invoices/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: "Success", description: "Invoice deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete invoice", variant: "destructive" });
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/expenses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      toast({ title: "Success", description: "Expense deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete expense", variant: "destructive" });
    },
  });

  if (isLoading || !isAuthenticated) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Financial calculations with precise decimal math
  const paidInvoiceAmounts = invoices?.filter(inv => inv.status === 'paid').map(inv => inv.total || '0') || [];
  const totalRevenue = sumAmounts(paidInvoiceAmounts);

  const expenseAmounts = expenses?.map(exp => exp.amount || '0') || [];
  const totalExpenses = sumAmounts(expenseAmounts);

  const overdueInvoices = invoices?.filter((invoice: Invoice) => 
    invoice.status === 'overdue').length || 0;

  const sentInvoiceAmounts = invoices?.filter(inv => inv.status === 'sent').map(inv => inv.total || '0') || [];
  const pendingRevenue = sumAmounts(sentInvoiceAmounts);

  // Filtered data
  const filteredInvoices = invoices?.filter((invoice: Invoice) =>
    invoice.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    clients?.find(c => c.id === invoice.clientId)?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    projects?.find(p => p.id === invoice.projectId)?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const filteredExpenses = expenses?.filter((expense: Expense) =>
    expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    expense.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    projects?.find(p => p.id === expense.projectId)?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Invoice sorting configuration
  const invoiceSortConfigs: SortConfig[] = [
    { key: 'invoiceNumber', type: 'string' },
    {
      key: 'client',
      type: 'string',
      accessor: (invoice: Invoice) => clients?.find(c => c.id === invoice.clientId)?.name || ''
    },
    {
      key: 'project',
      type: 'string',
      accessor: (invoice: Invoice) => projects?.find(p => p.id === invoice.projectId)?.name || ''
    },
    { key: 'total', type: 'number' },
    {
      key: 'status',
      type: 'custom',
      customOrder: { draft: 0, sent: 1, paid: 2, overdue: 3 }
    },
    { key: 'dueDate', type: 'date' }
  ];

  // Expense sorting configuration
  const expenseSortConfigs: SortConfig[] = [
    { key: 'description', type: 'string' },
    { key: 'category', type: 'string' },
    {
      key: 'project',
      type: 'string',
      accessor: (expense: Expense) => projects?.find(p => p.id === expense.projectId)?.name || ''
    },
    { key: 'amount', type: 'number' },
    { key: 'date', type: 'date' },
    { key: 'status', type: 'string' }
  ];

  const { sortedData: sortedInvoices, sortState: invoiceSortState, handleSort: handleInvoiceSort } = useTableSort(filteredInvoices, invoiceSortConfigs);
  const { sortedData: sortedExpenses, sortState: expenseSortState, handleSort: handleExpenseSort } = useTableSort(filteredExpenses, expenseSortConfigs);

  return (
    <Layout title="Financial Management" breadcrumbs={["Finance"]}>
      <div className="space-y-6">
        {/* Financial Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="glassmorphism">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold text-success" data-testid="text-total-revenue">
                    £{totalRevenue.toLocaleString()}
                  </p>
                </div>
                <div className="p-2 bg-success/10 rounded-lg">
                  <PoundSterling className="w-6 h-6 text-success" />
                </div>
              </div>
              <div className="flex items-center space-x-1 text-sm text-success mt-2">
                <TrendingUp className="w-3 h-3" />
                <span>Paid invoices</span>
              </div>
            </CardContent>
          </Card>

          <Card className="glassmorphism">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending Revenue</p>
                  <p className="text-2xl font-bold text-warning" data-testid="text-pending-revenue">
                    £{pendingRevenue.toLocaleString()}
                  </p>
                </div>
                <div className="p-2 bg-warning/10 rounded-lg">
                  <Clock className="w-6 h-6 text-warning" />
                </div>
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                Awaiting payment
              </div>
            </CardContent>
          </Card>

          <Card className="glassmorphism">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Expenses</p>
                  <p className="text-2xl font-bold text-destructive" data-testid="text-total-expenses">
                    £{totalExpenses.toLocaleString()}
                  </p>
                </div>
                <div className="p-2 bg-destructive/10 rounded-lg">
                  <CreditCard className="w-6 h-6 text-destructive" />
                </div>
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                All recorded expenses
              </div>
            </CardContent>
          </Card>

          <Card className="glassmorphism">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Net Profit</p>
                  <p className="text-2xl font-bold text-primary" data-testid="text-net-profit">
                    £{(totalRevenue - totalExpenses).toLocaleString()}
                  </p>
                </div>
                <div className="p-2 bg-primary/10 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
              </div>
              <div className="flex items-center space-x-1 text-sm text-success mt-2">
                <TrendingUp className="w-3 h-3" />
                <span>Revenue - Expenses</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Overdue Invoices Alert */}
        {overdueInvoices > 0 && (
          <Card className="border-destructive bg-destructive/5">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 text-destructive">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-medium">
                  {overdueInvoices} overdue invoice{overdueInvoices !== 1 ? 's' : ''} requiring attention
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search Bar */}
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search invoices and expenses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-80"
              data-testid="input-search-finance"
            />
          </div>
        </div>

        {/* View Toggle with Action Buttons */}
        <div className="flex items-center justify-center gap-4">
          <div className="flex justify-center gap-2">
            <Button
              variant={viewMode === "board" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("board")}
              className="gap-2"
            >
              <LayoutGrid className="h-4 w-4" />
              Board
            </Button>
            <Button
              variant={viewMode === "table" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("table")}
              className="gap-2"
            >
              <Table className="h-4 w-4" />
              Table
            </Button>
          </div>
          <div className="flex space-x-2 ml-auto">
            <ExpenseForm onSuccess={() => {}} />
            <InvoiceForm onSuccess={() => {}} />
          </div>
        </div>

        {/* Financial Data Tabs */}
        <Tabs defaultValue="invoices" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="invoices" data-testid="tab-invoices">Invoices ({invoices?.length || 0})</TabsTrigger>
            <TabsTrigger value="expenses" data-testid="tab-expenses">Expenses ({expenses?.length || 0})</TabsTrigger>
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
                      <div className="mt-4">
                        <InvoiceForm onSuccess={() => {}} />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full" data-testid="table-invoices">
                      <thead>
                        <tr className="border-b border-border">
                          <SortableHeader
                            column="invoiceNumber"
                            currentSort={invoiceSortState.column}
                            direction={invoiceSortState.direction}
                            onSort={handleInvoiceSort}
                          >
                            Invoice #
                          </SortableHeader>
                          <SortableHeader
                            column="client"
                            currentSort={invoiceSortState.column}
                            direction={invoiceSortState.direction}
                            onSort={handleInvoiceSort}
                          >
                            Client
                          </SortableHeader>
                          <SortableHeader
                            column="project"
                            currentSort={invoiceSortState.column}
                            direction={invoiceSortState.direction}
                            onSort={handleInvoiceSort}
                          >
                            Project
                          </SortableHeader>
                          <SortableHeader
                            column="total"
                            currentSort={invoiceSortState.column}
                            direction={invoiceSortState.direction}
                            onSort={handleInvoiceSort}
                          >
                            Total
                          </SortableHeader>
                          <SortableHeader
                            column="status"
                            currentSort={invoiceSortState.column}
                            direction={invoiceSortState.direction}
                            onSort={handleInvoiceSort}
                          >
                            Status
                          </SortableHeader>
                          <SortableHeader
                            column="dueDate"
                            currentSort={invoiceSortState.column}
                            direction={invoiceSortState.direction}
                            onSort={handleInvoiceSort}
                          >
                            Due Date
                          </SortableHeader>
                          <th className="text-left text-sm font-medium text-muted-foreground py-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {sortedInvoices.map((invoice: Invoice, index: number) => {
                          const client = clients?.find(c => c.id === invoice.clientId);
                          const project = projects?.find(p => p.id === invoice.projectId);
                          
                          return (
                            <tr key={invoice.id} data-testid={`row-invoice-${index}`}>
                              <td className="py-4">
                                <div className="font-medium text-foreground">{invoice.invoiceNumber}</div>
                              </td>
                              <td className="py-4">
                                <div className="flex items-center space-x-2">
                                  <Building2 className="w-4 h-4 text-muted-foreground" />
                                  <span className="text-sm text-foreground">
                                    {client?.name || 'No client'}
                                  </span>
                                </div>
                              </td>
                              <td className="py-4">
                                <span className="text-sm text-muted-foreground">
                                  {project?.name || 'No project'}
                                </span>
                              </td>
                              <td className="py-4">
                                <div className="font-medium text-foreground">
                                  £{parseFloat(invoice.total || '0').toLocaleString()}
                                </div>
                              </td>
                              <td className="py-4">
                                <StatusBadge status={invoice.status || 'draft'} type="invoice" />
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
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" data-testid={`button-invoice-actions-${index}`}>
                                      <MoreHorizontal className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => setEditingInvoice(invoice)}>
                                      <Edit className="w-4 h-4 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <div className="flex items-center space-x-2 px-2 py-1.5 text-sm cursor-pointer hover:bg-accent w-full">
                                            <Trash2 className="w-4 h-4" />
                                            <span>Delete</span>
                                          </div>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              Are you sure you want to delete invoice {invoice.invoiceNumber}? This action cannot be undone.
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction
                                              onClick={() => deleteInvoiceMutation.mutate(invoice.id!)}
                                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                            >
                                              Delete
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </td>
                            </tr>
                          );
                        })}
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
                      <div className="mt-4">
                        <ExpenseForm onSuccess={() => {}} />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full" data-testid="table-expenses">
                      <thead>
                        <tr className="border-b border-border">
                          <SortableHeader
                            column="description"
                            currentSort={expenseSortState.column}
                            direction={expenseSortState.direction}
                            onSort={handleExpenseSort}
                          >
                            Description
                          </SortableHeader>
                          <SortableHeader
                            column="category"
                            currentSort={expenseSortState.column}
                            direction={expenseSortState.direction}
                            onSort={handleExpenseSort}
                          >
                            Category
                          </SortableHeader>
                          <SortableHeader
                            column="project"
                            currentSort={expenseSortState.column}
                            direction={expenseSortState.direction}
                            onSort={handleExpenseSort}
                          >
                            Project
                          </SortableHeader>
                          <SortableHeader
                            column="amount"
                            currentSort={expenseSortState.column}
                            direction={expenseSortState.direction}
                            onSort={handleExpenseSort}
                          >
                            Amount
                          </SortableHeader>
                          <SortableHeader
                            column="date"
                            currentSort={expenseSortState.column}
                            direction={expenseSortState.direction}
                            onSort={handleExpenseSort}
                          >
                            Date
                          </SortableHeader>
                          <SortableHeader
                            column="status"
                            currentSort={expenseSortState.column}
                            direction={expenseSortState.direction}
                            onSort={handleExpenseSort}
                          >
                            Status
                          </SortableHeader>
                          <th className="text-left text-sm font-medium text-muted-foreground py-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {sortedExpenses.map((expense: Expense, index: number) => {
                          const project = projects?.find(p => p.id === expense.projectId);
                          
                          return (
                            <tr key={expense.id} data-testid={`row-expense-${index}`}>
                              <td className="py-4">
                                <div className="font-medium text-foreground">{expense.description}</div>
                                {expense.receiptUrl && (
                                  <div className="flex items-center space-x-1 text-xs text-muted-foreground mt-1">
                                    <Receipt className="w-3 h-3" />
                                    <span>Receipt available</span>
                                  </div>
                                )}
                              </td>
                              <td className="py-4">
                                <Badge variant="outline">{expense.category || 'Uncategorized'}</Badge>
                              </td>
                              <td className="py-4">
                                <span className="text-sm text-muted-foreground">
                                  {project?.name || 'No project'}
                                </span>
                              </td>
                              <td className="py-4">
                                <div className="font-medium text-destructive">
                                  £{parseFloat(expense.amount || '0').toLocaleString()}
                                </div>
                              </td>
                              <td className="py-4">
                                <div className="text-sm text-muted-foreground">
                                  {new Date(expense.date).toLocaleDateString()}
                                </div>
                              </td>
                              <td className="py-4">
                                <div className="flex items-center space-x-2">
                                  <Badge variant={expense.billable ? "default" : "secondary"}>
                                    {expense.billable ? "Billable" : "Internal"}
                                  </Badge>
                                  {expense.reimbursed && (
                                    <Badge variant="outline" className="text-xs">
                                      Reimbursed
                                    </Badge>
                                  )}
                                </div>
                              </td>
                              <td className="py-4">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" data-testid={`button-expense-actions-${index}`}>
                                      <MoreHorizontal className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => setEditingExpense(expense)}>
                                      <Edit className="w-4 h-4 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <div className="flex items-center space-x-2 px-2 py-1.5 text-sm cursor-pointer hover:bg-accent w-full">
                                            <Trash2 className="w-4 h-4" />
                                            <span>Delete</span>
                                          </div>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>Delete Expense</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              Are you sure you want to delete this expense? This action cannot be undone.
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction
                                              onClick={() => deleteExpenseMutation.mutate(expense.id!)}
                                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                            >
                                              Delete
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Invoice Dialog */}
        {editingInvoice && (
          <InvoiceForm
            invoice={editingInvoice}
            isOpen={!!editingInvoice}
            onOpenChange={(open) => !open && setEditingInvoice(null)}
            onSuccess={() => setEditingInvoice(null)}
          />
        )}

        {/* Edit Expense Dialog */}
        {editingExpense && (
          <ExpenseForm
            expense={editingExpense}
            isOpen={!!editingExpense}
            onOpenChange={(open) => !open && setEditingExpense(null)}
            onSuccess={() => setEditingExpense(null)}
          />
        )}
      </div>
    </Layout>
  );
}