import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { DollarSign, Calendar, User, Building2, MoreVertical, MoreHorizontal, Plus, AlertCircle, Eye, Edit, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type SalesOpportunity = {
  id: string;
  title: string;
  description: string | null;
  companyId: string;
  contactId: string | null;
  assignedTo: string | null;
  stage: string;
  value: string;
  probability: number;
  source: string | null;
  priority: string;
  expectedCloseDate: string;
  lastActivityDate: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  company?: {
    id: string;
    name: string;
    industry: string | null;
  };
  contact?: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    position: string | null;
  };
  assignedUser?: {
    id: string;
    firstName: string;
    lastName: string;
  };
};

type Company = {
  id: string;
  name: string;
  industry: string | null;
};

type Client = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  companyId: string | null;
  position: string | null;
  department: string | null;
  isPrimaryContact: boolean | null;
  company?: {
    id: string;
    name: string;
    industry: string | null;
  };
};

type User = {
  id: string;
  firstName: string;
  lastName: string;
};

type CreateOpportunityForm = {
  title: string;
  description: string;
  companyId: string;
  contactId: string;
  assignedTo: string;
  stage: string;
  value: string;
  probability: number;
  expectedCloseDate: string;
  source: string;
  priority: string;
  tags: string[];
};

const stageConfig = [
  { key: "lead", label: "Lead", color: "bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100" },
  { key: "qualified", label: "Qualified", color: "bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-100" },
  { key: "proposal", label: "Proposal", color: "bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-100" },
  { key: "negotiation", label: "Negotiation", color: "bg-orange-100 dark:bg-orange-800 text-orange-800 dark:text-orange-100" },
  { key: "closed_won", label: "Closed Won", color: "bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-100" },
  { key: "closed_lost", label: "Closed Lost", color: "bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-100" },
];

const priorityColors = {
  low: "bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-100",
  medium: "bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-100",
  high: "bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-100",
};

type SortColumn = "title" | "company" | "stage" | "value" | "probability" | "closeDate" | "priority";
type SortDirection = "asc" | "desc" | null;

export function SalesPipeline() {
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [localOpportunities, setLocalOpportunities] = useState<SalesOpportunity[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<SalesOpportunity | null>(null);
  const [dragError, setDragError] = useState<string | null>(null);
  const [isOptimisticUpdate, setIsOptimisticUpdate] = useState(false);
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [editForm, setEditForm] = useState<CreateOpportunityForm>({
    title: "",
    description: "",
    companyId: "",
    contactId: "",
    assignedTo: "",
    stage: "lead",
    value: "",
    probability: 50,
    expectedCloseDate: "",
    source: "",
    priority: "medium",
    tags: [],
  });
  const [createForm, setCreateForm] = useState<CreateOpportunityForm>({
    title: "",
    description: "",
    companyId: "",
    contactId: "",
    assignedTo: "",
    stage: "lead",
    value: "",
    probability: 50,
    expectedCloseDate: "",
    source: "",
    priority: "medium",
    tags: [],
  });


  const { data: opportunities, isLoading } = useQuery<SalesOpportunity[]>({
    queryKey: ["/api/opportunities"],
  });

  const { data: companies } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  useEffect(() => {
    if (opportunities) {
      setLocalOpportunities(opportunities);
    }
  }, [opportunities]);

  const updateOpportunityMutation = useMutation({
    mutationFn: async ({ id, stage, originalStage }: { id: string; stage: string; originalStage?: string }) => {
      return apiRequest("PUT", `/api/opportunities/${id}`, { stage });
    },
    onSuccess: () => {
      setDragError(null);
      setIsOptimisticUpdate(false);
      queryClient.invalidateQueries({ queryKey: ['/api/opportunities'] });
    },
    onError: (error: any, variables) => {
      console.error('Failed to update opportunity:', error);
      setIsOptimisticUpdate(false);

      // Revert optimistic update to original stage
      if (variables.originalStage) {
        setLocalOpportunities(prev =>
          prev.map(opp =>
            opp.id === variables.id
              ? { ...opp, stage: variables.originalStage! }
              : opp
          )
        );
      }

      // Set user-friendly error message
      const errorMessage = error?.message?.includes('404')
        ? 'Opportunity not found. It may have been deleted.'
        : error?.message?.includes('403')
        ? 'You do not have permission to update this opportunity.'
        : error?.message?.includes('network')
        ? 'Network error. Please check your connection and try again.'
        : 'Failed to update opportunity. Please try again.';

      setDragError(errorMessage);

      // Clear error after 5 seconds
      setTimeout(() => setDragError(null), 5000);
    },
  });

  const createOpportunityMutation = useMutation({
    mutationFn: async (data: CreateOpportunityForm) => {
      return apiRequest("POST", "/api/opportunities", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/opportunities'] });
      setIsCreateDialogOpen(false);
      setCreateForm({
        title: "",
        description: "",
        companyId: "",
        contactId: "",
        assignedTo: "",
        stage: "lead",
        value: "",
        probability: 50,
        expectedCloseDate: "",
        source: "",
        priority: "medium",
        tags: [],
      });
    },
    onError: (error) => {
      console.error('Failed to create opportunity:', error);
    },
  });

  const editOpportunityMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateOpportunityForm> }) => {
      return apiRequest("PUT", `/api/opportunities/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/opportunities'] });
      setIsEditDialogOpen(false);
      setSelectedOpportunity(null);
    },
    onError: (error) => {
      console.error('Failed to update opportunity:', error);
    },
  });

  const deleteOpportunityMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/opportunities/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/opportunities'] });
    },
    onError: (error) => {
      console.error('Failed to delete opportunity:', error);
    },
  });

  const organizeByStage = (opportunities: SalesOpportunity[]) => {
    const organized: Record<string, SalesOpportunity[]> = {};

    stageConfig.forEach(stage => {
      organized[stage.key] = opportunities.filter(opp => opp.stage === stage.key);
    });

    return organized;
  };

  const calculateStageTotal = (stageOpportunities: SalesOpportunity[]) => {
    return stageOpportunities.reduce((sum, opp) => sum + parseFloat(opp.value || "0"), 0);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return "No date";
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    } catch (error) {
      console.warn("Invalid date format:", dateString);
      return "Invalid date";
    }
  };


  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!createForm.title.trim()) {
      alert("Title is required");
      return;
    }
    if (!createForm.companyId) {
      alert("Company is required");
      return;
    }
    if (!createForm.value || parseFloat(createForm.value) <= 0) {
      alert("Valid value is required");
      return;
    }
    if (!createForm.expectedCloseDate) {
      alert("Expected close date is required");
      return;
    }

    createOpportunityMutation.mutate(createForm);
  };

  const updateCreateForm = (field: keyof CreateOpportunityForm, value: any) => {
    setCreateForm(prev => ({ ...prev, [field]: value }));
  };

  const updateEditForm = (field: keyof CreateOpportunityForm, value: any) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const handleViewDetails = (opportunity: SalesOpportunity) => {
    setSelectedOpportunity(opportunity);
    setIsViewDialogOpen(true);
  };

  const handleEdit = (opportunity: SalesOpportunity) => {
    setSelectedOpportunity(opportunity);
    setEditForm({
      title: opportunity.title,
      description: opportunity.description || "",
      companyId: opportunity.companyId || "",
      contactId: opportunity.contactId || "",
      assignedTo: opportunity.assignedTo || "",
      stage: opportunity.stage,
      value: opportunity.value,
      probability: opportunity.probability,
      expectedCloseDate: opportunity.expectedCloseDate ? opportunity.expectedCloseDate.split('T')[0] : "",
      source: opportunity.source || "",
      priority: opportunity.priority,
      tags: opportunity.tags,
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (opportunity: SalesOpportunity) => {
    if (confirm(`Are you sure you want to delete "${opportunity.title}"?`)) {
      deleteOpportunityMutation.mutate(opportunity.id);
    }
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOpportunity) return;

    // Basic validation
    if (!editForm.title.trim()) {
      alert("Title is required");
      return;
    }
    if (!editForm.companyId) {
      alert("Company is required");
      return;
    }
    if (!editForm.value || parseFloat(editForm.value) <= 0) {
      alert("Valid value is required");
      return;
    }
    if (!editForm.expectedCloseDate) {
      alert("Expected close date is required");
      return;
    }

    editOpportunityMutation.mutate({
      id: selectedOpportunity.id,
      data: editForm,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading sales pipeline...</div>
      </div>
    );
  }

  const organizedOpportunities = organizeByStage(localOpportunities);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // Toggle through: asc -> desc -> null
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortDirection(null);
        setSortColumn(null);
      } else {
        setSortDirection("asc");
      }
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const getSortedOpportunities = (opportunities: SalesOpportunity[]) => {
    if (!sortColumn || !sortDirection) {
      return opportunities;
    }

    return [...opportunities].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortColumn) {
        case "title":
          aValue = a.title?.toLowerCase() || "";
          bValue = b.title?.toLowerCase() || "";
          break;
        case "company":
          aValue = a.company?.name?.toLowerCase() || "";
          bValue = b.company?.name?.toLowerCase() || "";
          break;
        case "stage":
          // Custom stage order
          const stageOrder = { lead: 0, qualified: 1, proposal: 2, negotiation: 3, closed_won: 4, closed_lost: 5 };
          aValue = stageOrder[a.stage as keyof typeof stageOrder] ?? 999;
          bValue = stageOrder[b.stage as keyof typeof stageOrder] ?? 999;
          break;
        case "value":
          aValue = parseFloat(a.value || "0");
          bValue = parseFloat(b.value || "0");
          break;
        case "probability":
          aValue = a.probability || 0;
          bValue = b.probability || 0;
          break;
        case "closeDate":
          aValue = new Date(a.expectedCloseDate).getTime();
          bValue = new Date(b.expectedCloseDate).getTime();
          break;
        case "priority":
          // Custom priority order
          const priorityOrder = { low: 0, medium: 1, high: 2 };
          aValue = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 999;
          bValue = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 999;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) {
        return sortDirection === "asc" ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortDirection === "asc" ? 1 : -1;
      }
      return 0;
    });
  };

  const SortableHeader = ({ column, children }: { column: SortColumn; children: React.ReactNode }) => (
    <th
      className="text-left p-4 font-medium text-gray-900 dark:text-gray-100 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none"
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center space-x-1">
        <span>{children}</span>
        <div className="flex flex-col">
          <ChevronUp
            className={`w-3 h-3 ${sortColumn === column && sortDirection === "asc" ? "text-blue-600" : "text-gray-300"}`}
          />
          <ChevronDown
            className={`w-3 h-3 -mt-1 ${sortColumn === column && sortDirection === "desc" ? "text-blue-600" : "text-gray-300"}`}
          />
        </div>
      </div>
    </th>
  );

  const handleDragEnd = (result: any) => {
    const { destination, source, draggableId } = result;

    // Clear any existing errors
    setDragError(null);

    // Validation: Check if destination exists
    if (!destination) {
      return;
    }

    // Validation: Check if item was actually moved
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }

    // Validation: Find the opportunity being moved
    const opportunity = localOpportunities.find(opp => opp.id === draggableId);
    if (!opportunity) {
      setDragError('Opportunity not found. Please refresh the page.');
      return;
    }

    // Validation: Check if destination stage is valid
    const validStages = stageConfig.map(stage => stage.key);
    if (!validStages.includes(destination.droppableId)) {
      setDragError('Invalid stage selected. Please try again.');
      return;
    }

    // Business logic validation: Prevent moving closed opportunities
    if (opportunity.stage === 'closed_won' || opportunity.stage === 'closed_lost') {
      setDragError('Closed opportunities cannot be moved to other stages.');
      return;
    }

    // Business logic validation: Warn about moving to closed stages
    if ((destination.droppableId === 'closed_won' || destination.droppableId === 'closed_lost') &&
        !confirm(`Are you sure you want to mark "${opportunity.title}" as ${destination.droppableId === 'closed_won' ? 'won' : 'lost'}?`)) {
      return;
    }

    const originalStage = opportunity.stage;

    // Set optimistic update flag
    setIsOptimisticUpdate(true);

    // Update local state immediately for optimistic UI
    const updatedOpportunities = localOpportunities.map(opp =>
      opp.id === draggableId
        ? { ...opp, stage: destination.droppableId, lastActivityDate: new Date().toISOString() }
        : opp
    );
    setLocalOpportunities(updatedOpportunities);

    // Update backend
    updateOpportunityMutation.mutate({
      id: draggableId,
      stage: destination.droppableId,
      originalStage: originalStage
    });
  };

  const header = (
    <div className="flex items-center justify-between relative">
      <h2 className="text-2xl font-bold">Sales Pipeline</h2>

      {/* Centered View Toggle Buttons */}
      <div className="absolute left-1/2 transform -translate-x-1/2 flex space-x-2">
        <Button
          variant={viewMode === "table" ? "default" : "outline"}
          onClick={() => setViewMode("table")}
        >
          Table
        </Button>
        <Button
          variant={viewMode === "kanban" ? "default" : "outline"}
          onClick={() => setViewMode("kanban")}
        >
          Board
        </Button>
      </div>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogTrigger asChild>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Opportunity
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create New Opportunity</DialogTitle>
            <DialogDescription>
              Add a new sales opportunity to your pipeline. Fill in the details below.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={createForm.title}
                    onChange={(e) => updateCreateForm("title", e.target.value)}
                    placeholder="e.g., Website Redesign Project"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="value">Value *</Label>
                  <Input
                    id="value"
                    type="number"
                    step="0.01"
                    value={createForm.value}
                    onChange={(e) => updateCreateForm("value", e.target.value)}
                    placeholder="10000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={createForm.description}
                  onChange={(e) => updateCreateForm("description", e.target.value)}
                  placeholder="Describe the opportunity..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company">Company *</Label>
                  <Select
                    value={createForm.companyId}
                    onValueChange={(value) => updateCreateForm("companyId", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select company" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies?.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact">Contact</Label>
                  <Select
                    value={createForm.contactId}
                    onValueChange={(value) => updateCreateForm("contactId", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select contact" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients?.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name} {client.position && `- ${client.position}`} {client.company?.name && `(${client.company.name})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stage">Stage</Label>
                  <Select
                    value={createForm.stage}
                    onValueChange={(value) => updateCreateForm("stage", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {stageConfig.map((stage) => (
                        <SelectItem key={stage.key} value={stage.key}>
                          {stage.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={createForm.priority}
                    onValueChange={(value) => updateCreateForm("priority", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="probability">Probability (%)</Label>
                  <Input
                    id="probability"
                    type="number"
                    min="0"
                    max="100"
                    value={createForm.probability}
                    onChange={(e) => updateCreateForm("probability", parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expectedCloseDate">Expected Close Date *</Label>
                  <Input
                    id="expectedCloseDate"
                    type="date"
                    value={createForm.expectedCloseDate}
                    onChange={(e) => updateCreateForm("expectedCloseDate", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assignedTo">Assigned To</Label>
                  <Select
                    value={createForm.assignedTo}
                    onValueChange={(value) => updateCreateForm("assignedTo", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                    <SelectContent>
                      {users?.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.firstName} {user.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="source">Source</Label>
                <Select
                  value={createForm.source}
                  onValueChange={(value) => updateCreateForm("source", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="referral">Referral</SelectItem>
                    <SelectItem value="website">Website</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="cold_outreach">Cold Outreach</SelectItem>
                    <SelectItem value="social_media">Social Media</SelectItem>
                    <SelectItem value="trade_show">Trade Show</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createOpportunityMutation.isPending}
              >
                {createOpportunityMutation.isPending ? "Creating..." : "Create Opportunity"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );

  if (viewMode === "table") {
    // Apply sorting to the opportunities
    const sortedOpportunities = getSortedOpportunities(localOpportunities);

    // Debug logging
    console.log("Table view - localOpportunities:", localOpportunities.length);
    console.log("Table view - sortedOpportunities:", sortedOpportunities.length);

    return (
      <div className="space-y-4">
        {header}


        {/* Results Summary */}
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>
            Showing {sortedOpportunities.length} opportunities {sortColumn && sortDirection && (
              <span className="text-blue-600">
                (sorted by {sortColumn} {sortDirection === "asc" ? "↑" : "↓"})
              </span>
            )}
          </span>
          <span>
            Total Value: {formatCurrency(sortedOpportunities.reduce((sum, opp) => sum + parseFloat(opp.value || "0"), 0))}
          </span>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                <tr>
                  <SortableHeader column="title">Opportunity</SortableHeader>
                  <SortableHeader column="company">Company</SortableHeader>
                  <SortableHeader column="stage">Stage</SortableHeader>
                  <SortableHeader column="value">Value</SortableHeader>
                  <SortableHeader column="probability">Probability</SortableHeader>
                  <SortableHeader column="closeDate">Close Date</SortableHeader>
                  <SortableHeader column="priority">Priority</SortableHeader>
                  <th className="text-left p-4 font-medium text-gray-900 dark:text-gray-100 w-[100px]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedOpportunities.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-gray-500 dark:text-gray-400">
                      No opportunities found.
                    </td>
                  </tr>
                ) : (
                  sortedOpportunities.map((opportunity) => {
                    // Safety checks
                    if (!opportunity || !opportunity.id) {
                      console.warn("Invalid opportunity data:", opportunity);
                      return null;
                    }

                    return (
                    <tr key={opportunity.id} className="border-t hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="p-4">
                        <div
                          className="font-medium cursor-pointer hover:text-blue-600 hover:underline"
                          onClick={() => handleViewDetails(opportunity)}
                        >
                          {opportunity.title}
                        </div>
                        <div className="text-sm text-gray-500">{opportunity.description}</div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <Building2 className="w-4 h-4 text-gray-400" />
                          <span>{opportunity.company?.name || "No Company"}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge
                          className={stageConfig.find(s => s.key === opportunity.stage)?.color}
                          variant="outline"
                        >
                          {stageConfig.find(s => s.key === opportunity.stage)?.label}
                        </Badge>
                      </td>
                      <td className="p-4 font-medium">
                        {formatCurrency(parseFloat(opportunity.value || "0"))}
                      </td>
                      <td className="p-4">{opportunity.probability}%</td>
                      <td className="p-4">{formatDate(opportunity.expectedCloseDate)}</td>
                      <td className="p-4">
                        <Badge
                          className={priorityColors[opportunity.priority as keyof typeof priorityColors]}
                          variant="outline"
                        >
                          {opportunity.priority}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewDetails(opportunity)}>
                              <Eye className="w-4 h-4 mr-2" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(opportunity)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(opportunity)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {sortedOpportunities.length > 10 && (
            <div className="text-center text-xs text-gray-500 dark:text-gray-400 py-2 border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
              Showing {Math.min(10, sortedOpportunities.length)} of {sortedOpportunities.length} opportunities - scroll to see all
            </div>
          )}
        </div>

        {/* View Details Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{selectedOpportunity?.title}</DialogTitle>
              <DialogDescription>
                Opportunity details and information
              </DialogDescription>
            </DialogHeader>
            {selectedOpportunity && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-medium">Company</Label>
                    <div className="flex items-center space-x-2">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      <span>{selectedOpportunity.company?.name || "No company"}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-medium">Value</Label>
                    <div className="flex items-center space-x-2">
                      <DollarSign className="w-4 h-4 text-green-600" />
                      <span className="font-medium">{formatCurrency(parseFloat(selectedOpportunity.value))}</span>
                    </div>
                  </div>
                </div>

                {selectedOpportunity.description && (
                  <div className="space-y-2">
                    <Label className="font-medium">Description</Label>
                    <p className="text-sm text-gray-600">{selectedOpportunity.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="font-medium">Stage</Label>
                    <Badge
                      className={stageConfig.find(s => s.key === selectedOpportunity.stage)?.color}
                      variant="outline"
                    >
                      {stageConfig.find(s => s.key === selectedOpportunity.stage)?.label}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-medium">Priority</Label>
                    <Badge
                      className={priorityColors[selectedOpportunity.priority as keyof typeof priorityColors]}
                      variant="outline"
                    >
                      {selectedOpportunity.priority}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-medium">Probability</Label>
                    <span>{selectedOpportunity.probability}%</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-medium">Expected Close Date</Label>
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span>{formatDate(selectedOpportunity.expectedCloseDate)}</span>
                    </div>
                  </div>
                  {selectedOpportunity.assignedUser && (
                    <div className="space-y-2">
                      <Label className="font-medium">Assigned To</Label>
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span>{selectedOpportunity.assignedUser.firstName} {selectedOpportunity.assignedUser.lastName}</span>
                      </div>
                    </div>
                  )}
                </div>

                {selectedOpportunity.contact && (
                  <div className="space-y-2">
                    <Label className="font-medium">Contact</Label>
                    <div className="text-sm">
                      <div>{selectedOpportunity.contact.name} {selectedOpportunity.contact.position && `- ${selectedOpportunity.contact.position}`}</div>
                      <div className="text-gray-500">
                        {selectedOpportunity.contact.email}
                        {selectedOpportunity.company?.name && (
                          <span className="ml-2 text-xs">at {selectedOpportunity.company.name}</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {selectedOpportunity.source && (
                  <div className="space-y-2">
                    <Label className="font-medium">Source</Label>
                    <span className="capitalize">{selectedOpportunity.source.replace('_', ' ')}</span>
                  </div>
                )}

                {selectedOpportunity.tags.length > 0 && (
                  <div className="space-y-2">
                    <Label className="font-medium">Tags</Label>
                    <div className="flex flex-wrap gap-1">
                      {selectedOpportunity.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
                  <div>
                    <Label className="font-medium">Created</Label>
                    <div>{new Date(selectedOpportunity.createdAt).toLocaleDateString()}</div>
                  </div>
                  <div>
                    <Label className="font-medium">Last Updated</Label>
                    <div>{new Date(selectedOpportunity.updatedAt).toLocaleDateString()}</div>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                Close
              </Button>
              <div className="flex space-x-2">
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (selectedOpportunity) {
                      setIsViewDialogOpen(false);
                      handleDelete(selectedOpportunity);
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
                <Button onClick={() => {
                  if (selectedOpportunity) {
                    setIsViewDialogOpen(false);
                    handleEdit(selectedOpportunity);
                  }
                }}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Edit Opportunity</DialogTitle>
              <DialogDescription>
                Update the opportunity details below.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-title">Title *</Label>
                    <Input
                      id="edit-title"
                      value={editForm.title}
                      onChange={(e) => updateEditForm("title", e.target.value)}
                      placeholder="e.g., Website Redesign Project"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-value">Value *</Label>
                    <Input
                      id="edit-value"
                      type="number"
                      step="0.01"
                      value={editForm.value}
                      onChange={(e) => updateEditForm("value", e.target.value)}
                      placeholder="10000"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={editForm.description}
                    onChange={(e) => updateEditForm("description", e.target.value)}
                    placeholder="Describe the opportunity..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-company">Company *</Label>
                    <Select
                      value={editForm.companyId}
                      onValueChange={(value) => updateEditForm("companyId", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select company" />
                      </SelectTrigger>
                      <SelectContent>
                        {companies?.map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-contact">Contact</Label>
                    <Select
                      value={editForm.contactId}
                      onValueChange={(value) => updateEditForm("contactId", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select contact" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients?.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name} {client.position && `- ${client.position}`} {client.company?.name && `(${client.company.name})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-stage">Stage</Label>
                    <Select
                      value={editForm.stage}
                      onValueChange={(value) => updateEditForm("stage", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {stageConfig.map((stage) => (
                          <SelectItem key={stage.key} value={stage.key}>
                            {stage.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-priority">Priority</Label>
                    <Select
                      value={editForm.priority}
                      onValueChange={(value) => updateEditForm("priority", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-probability">Probability (%)</Label>
                    <Input
                      id="edit-probability"
                      type="number"
                      min="0"
                      max="100"
                      value={editForm.probability}
                      onChange={(e) => updateEditForm("probability", parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-expectedCloseDate">Expected Close Date *</Label>
                    <Input
                      id="edit-expectedCloseDate"
                      type="date"
                      value={editForm.expectedCloseDate}
                      onChange={(e) => updateEditForm("expectedCloseDate", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-assignedTo">Assigned To</Label>
                    <Select
                      value={editForm.assignedTo}
                      onValueChange={(value) => updateEditForm("assignedTo", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select user" />
                      </SelectTrigger>
                      <SelectContent>
                        {users?.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.firstName} {user.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-source">Source</Label>
                  <Select
                    value={editForm.source}
                    onValueChange={(value) => updateEditForm("source", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="referral">Referral</SelectItem>
                      <SelectItem value="website">Website</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="cold_outreach">Cold Outreach</SelectItem>
                      <SelectItem value="social_media">Social Media</SelectItem>
                      <SelectItem value="trade_show">Trade Show</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={editOpportunityMutation.isPending}
                >
                  {editOpportunityMutation.isPending ? "Updating..." : "Update Opportunity"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {header}

      {/* Error Display */}
      {dragError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-2">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-red-800 font-medium">Drag Operation Failed</p>
            <p className="text-red-600 text-sm">{dragError}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDragError(null)}
            className="text-red-600 hover:text-red-800"
          >
            ×
          </Button>
        </div>
      )}

      {/* Loading indicator for optimistic updates */}
      {isOptimisticUpdate && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center space-x-2">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-blue-800 text-sm">Updating opportunity...</p>
        </div>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {stageConfig.map((stage) => {
            const stageOpportunities = organizedOpportunities[stage.key];
            const stageTotal = calculateStageTotal(stageOpportunities);

            return (
              <div key={stage.key} className="flex flex-col">
                <div className={`${stage.color} p-3 rounded-t-lg border-b`}>
                  <div className="font-medium text-sm">{stage.label}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-300">
                    {stageOpportunities.length} deals • {formatCurrency(stageTotal)}
                  </div>
                </div>

                <Droppable droppableId={stage.key}>
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="flex-1 p-2 bg-gray-50 dark:bg-gray-800 rounded-b-lg space-y-2 min-h-[140px]"
                    >
                      {stageOpportunities.map((opportunity, index) => (
                        <Draggable
                          key={opportunity.id}
                          draggableId={opportunity.id}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <Card
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`cursor-pointer transition-shadow hover:shadow-md ${
                                snapshot.isDragging ? "shadow-lg" : ""
                              }`}
                            >
                              <CardHeader className="p-3">
                                <div className="flex items-start justify-between">
                                  <CardTitle
                                    className="text-sm font-medium leading-tight cursor-pointer hover:text-blue-600 hover:underline"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleViewDetails(opportunity);
                                    }}
                                  >
                                    {opportunity.title}
                                  </CardTitle>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                        <MoreVertical className="h-3 w-3" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => handleViewDetails(opportunity)}>
                                        View Details
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleEdit(opportunity)}>
                                        Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => handleDelete(opportunity)}
                                        className="text-red-600"
                                      >
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </CardHeader>
                              <CardContent className="p-3 pt-0 space-y-2">
                                <div className="flex items-center text-xs text-gray-600">
                                  <Building2 className="w-3 h-3 mr-1" />
                                  <span className="truncate">{opportunity.company?.name}</span>
                                </div>

                                <div className="flex items-center justify-between text-xs">
                                  <div className="flex items-center text-green-600 font-medium">
                                    <DollarSign className="w-3 h-3 mr-1" />
                                    {formatCurrency(parseFloat(opportunity.value))}
                                  </div>
                                  <div className="text-gray-500">
                                    {opportunity.probability}%
                                  </div>
                                </div>

                                <div className="flex items-center justify-between text-xs">
                                  <div className="flex items-center text-gray-500">
                                    <Calendar className="w-3 h-3 mr-1" />
                                    {formatDate(opportunity.expectedCloseDate)}
                                  </div>
                                  <Badge
                                    className={`${priorityColors[opportunity.priority as keyof typeof priorityColors]} text-xs px-1 py-0`}
                                    variant="outline"
                                  >
                                    {opportunity.priority}
                                  </Badge>
                                </div>

                              </CardContent>
                            </Card>
                          )}
                        </Draggable>
                      ))}
                      {stageOpportunities.length > 5 && (
                        <div className="text-center text-xs text-gray-500 dark:text-gray-400 py-2 px-2 mt-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded sticky bottom-0">
                          {stageOpportunities.length} deals • Scroll to see all
                        </div>
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {/* View Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{selectedOpportunity?.title}</DialogTitle>
            <DialogDescription>
              Opportunity details and information
            </DialogDescription>
          </DialogHeader>
          {selectedOpportunity && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-medium">Company</Label>
                  <div className="flex items-center space-x-2">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <span>{selectedOpportunity.company?.name || "No company"}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="font-medium">Value</Label>
                  <div className="flex items-center space-x-2">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    <span className="font-medium">{formatCurrency(parseFloat(selectedOpportunity.value))}</span>
                  </div>
                </div>
              </div>

              {selectedOpportunity.description && (
                <div className="space-y-2">
                  <Label className="font-medium">Description</Label>
                  <p className="text-sm text-gray-600">{selectedOpportunity.description}</p>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="font-medium">Stage</Label>
                  <Badge
                    className={stageConfig.find(s => s.key === selectedOpportunity.stage)?.color}
                    variant="outline"
                  >
                    {stageConfig.find(s => s.key === selectedOpportunity.stage)?.label}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <Label className="font-medium">Priority</Label>
                  <Badge
                    className={priorityColors[selectedOpportunity.priority as keyof typeof priorityColors]}
                    variant="outline"
                  >
                    {selectedOpportunity.priority}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <Label className="font-medium">Probability</Label>
                  <span>{selectedOpportunity.probability}%</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-medium">Expected Close Date</Label>
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span>{formatDate(selectedOpportunity.expectedCloseDate)}</span>
                  </div>
                </div>
                {selectedOpportunity.assignedUser && (
                  <div className="space-y-2">
                    <Label className="font-medium">Assigned To</Label>
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span>{selectedOpportunity.assignedUser.firstName} {selectedOpportunity.assignedUser.lastName}</span>
                    </div>
                  </div>
                )}
              </div>

              {selectedOpportunity.contact && (
                <div className="space-y-2">
                  <Label className="font-medium">Contact</Label>
                  <div className="text-sm">
                    <div>{selectedOpportunity.contact.name} {selectedOpportunity.contact.position && `- ${selectedOpportunity.contact.position}`}</div>
                    <div className="text-gray-500">
                      {selectedOpportunity.contact.email}
                      {selectedOpportunity.company?.name && (
                        <span className="ml-2 text-xs">at {selectedOpportunity.company.name}</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {selectedOpportunity.source && (
                <div className="space-y-2">
                  <Label className="font-medium">Source</Label>
                  <span className="capitalize">{selectedOpportunity.source.replace('_', ' ')}</span>
                </div>
              )}

              {selectedOpportunity.tags.length > 0 && (
                <div className="space-y-2">
                  <Label className="font-medium">Tags</Label>
                  <div className="flex flex-wrap gap-1">
                    {selectedOpportunity.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
                <div>
                  <Label className="font-medium">Created</Label>
                  <div>{new Date(selectedOpportunity.createdAt).toLocaleDateString()}</div>
                </div>
                <div>
                  <Label className="font-medium">Last Updated</Label>
                  <div>{new Date(selectedOpportunity.updatedAt).toLocaleDateString()}</div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
            <div className="flex space-x-2">
              <Button
                variant="destructive"
                onClick={() => {
                  if (selectedOpportunity) {
                    setIsViewDialogOpen(false);
                    handleDelete(selectedOpportunity);
                  }
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
              <Button onClick={() => {
                if (selectedOpportunity) {
                  setIsViewDialogOpen(false);
                  handleEdit(selectedOpportunity);
                }
              }}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Opportunity</DialogTitle>
            <DialogDescription>
              Update the opportunity details below.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-title">Title *</Label>
                  <Input
                    id="edit-title"
                    value={editForm.title}
                    onChange={(e) => updateEditForm("title", e.target.value)}
                    placeholder="e.g., Website Redesign Project"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-value">Value *</Label>
                  <Input
                    id="edit-value"
                    type="number"
                    step="0.01"
                    value={editForm.value}
                    onChange={(e) => updateEditForm("value", e.target.value)}
                    placeholder="10000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editForm.description}
                  onChange={(e) => updateEditForm("description", e.target.value)}
                  placeholder="Describe the opportunity..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-company">Company *</Label>
                  <Select
                    value={editForm.companyId}
                    onValueChange={(value) => updateEditForm("companyId", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select company" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies?.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-contact">Contact</Label>
                  <Select
                    value={editForm.contactId}
                    onValueChange={(value) => updateEditForm("contactId", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select contact" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients?.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name} {client.position && `- ${client.position}`} {client.company?.name && `(${client.company.name})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-stage">Stage</Label>
                  <Select
                    value={editForm.stage}
                    onValueChange={(value) => updateEditForm("stage", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {stageConfig.map((stage) => (
                        <SelectItem key={stage.key} value={stage.key}>
                          {stage.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-priority">Priority</Label>
                  <Select
                    value={editForm.priority}
                    onValueChange={(value) => updateEditForm("priority", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-probability">Probability (%)</Label>
                  <Input
                    id="edit-probability"
                    type="number"
                    min="0"
                    max="100"
                    value={editForm.probability}
                    onChange={(e) => updateEditForm("probability", parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-expectedCloseDate">Expected Close Date *</Label>
                  <Input
                    id="edit-expectedCloseDate"
                    type="date"
                    value={editForm.expectedCloseDate}
                    onChange={(e) => updateEditForm("expectedCloseDate", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-assignedTo">Assigned To</Label>
                  <Select
                    value={editForm.assignedTo}
                    onValueChange={(value) => updateEditForm("assignedTo", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                    <SelectContent>
                      {users?.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.firstName} {user.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-source">Source</Label>
                <Select
                  value={editForm.source}
                  onValueChange={(value) => updateEditForm("source", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="referral">Referral</SelectItem>
                    <SelectItem value="website">Website</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="cold_outreach">Cold Outreach</SelectItem>
                    <SelectItem value="social_media">Social Media</SelectItem>
                    <SelectItem value="trade_show">Trade Show</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={editOpportunityMutation.isPending}
              >
                {editOpportunityMutation.isPending ? "Updating..." : "Update Opportunity"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}