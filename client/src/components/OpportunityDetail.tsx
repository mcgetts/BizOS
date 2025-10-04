import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus,
  Calendar,
  User,
  MessageSquare,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Edit,
  Trash2,
  Phone,
  Mail,
  FileText,
  Target,
} from "lucide-react";
import { format } from "date-fns";
import { FileAttachment } from "./FileAttachment";

import { SalesOpportunityWithRelations } from "@shared/schema";

type SalesOpportunity = SalesOpportunityWithRelations;

type NextStep = {
  id: string;
  opportunityId: string;
  title: string;
  description?: string;
  assignedTo?: string;
  dueDate?: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "pending" | "in_progress" | "completed" | "cancelled";
  completedAt?: string;
  assignedUser?: { id: string; firstName: string; lastName: string; };
};

type Communication = {
  id: string;
  opportunityId: string;
  type: "call" | "email" | "meeting" | "demo" | "proposal" | "contract";
  subject?: string;
  summary?: string;
  outcome?: "positive" | "neutral" | "negative" | "no_response";
  attendees?: string[];
  followUpRequired: boolean;
  followUpDate?: string;
  communicationDate: string;
  recordedBy?: string;
  recordedByUser?: { id: string; firstName: string; lastName: string; };
};

type Stakeholder = {
  id: string;
  opportunityId: string;
  name: string;
  role?: "decision_maker" | "influencer" | "user" | "blocker" | "champion";
  email?: string;
  phone?: string;
  influence: "low" | "medium" | "high";
  relationshipStrength: "strong" | "neutral" | "weak" | "unknown";
  notes?: string;
};

type ActivityHistory = {
  id: string;
  opportunityId: string;
  action: string;
  details?: string;
  performedBy: string;
  performedAt: string;
  performedByUser?: { id: string; firstName: string; lastName: string; };
};

interface OpportunityDetailProps {
  opportunity: SalesOpportunity;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function OpportunityDetail({ opportunity, isOpen, onClose, onEdit, onDelete }: OpportunityDetailProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [isAddingNextStep, setIsAddingNextStep] = useState(false);
  const [isAddingCommunication, setIsAddingCommunication] = useState(false);
  const [isAddingStakeholder, setIsAddingStakeholder] = useState(false);
  const [isEditingStage, setIsEditingStage] = useState(false);

  // Strategy editing states
  const [isAddingPainPoint, setIsAddingPainPoint] = useState(false);
  const [isAddingSuccessCriteria, setIsAddingSuccessCriteria] = useState(false);
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [isEditingDecisionProcess, setIsEditingDecisionProcess] = useState(false);
  const [editingPainPointIndex, setEditingPainPointIndex] = useState<number | null>(null);
  const [editingSuccessCriteriaIndex, setEditingSuccessCriteriaIndex] = useState<number | null>(null);

  // Next Steps, Communications, and Stakeholders editing states
  const [editingNextStepId, setEditingNextStepId] = useState<string | null>(null);
  const [editingCommunicationId, setEditingCommunicationId] = useState<string | null>(null);
  const [editingStakeholderId, setEditingStakeholderId] = useState<string | null>(null);

  // Strategy form data
  const [newPainPoint, setNewPainPoint] = useState("");
  const [newSuccessCriteria, setNewSuccessCriteria] = useState("");
  const [budgetForm, setBudgetForm] = useState({
    budget: opportunity.budget || "",
    budgetStatus: (opportunity as any).budgetStatus || ""
  });
  const [decisionProcessForm, setDecisionProcessForm] = useState((opportunity as any).decisionProcess || "");

  // Stage configuration (matching SalesPipeline)
  const stageConfig = [
    { key: "lead", label: "Lead", color: "bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100" },
    { key: "qualified", label: "Qualified", color: "bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-100" },
    { key: "proposal", label: "Proposal", color: "bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-100" },
    { key: "negotiation", label: "Negotiation", color: "bg-orange-100 dark:bg-orange-800 text-orange-800 dark:text-orange-100" },
    { key: "closed_won", label: "Closed Won", color: "bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-100" },
    { key: "closed_lost", label: "Closed Lost", color: "bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-100" },
  ];

  // Fetch next steps
  const { data: nextStepsData = [] } = useQuery({
    queryKey: [`/api/opportunities/${opportunity.id}/next-steps`],
    enabled: isOpen,
  });
  const nextSteps = Array.isArray(nextStepsData) ? nextStepsData : [];

  // Fetch communications
  const { data: communicationsData = [] } = useQuery({
    queryKey: [`/api/opportunities/${opportunity.id}/communications`],
    enabled: isOpen,
  });
  const communications = Array.isArray(communicationsData) ? communicationsData : [];

  // Fetch stakeholders
  const { data: stakeholdersData = [] } = useQuery({
    queryKey: [`/api/opportunities/${opportunity.id}/stakeholders`],
    enabled: isOpen,
  });
  const stakeholders = Array.isArray(stakeholdersData) ? stakeholdersData : [];

  // Fetch users for assignment dropdowns
  const { data: usersData = [] } = useQuery({
    queryKey: ["/api/users"],
    enabled: isOpen,
  });
  const users = Array.isArray(usersData) ? usersData : [];

  // Fetch activity history
  const { data: activityHistoryData = [] } = useQuery({
    queryKey: [`/api/opportunities/${opportunity.id}/activity-history`],
    enabled: isOpen,
  });
  const activityHistory = Array.isArray(activityHistoryData) ? activityHistoryData : [];

  // Fetch products linked to this opportunity
  const { data: productsData = [] } = useQuery({
    queryKey: [`/api/opportunities/${opportunity.id}/products`],
    enabled: isOpen,
  });
  const products = Array.isArray(productsData) ? productsData : [];

  // Create mutations for deletions
  const deleteNextStepMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/opportunities/${opportunity.id}/next-steps/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/opportunities/${opportunity.id}/next-steps`]
      });
      alert('Next step deleted successfully!');
    },
    onError: (error: any) => {
      console.error('Failed to delete next step:', error);
      const errorMessage = error?.message ||
        error?.response?.data?.message ||
        'Failed to delete next step. Please try again.';
      alert(errorMessage);
    },
  });

  const deleteCommunicationMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/opportunities/${opportunity.id}/communications/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/opportunities/${opportunity.id}/communications`]
      });
      alert('Communication deleted successfully!');
    },
    onError: (error: any) => {
      console.error('Failed to delete communication:', error);
      const errorMessage = error?.message ||
        error?.response?.data?.message ||
        'Failed to delete communication. Please try again.';
      alert(errorMessage);
    },
  });

  const deleteStakeholderMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/opportunities/${opportunity.id}/stakeholders/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/opportunities/${opportunity.id}/stakeholders`]
      });
      alert('Stakeholder deleted successfully!');
    },
    onError: (error: any) => {
      console.error('Failed to delete stakeholder:', error);
      const errorMessage = error?.message ||
        error?.response?.data?.message ||
        'Failed to delete stakeholder. Please try again.';
      alert(errorMessage);
    },
  });

  // Update mutations
  const updateNextStepMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => {
      console.log('Updating next step with data:', { id, data });
      return apiRequest("PUT", `/api/opportunities/${opportunity.id}/next-steps/${id}`, data);
    },
    onSuccess: (response) => {
      console.log('Next step update successful:', response);
      queryClient.invalidateQueries({
        queryKey: [`/api/opportunities/${opportunity.id}/next-steps`]
      });
      setEditingNextStepId(null);
      alert('Next step updated successfully!');
    },
    onError: (error: any) => {
      console.error('Failed to update next step:', error);
      const errorMessage = error?.message ||
        error?.response?.data?.message ||
        'Failed to update next step. Please check your input and try again.';
      alert(errorMessage);
    },
  });

  const updateCommunicationMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => {
      console.log('Updating communication with data:', { id, data });
      return apiRequest("PUT", `/api/opportunities/${opportunity.id}/communications/${id}`, data);
    },
    onSuccess: (response) => {
      console.log('Communication update successful:', response);
      queryClient.invalidateQueries({
        queryKey: [`/api/opportunities/${opportunity.id}/communications`]
      });
      setEditingCommunicationId(null);
      alert('Communication updated successfully!');
    },
    onError: (error: any) => {
      console.error('Failed to update communication:', error);
      const errorMessage = error?.message ||
        error?.response?.data?.message ||
        'Failed to update communication. Please check your input and try again.';
      alert(errorMessage);
    },
  });

  const updateStakeholderMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => {
      console.log('Updating stakeholder with data:', { id, data });
      return apiRequest("PUT", `/api/opportunities/${opportunity.id}/stakeholders/${id}`, data);
    },
    onSuccess: (response) => {
      console.log('Stakeholder update successful:', response);
      queryClient.invalidateQueries({
        queryKey: [`/api/opportunities/${opportunity.id}/stakeholders`]
      });
      setEditingStakeholderId(null);
      alert('Stakeholder updated successfully!');
    },
    onError: (error: any) => {
      console.error('Failed to update stakeholder:', error);
      const errorMessage = error?.message ||
        error?.response?.data?.message ||
        'Failed to update stakeholder. Please check your input and try again.';
      alert(errorMessage);
    },
  });

  // Stage update mutation
  const updateStageMutation = useMutation({
    mutationFn: (newStage: string) => apiRequest("PUT", `/api/opportunities/${opportunity.id}`, { stage: newStage }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/opportunities`]
      });
      setIsEditingStage(false);
    },
  });

  // Strategy update mutation
  const updateStrategyMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PUT", `/api/opportunities/${opportunity.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/opportunities`]
      });
      // Reset editing states
      setIsAddingPainPoint(false);
      setIsAddingSuccessCriteria(false);
      setIsEditingBudget(false);
      setIsEditingDecisionProcess(false);
      setEditingPainPointIndex(null);
      setEditingSuccessCriteriaIndex(null);
      setNewPainPoint("");
      setNewSuccessCriteria("");
    },
    onError: (error) => {
      console.error('Failed to update strategy:', error);
      alert('Failed to update strategy. Please try again.');
    },
  });

  // Handle stage update
  const handleStageUpdate = (newStage: string) => {
    // Add confirmation for changing to/from closed stages
    if ((opportunity.stage === 'closed_won' || opportunity.stage === 'closed_lost') &&
        (newStage !== 'closed_won' && newStage !== 'closed_lost')) {
      if (!confirm(`Are you sure you want to reopen this opportunity from ${opportunity.stage === 'closed_won' ? 'won' : 'lost'} status?`)) {
        return;
      }
    } else if ((newStage === 'closed_won' || newStage === 'closed_lost') &&
               (opportunity.stage !== 'closed_won' && opportunity.stage !== 'closed_lost')) {
      if (!confirm(`Are you sure you want to mark this opportunity as ${newStage === 'closed_won' ? 'won' : 'lost'}?`)) {
        return;
      }
    }

    updateStageMutation.mutate(newStage);
  };

  // Create mutations
  const createNextStepMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/opportunities/${opportunity.id}/next-steps`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/opportunities/${opportunity.id}/next-steps`]
      });
      setIsAddingNextStep(false);
      // Reset form by getting the form element and resetting it
      const form = document.querySelector('#next-step-form') as HTMLFormElement;
      if (form) form.reset();
    },
  });

  const createCommunicationMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/opportunities/${opportunity.id}/communications`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/opportunities/${opportunity.id}/communications`]
      });
      setIsAddingCommunication(false);
      // Reset form by getting the form element and resetting it
      const form = document.querySelector('#communication-form') as HTMLFormElement;
      if (form) form.reset();
    },
  });

  const createStakeholderMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/opportunities/${opportunity.id}/stakeholders`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/opportunities/${opportunity.id}/stakeholders`]
      });
      setIsAddingStakeholder(false);
      // Reset form by getting the form element and resetting it
      const form = document.querySelector('#stakeholder-form') as HTMLFormElement;
      if (form) form.reset();
    },
  });

  const priorityColors = {
    low: "bg-gray-100 text-gray-800",
    medium: "bg-blue-100 text-blue-800",
    high: "bg-orange-100 text-orange-800",
    urgent: "bg-red-100 text-red-800"
  };

  const statusColors = {
    pending: "bg-yellow-100 text-yellow-800",
    in_progress: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-gray-100 text-gray-800"
  };

  const communicationTypeIcons = {
    call: Phone,
    email: Mail,
    meeting: Users,
    demo: FileText,
    proposal: FileText,
    contract: FileText
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "decision_maker": return Target;
      case "champion": return CheckCircle2;
      case "blocker": return AlertTriangle;
      default: return User;
    }
  };

  // Strategy management handlers
  const handleAddPainPoint = () => {
    if (!newPainPoint.trim()) return;

    const currentPainPoints = (opportunity as any).painPoints || [];
    const updatedPainPoints = [...currentPainPoints, newPainPoint.trim()];

    updateStrategyMutation.mutate({ painPoints: updatedPainPoints });
  };

  const handleEditPainPoint = (index: number, newValue: string) => {
    if (!newValue.trim()) return;

    const currentPainPoints = [...((opportunity as any).painPoints || [])];
    currentPainPoints[index] = newValue.trim();

    updateStrategyMutation.mutate({ painPoints: currentPainPoints });
  };

  const handleDeletePainPoint = (index: number) => {
    if (!confirm('Are you sure you want to delete this pain point?')) return;

    const currentPainPoints = [...((opportunity as any).painPoints || [])];
    currentPainPoints.splice(index, 1);

    updateStrategyMutation.mutate({ painPoints: currentPainPoints });
  };

  const handleAddSuccessCriteria = () => {
    if (!newSuccessCriteria.trim()) return;

    const currentCriteria = (opportunity as any).successCriteria || [];
    const updatedCriteria = [...currentCriteria, newSuccessCriteria.trim()];

    updateStrategyMutation.mutate({ successCriteria: updatedCriteria });
  };

  const handleEditSuccessCriteria = (index: number, newValue: string) => {
    if (!newValue.trim()) return;

    const currentCriteria = [...((opportunity as any).successCriteria || [])];
    currentCriteria[index] = newValue.trim();

    updateStrategyMutation.mutate({ successCriteria: currentCriteria });
  };

  const handleDeleteSuccessCriteria = (index: number) => {
    if (!confirm('Are you sure you want to delete this success criteria?')) return;

    const currentCriteria = [...((opportunity as any).successCriteria || [])];
    currentCriteria.splice(index, 1);

    updateStrategyMutation.mutate({ successCriteria: currentCriteria });
  };

  const handleUpdateBudget = () => {
    const updateData: any = {};
    if (budgetForm.budget.trim()) {
      updateData.budget = budgetForm.budget.trim();
    }
    if (budgetForm.budgetStatus.trim()) {
      updateData.budgetStatus = budgetForm.budgetStatus.trim();
    }

    updateStrategyMutation.mutate(updateData);
  };

  const handleUpdateDecisionProcess = () => {
    updateStrategyMutation.mutate({ decisionProcess: decisionProcessForm.trim() });
  };

  // Form handlers
  const handleAddNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    const dueDateValue = formData.get('dueDate') as string;
    const dueDate = dueDateValue && dueDateValue.trim() ? dueDateValue.trim() : null;

    createNextStepMutation.mutate({
      title: formData.get('title'),
      description: formData.get('description'),
      assignedTo: formData.get('assignedTo') && formData.get('assignedTo') !== 'unassigned' ? formData.get('assignedTo') : null,
      dueDate,
      priority: formData.get('priority') || 'medium',
      status: 'pending'
    });
  };

  const handleAddCommunication = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    const commDate = formData.get('communicationDate') as string;
    const communicationDate = commDate ? new Date(commDate).toISOString() : new Date().toISOString();

    createCommunicationMutation.mutate({
      type: formData.get('type') || 'email',
      subject: formData.get('subject'),
      summary: formData.get('summary'),
      outcome: formData.get('outcome') || 'neutral',
      communicationDate,
      followUpRequired: formData.get('followUpRequired') === 'on'
    });
  };

  const handleAddStakeholder = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    createStakeholderMutation.mutate({
      name: formData.get('name'),
      role: formData.get('role') || 'user',
      email: formData.get('email') || null,
      phone: formData.get('phone') || null,
      influence: formData.get('influence') || 'medium',
      relationshipStrength: formData.get('relationshipStrength') || 'neutral',
      notes: formData.get('notes') || null
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{opportunity.title}</span>
            <div className="flex items-center space-x-2">
              {isEditingStage ? (
                <div className="flex items-center space-x-2">
                  <Select onValueChange={handleStageUpdate} defaultValue={opportunity.stage || "lead"}>
                    <SelectTrigger className="w-32">
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingStage(false)}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Badge
                  variant={opportunity.priority === "high" ? "destructive" : "secondary"}
                  className="cursor-pointer hover:opacity-80"
                  onClick={() => setIsEditingStage(true)}
                >
                  {stageConfig.find(s => s.key === opportunity.stage)?.label || opportunity.stage}
                </Badge>
              )}
            </div>
          </DialogTitle>
          <DialogDescription>
            {opportunity.company?.name} • {opportunity.contact?.name || "No contact assigned"}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="next-steps">
              Next Steps
              {nextSteps.filter((ns: NextStep) => ns.status !== "completed").length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {nextSteps.filter((ns: NextStep) => ns.status !== "completed").length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="communications">
              Communications
              <Badge variant="secondary" className="ml-1">{communications.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="stakeholders">
              Stakeholders
              <Badge variant="secondary" className="ml-1">{stakeholders.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="activity">
              Activity
              <Badge variant="secondary" className="ml-1">{activityHistory.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="strategy">Strategy</TabsTrigger>
            <TabsTrigger value="products">
              Products
              <Badge variant="secondary" className="ml-1">{products.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <div className="mt-4 overflow-y-auto flex-1 min-h-0">
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Deal Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Value:</span>
                      <span className="font-medium">£{parseFloat(opportunity.value || "0").toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Probability:</span>
                      <span className="font-medium">{opportunity.probability}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Expected Close:</span>
                      <span className="font-medium">
                        {opportunity.expectedCloseDate ? format(new Date(opportunity.expectedCloseDate), "MMM dd, yyyy") : "Not set"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Source:</span>
                      <span className="font-medium">{opportunity.source || "Unknown"}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Assignment</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Assigned To:</span>
                      <span className="font-medium">
                        {opportunity.assignedUser
                          ? `${opportunity.assignedUser.firstName} ${opportunity.assignedUser.lastName}`
                          : "Unassigned"
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Priority:</span>
                      <Badge variant="outline" className={priorityColors[opportunity.priority as keyof typeof priorityColors]}>
                        {opportunity.priority}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {opportunity.description && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Description</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{opportunity.description}</p>
                  </CardContent>
                </Card>
              )}

              {opportunity.tags && opportunity.tags.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Tags</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {opportunity.tags.map((tag, index) => (
                        <Badge key={index} variant="outline">{tag}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Action Buttons - Only on Overview Tab */}
              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button variant="destructive" onClick={onDelete}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
                <Button onClick={onEdit}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="next-steps" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Next Steps</h3>
                <Button onClick={() => setIsAddingNextStep(!isAddingNextStep)} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  {isAddingNextStep ? 'Cancel' : 'Add Next Step'}
                </Button>
              </div>

              {isAddingNextStep && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Add Next Step</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form id="next-step-form" onSubmit={handleAddNextStep} className="space-y-4">
                      <div>
                        <Label htmlFor="title">Title *</Label>
                        <Input name="title" required placeholder="e.g., Follow up with decision maker" />
                      </div>
                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea name="description" placeholder="Additional details..." />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="priority">Priority</Label>
                          <Select name="priority" defaultValue="medium">
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="urgent">Urgent</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="dueDate">Due Date</Label>
                          <Input name="dueDate" type="date" />
                        </div>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={() => setIsAddingNextStep(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={createNextStepMutation.isPending}>
                          {createNextStepMutation.isPending ? 'Adding...' : 'Add Next Step'}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}

              {/* Edit Next Step Dialog */}
              {editingNextStepId && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Edit Next Step</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);

                        // Properly convert and validate form data
                        const titleValue = formData.get('title');
                        const descriptionValue = formData.get('description');
                        const priorityValue = formData.get('priority');
                        const statusValue = formData.get('status');
                        const dueDateValue = formData.get('dueDate');
                        const assignedToValue = formData.get('assignedTo');

                        // Validation
                        if (!titleValue || typeof titleValue !== 'string' || !titleValue.trim()) {
                          alert('Title is required');
                          return;
                        }

                        const data = {
                          title: titleValue.toString().trim(),
                          description: descriptionValue?.toString().trim() || null,
                          priority: priorityValue?.toString() || 'medium',
                          status: statusValue?.toString() || 'pending',
                          dueDate: dueDateValue && dueDateValue.toString().trim()
                            ? dueDateValue.toString().trim()
                            : null,
                          assignedTo: assignedToValue && assignedToValue.toString().trim() && assignedToValue.toString() !== 'unassigned'
                            ? assignedToValue.toString()
                            : null,
                        };

                        console.log('Submitting next step update:', data);
                        updateNextStepMutation.mutate({ id: editingNextStepId, data });
                      }}
                      className="space-y-4"
                    >
                      {(() => {
                        const currentStep = nextSteps.find(step => step.id === editingNextStepId);
                        return currentStep ? (
                          <>
                            <div>
                              <Label htmlFor="edit-title">Title *</Label>
                              <Input
                                name="title"
                                defaultValue={currentStep.title}
                                required
                                placeholder="e.g., Follow up with decision maker"
                              />
                            </div>
                            <div>
                              <Label htmlFor="edit-description">Description</Label>
                              <Textarea
                                name="description"
                                defaultValue={currentStep.description || ''}
                                placeholder="Additional details..."
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="edit-priority">Priority</Label>
                                <Select name="priority" defaultValue={currentStep.priority}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="low">Low</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                    <SelectItem value="urgent">Urgent</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label htmlFor="edit-status">Status</Label>
                                <Select name="status" defaultValue={currentStep.status}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="in_progress">In Progress</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="edit-dueDate">Due Date</Label>
                                <Input
                                  name="dueDate"
                                  type="date"
                                  defaultValue={
                                    currentStep.dueDate
                                      ? new Date(currentStep.dueDate).toISOString().split('T')[0]
                                      : ''
                                  }
                                />
                              </div>
                              <div>
                                <Label htmlFor="edit-assignedTo">Assigned To</Label>
                                <Select name="assignedTo" defaultValue={currentStep.assignedTo || ''}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select user" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="unassigned">Unassigned</SelectItem>
                                    {users?.map((user) => (
                                      <SelectItem key={user.id} value={user.id}>
                                        {user.firstName} {user.lastName}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="flex justify-end space-x-2">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setEditingNextStepId(null)}
                              >
                                Cancel
                              </Button>
                              <Button type="submit" disabled={updateNextStepMutation.isPending}>
                                {updateNextStepMutation.isPending ? 'Updating...' : 'Update Next Step'}
                              </Button>
                            </div>
                          </>
                        ) : null;
                      })()}
                    </form>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-3">
                {nextSteps.map((nextStep: NextStep) => (
                  <Card key={nextStep.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium">{nextStep.title}</h4>
                            <Badge variant="outline" className={priorityColors[nextStep.priority]}>
                              {nextStep.priority}
                            </Badge>
                            <Badge variant="outline" className={statusColors[nextStep.status]}>
                              {nextStep.status.replace("_", " ")}
                            </Badge>
                          </div>
                          {nextStep.description && (
                            <p className="text-sm text-gray-600 mb-2">{nextStep.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            {nextStep.assignedUser && (
                              <div className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {nextStep.assignedUser.firstName} {nextStep.assignedUser.lastName}
                              </div>
                            )}
                            {nextStep.dueDate && (
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {format(new Date(nextStep.dueDate), "MMM dd, yyyy")}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingNextStepId(nextStep.id)}
                            disabled={editingNextStepId === nextStep.id}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteNextStepMutation.mutate(nextStep.id)}
                            disabled={deleteNextStepMutation.isPending}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {nextSteps.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No next steps defined. Add one to keep the opportunity moving forward.
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="communications" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Communications</h3>
                <Button onClick={() => setIsAddingCommunication(!isAddingCommunication)} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  {isAddingCommunication ? 'Cancel' : 'Log Communication'}
                </Button>
              </div>

              {/* General Opportunity Files */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Shared Files</CardTitle>
                </CardHeader>
                <CardContent>
                  <FileAttachment
                    opportunityId={opportunity.id}
                    showUploadButton={true}
                  />
                </CardContent>
              </Card>

              {isAddingCommunication && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Log Communication</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form id="communication-form" onSubmit={handleAddCommunication} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="type">Type</Label>
                          <Select name="type" defaultValue="email">
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="call">Call</SelectItem>
                              <SelectItem value="email">Email</SelectItem>
                              <SelectItem value="meeting">Meeting</SelectItem>
                              <SelectItem value="demo">Demo</SelectItem>
                              <SelectItem value="proposal">Proposal</SelectItem>
                              <SelectItem value="contract">Contract</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="outcome">Outcome</Label>
                          <Select name="outcome" defaultValue="neutral">
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="positive">Positive</SelectItem>
                              <SelectItem value="neutral">Neutral</SelectItem>
                              <SelectItem value="negative">Negative</SelectItem>
                              <SelectItem value="no_response">No Response</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="subject">Subject</Label>
                        <Input name="subject" placeholder="e.g., Proposal discussion" />
                      </div>
                      <div>
                        <Label htmlFor="summary">Summary</Label>
                        <Textarea name="summary" placeholder="What was discussed or communicated..." />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="communicationDate">Date</Label>
                          <Input name="communicationDate" type="datetime-local" defaultValue={new Date().toISOString().slice(0, 16)} />
                        </div>
                        <div className="flex items-center space-x-2 pt-6">
                          <input type="checkbox" name="followUpRequired" id="followUpRequired" />
                          <Label htmlFor="followUpRequired">Follow-up required</Label>
                        </div>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={() => setIsAddingCommunication(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={createCommunicationMutation.isPending}>
                          {createCommunicationMutation.isPending ? 'Logging...' : 'Log Communication'}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}

              {/* Edit Communication Dialog */}
              {editingCommunicationId && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Edit Communication</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);

                        // Properly convert and validate form data
                        const typeValue = formData.get('type');
                        const subjectValue = formData.get('subject');
                        const summaryValue = formData.get('summary');
                        const outcomeValue = formData.get('outcome');
                        const attendeesValue = formData.get('attendees');
                        const followUpRequiredValue = formData.get('followUpRequired');
                        const followUpDateValue = formData.get('followUpDate');
                        const communicationDateValue = formData.get('communicationDate');

                        // Validation
                        if (!summaryValue || typeof summaryValue !== 'string' || !summaryValue.trim()) {
                          alert('Summary is required');
                          return;
                        }
                        if (!communicationDateValue || typeof communicationDateValue !== 'string' || !communicationDateValue.trim()) {
                          alert('Communication date is required');
                          return;
                        }

                        const data = {
                          type: typeValue?.toString() || 'call',
                          subject: subjectValue?.toString().trim() || null,
                          summary: summaryValue.toString().trim(),
                          outcome: outcomeValue?.toString() || null,
                          attendees: attendeesValue ? attendeesValue.toString().split(',').map(s => s.trim()).filter(s => s) : [],
                          followUpRequired: followUpRequiredValue === 'on',
                          followUpDate: followUpDateValue && followUpDateValue.toString().trim()
                            ? new Date(followUpDateValue.toString())
                            : null,
                          communicationDate: new Date(communicationDateValue.toString()),
                        };

                        console.log('Submitting communication update:', data);
                        updateCommunicationMutation.mutate({ id: editingCommunicationId, data });
                      }}
                      className="space-y-4"
                    >
                      {(() => {
                        const currentComm = communications.find(comm => comm.id === editingCommunicationId);
                        return currentComm ? (
                          <>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="edit-type">Type *</Label>
                                <Select name="type" defaultValue={currentComm.type}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="call">Phone Call</SelectItem>
                                    <SelectItem value="email">Email</SelectItem>
                                    <SelectItem value="meeting">Meeting</SelectItem>
                                    <SelectItem value="demo">Demo</SelectItem>
                                    <SelectItem value="proposal">Proposal</SelectItem>
                                    <SelectItem value="contract">Contract</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label htmlFor="edit-outcome">Outcome</Label>
                                <Select name="outcome" defaultValue={currentComm.outcome || ''}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select outcome" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="positive">Positive</SelectItem>
                                    <SelectItem value="neutral">Neutral</SelectItem>
                                    <SelectItem value="negative">Negative</SelectItem>
                                    <SelectItem value="no_response">No Response</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div>
                              <Label htmlFor="edit-subject">Subject</Label>
                              <Input
                                name="subject"
                                defaultValue={currentComm.subject || ''}
                                placeholder="e.g., Product demo discussion"
                              />
                            </div>
                            <div>
                              <Label htmlFor="edit-summary">Summary *</Label>
                              <Textarea
                                name="summary"
                                defaultValue={currentComm.summary || ''}
                                required
                                placeholder="What was discussed..."
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="edit-communicationDate">Date & Time *</Label>
                                <Input
                                  name="communicationDate"
                                  type="datetime-local"
                                  defaultValue={
                                    currentComm.communicationDate
                                      ? new Date(currentComm.communicationDate).toISOString().slice(0, 16)
                                      : ''
                                  }
                                  required
                                />
                              </div>
                              <div>
                                <Label htmlFor="edit-attendees">Attendees</Label>
                                <Input
                                  name="attendees"
                                  defaultValue={currentComm.attendees ? currentComm.attendees.join(', ') : ''}
                                  placeholder="John Doe, Jane Smith"
                                />
                              </div>
                            </div>
                            <div>
                              <Label htmlFor="edit-followUpDate">Follow-up Date</Label>
                              <Input
                                name="followUpDate"
                                type="date"
                                defaultValue={
                                  currentComm.followUpDate
                                    ? new Date(currentComm.followUpDate).toISOString().split('T')[0]
                                    : ''
                                }
                              />
                              <div className="flex items-center space-x-2 pt-2">
                                <input
                                  type="checkbox"
                                  name="followUpRequired"
                                  id="edit-followUpRequired"
                                  defaultChecked={currentComm.followUpRequired || false}
                                />
                                <Label htmlFor="edit-followUpRequired">Follow-up required</Label>
                              </div>
                            </div>
                            <div className="flex justify-end space-x-2">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setEditingCommunicationId(null)}
                              >
                                Cancel
                              </Button>
                              <Button type="submit" disabled={updateCommunicationMutation.isPending}>
                                {updateCommunicationMutation.isPending ? 'Updating...' : 'Update Communication'}
                              </Button>
                            </div>
                          </>
                        ) : null;
                      })()}
                    </form>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-3">
                {communications.map((comm: Communication) => {
                  const IconComponent = communicationTypeIcons[comm.type];
                  return (
                    <Card key={comm.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <IconComponent className="w-4 h-4" />
                              <h4 className="font-medium">{comm.subject || `${comm.type} communication`}</h4>
                              {comm.outcome && (
                                <Badge variant={comm.outcome === "positive" ? "default" : "secondary"}>
                                  {comm.outcome}
                                </Badge>
                              )}
                            </div>
                            {comm.summary && (
                              <p className="text-sm text-gray-600 mb-2">{comm.summary}</p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {format(new Date(comm.communicationDate), "MMM dd, yyyy 'at' h:mm a")}
                              </div>
                              {comm.recordedByUser && (
                                <div className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {comm.recordedByUser.firstName} {comm.recordedByUser.lastName}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingCommunicationId(comm.id)}
                              disabled={editingCommunicationId === comm.id}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteCommunicationMutation.mutate(comm.id)}
                              disabled={deleteCommunicationMutation.isPending}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>

                        {/* Communication-specific file attachments */}
                        <div className="mt-4 pt-4 border-t">
                          <FileAttachment
                            opportunityId={opportunity.id}
                            communicationId={comm.id}
                            showUploadButton={true}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {communications.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No communications logged yet. Start tracking your interactions.
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="stakeholders" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Stakeholders</h3>
                <Button onClick={() => setIsAddingStakeholder(!isAddingStakeholder)} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  {isAddingStakeholder ? 'Cancel' : 'Add Stakeholder'}
                </Button>
              </div>

              {isAddingStakeholder && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Add Stakeholder</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form id="stakeholder-form" onSubmit={handleAddStakeholder} className="space-y-4">
                      <div>
                        <Label htmlFor="name">Name *</Label>
                        <Input name="name" required placeholder="e.g., John Smith" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="role">Role</Label>
                          <Select name="role" defaultValue="user">
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="decision_maker">Decision Maker</SelectItem>
                              <SelectItem value="influencer">Influencer</SelectItem>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="blocker">Blocker</SelectItem>
                              <SelectItem value="champion">Champion</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="influence">Influence Level</Label>
                          <Select name="influence" defaultValue="medium">
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
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="email">Email</Label>
                          <Input name="email" type="email" placeholder="john@company.com" />
                        </div>
                        <div>
                          <Label htmlFor="phone">Phone</Label>
                          <Input name="phone" placeholder="+1 (555) 123-4567" />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="relationshipStrength">Relationship Strength</Label>
                        <Select name="relationshipStrength" defaultValue="neutral">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="strong">Strong</SelectItem>
                            <SelectItem value="neutral">Neutral</SelectItem>
                            <SelectItem value="weak">Weak</SelectItem>
                            <SelectItem value="unknown">Unknown</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea name="notes" placeholder="Additional information about this stakeholder..." />
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={() => setIsAddingStakeholder(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={createStakeholderMutation.isPending}>
                          {createStakeholderMutation.isPending ? 'Adding...' : 'Add Stakeholder'}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}

              {/* Edit Stakeholder Dialog */}
              {editingStakeholderId && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Edit Stakeholder</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);

                        // Properly convert and validate form data
                        const nameValue = formData.get('name');
                        const roleValue = formData.get('role');
                        const influenceValue = formData.get('influence');
                        const relationshipStrengthValue = formData.get('relationshipStrength');
                        const emailValue = formData.get('email');
                        const phoneValue = formData.get('phone');
                        const notesValue = formData.get('notes');

                        // Validation
                        if (!nameValue || typeof nameValue !== 'string' || !nameValue.trim()) {
                          alert('Name is required');
                          return;
                        }

                        const data = {
                          name: nameValue.toString().trim(),
                          role: roleValue?.toString() || 'user',
                          influence: influenceValue?.toString() || 'medium',
                          relationshipStrength: relationshipStrengthValue?.toString() || 'neutral',
                          email: emailValue && emailValue.toString().trim() ? emailValue.toString().trim() : null,
                          phone: phoneValue && phoneValue.toString().trim() ? phoneValue.toString().trim() : null,
                          notes: notesValue && notesValue.toString().trim() ? notesValue.toString().trim() : null,
                        };

                        console.log('Submitting stakeholder update:', data);
                        updateStakeholderMutation.mutate({ id: editingStakeholderId, data });
                      }}
                      className="space-y-4"
                    >
                      {(() => {
                        const currentStakeholder = stakeholders.find(stakeholder => stakeholder.id === editingStakeholderId);
                        return currentStakeholder ? (
                          <>
                            <div>
                              <Label htmlFor="edit-name">Name *</Label>
                              <Input
                                name="name"
                                defaultValue={currentStakeholder.name}
                                required
                                placeholder="e.g., John Smith"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="edit-role">Role</Label>
                                <Select name="role" defaultValue={currentStakeholder.role || 'user'}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="decision_maker">Decision Maker</SelectItem>
                                    <SelectItem value="influencer">Influencer</SelectItem>
                                    <SelectItem value="user">User</SelectItem>
                                    <SelectItem value="blocker">Blocker</SelectItem>
                                    <SelectItem value="champion">Champion</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label htmlFor="edit-influence">Influence Level</Label>
                                <Select name="influence" defaultValue={currentStakeholder.influence || 'medium'}>
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
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="edit-email">Email</Label>
                                <Input
                                  name="email"
                                  type="email"
                                  defaultValue={currentStakeholder.email || ''}
                                  placeholder="john@company.com"
                                />
                              </div>
                              <div>
                                <Label htmlFor="edit-phone">Phone</Label>
                                <Input
                                  name="phone"
                                  defaultValue={currentStakeholder.phone || ''}
                                  placeholder="+1 (555) 123-4567"
                                />
                              </div>
                            </div>
                            <div>
                              <Label htmlFor="edit-relationshipStrength">Relationship Strength</Label>
                              <Select name="relationshipStrength" defaultValue={currentStakeholder.relationshipStrength || 'neutral'}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="strong">Strong</SelectItem>
                                  <SelectItem value="neutral">Neutral</SelectItem>
                                  <SelectItem value="weak">Weak</SelectItem>
                                  <SelectItem value="unknown">Unknown</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="edit-notes">Notes</Label>
                              <Textarea
                                name="notes"
                                defaultValue={currentStakeholder.notes || ''}
                                placeholder="Additional information about this stakeholder..."
                              />
                            </div>
                            <div className="flex justify-end space-x-2">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setEditingStakeholderId(null)}
                              >
                                Cancel
                              </Button>
                              <Button type="submit" disabled={updateStakeholderMutation.isPending}>
                                {updateStakeholderMutation.isPending ? 'Updating...' : 'Update Stakeholder'}
                              </Button>
                            </div>
                          </>
                        ) : null;
                      })()}
                    </form>
                  </CardContent>
                </Card>
              )}

              <div className="grid gap-3">
                {stakeholders.map((stakeholder: Stakeholder) => {
                  const RoleIcon = getRoleIcon(stakeholder.role || "");
                  return (
                    <Card key={stakeholder.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <RoleIcon className="w-4 h-4" />
                              <h4 className="font-medium">{stakeholder.name}</h4>
                              {stakeholder.role && (
                                <Badge variant="outline">
                                  {stakeholder.role.replace("_", " ")}
                                </Badge>
                              )}
                              <Badge variant={stakeholder.influence === "high" ? "default" : "secondary"}>
                                {stakeholder.influence} influence
                              </Badge>
                            </div>
                            <div className="space-y-1 text-sm text-gray-600">
                              {stakeholder.email && (
                                <div className="flex items-center gap-2">
                                  <Mail className="w-3 h-3" />
                                  {stakeholder.email}
                                </div>
                              )}
                              {stakeholder.phone && (
                                <div className="flex items-center gap-2">
                                  <Phone className="w-3 h-3" />
                                  {stakeholder.phone}
                                </div>
                              )}
                              {stakeholder.notes && (
                                <p className="mt-2">{stakeholder.notes}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingStakeholderId(stakeholder.id)}
                              disabled={editingStakeholderId === stakeholder.id}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteStakeholderMutation.mutate(stakeholder.id)}
                              disabled={deleteStakeholderMutation.isPending}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {stakeholders.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No stakeholders mapped yet. Add key decision makers and influencers.
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="activity" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Activity History</h3>
                <p className="text-sm text-gray-500">All updates and changes to this opportunity</p>
              </div>

              <div className="space-y-3">
                {activityHistory.map((activity: any) => {
                  // Handle both direct activity data and joined data structure
                  const user = activity.performedByUser;
                  const performedByName = user ? `${user.firstName} ${user.lastName}` : activity.performedBy || 'Unknown User';

                  // Determine icon and color based on activity type
                  const getActivityIcon = (action: string) => {
                    switch (action) {
                      case 'opportunity_created':
                        return { icon: Plus, color: 'bg-green-500' };
                      case 'stage_changed':
                        return { icon: Target, color: 'bg-blue-500' };
                      case 'value_changed':
                      case 'probability_changed':
                      case 'close_date_changed':
                      case 'priority_changed':
                      case 'assigned_to_changed':
                      case 'opportunity_updated':
                        return { icon: Edit, color: 'bg-orange-500' };
                      case 'next_step_added':
                      case 'next_step_updated':
                      case 'next_step_deleted':
                        return { icon: CheckCircle2, color: 'bg-purple-500' };
                      case 'communication_logged':
                      case 'communication_updated':
                      case 'communication_deleted':
                        return { icon: MessageSquare, color: 'bg-indigo-500' };
                      case 'stakeholder_added':
                      case 'stakeholder_updated':
                      case 'stakeholder_deleted':
                        return { icon: Users, color: 'bg-teal-500' };
                      default:
                        return { icon: Clock, color: 'bg-gray-500' };
                    }
                  };

                  const { icon: ActivityIcon, color } = getActivityIcon(activity.action);

                  return (
                    <Card key={activity.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0">
                            <div className={`w-8 h-8 ${color} rounded-full flex items-center justify-center`}>
                              <ActivityIcon className="w-4 h-4 text-white" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-medium text-gray-900">
                                {activity.action.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                              </h4>
                              <time className="text-xs text-gray-500">
                                {format(new Date(activity.performedAt || activity.createdAt), "MMM dd, yyyy 'at' h:mm a")}
                              </time>
                            </div>
                            {activity.details && (
                              <p className="text-sm text-gray-600 mt-1">{activity.details}</p>
                            )}
                            {(activity.oldValue || activity.newValue) && (
                              <div className="mt-2 text-xs text-gray-500 bg-gray-50 p-2 rounded">
                                {activity.oldValue && (
                                  <div>
                                    <span className="font-medium">From:</span> {activity.oldValue}
                                  </div>
                                )}
                                {activity.newValue && (
                                  <div>
                                    <span className="font-medium">To:</span> {activity.newValue}
                                  </div>
                                )}
                              </div>
                            )}
                            <div className="flex items-center mt-2 text-xs text-gray-500">
                              <User className="w-3 h-3 mr-1" />
                              {performedByName}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {activityHistory.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No activity history yet. Changes to this opportunity will appear here.
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="strategy" className="space-y-4">
              <div className="grid gap-4">
                {/* Pain Points Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        Pain Points
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsAddingPainPoint(!isAddingPainPoint)}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {isAddingPainPoint && (
                      <div className="flex gap-2">
                        <Input
                          value={newPainPoint}
                          onChange={(e) => setNewPainPoint(e.target.value)}
                          placeholder="Enter new pain point..."
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleAddPainPoint();
                            } else if (e.key === 'Escape') {
                              setIsAddingPainPoint(false);
                              setNewPainPoint("");
                            }
                          }}
                        />
                        <Button size="sm" onClick={handleAddPainPoint}>
                          Add
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setIsAddingPainPoint(false);
                            setNewPainPoint("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    )}

                    {Array.isArray((opportunity as any).painPoints) && (opportunity as any).painPoints.length > 0 ? (
                      <ul className="space-y-2">
                        {(opportunity as any).painPoints.map((point: string, index: number) => (
                          <li key={index} className="flex items-start gap-2 group">
                            <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0" />
                            {editingPainPointIndex === index ? (
                              <div className="flex-1 flex gap-2">
                                <Input
                                  defaultValue={point}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleEditPainPoint(index, e.currentTarget.value);
                                    } else if (e.key === 'Escape') {
                                      setEditingPainPointIndex(null);
                                    }
                                  }}
                                  onBlur={(e) => {
                                    if (e.target.value !== point) {
                                      handleEditPainPoint(index, e.target.value);
                                    } else {
                                      setEditingPainPointIndex(null);
                                    }
                                  }}
                                  autoFocus
                                />
                              </div>
                            ) : (
                              <>
                                <span className="text-sm flex-1">{point}</span>
                                <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={() => setEditingPainPointIndex(index)}
                                  >
                                    <Edit className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 text-red-600 hover:text-red-800"
                                    onClick={() => handleDeletePainPoint(index)}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500 italic">No pain points identified yet.</p>
                    )}
                  </CardContent>
                </Card>

                {/* Success Criteria Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        Success Criteria
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsAddingSuccessCriteria(!isAddingSuccessCriteria)}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {isAddingSuccessCriteria && (
                      <div className="flex gap-2">
                        <Input
                          value={newSuccessCriteria}
                          onChange={(e) => setNewSuccessCriteria(e.target.value)}
                          placeholder="Enter new success criteria..."
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleAddSuccessCriteria();
                            } else if (e.key === 'Escape') {
                              setIsAddingSuccessCriteria(false);
                              setNewSuccessCriteria("");
                            }
                          }}
                        />
                        <Button size="sm" onClick={handleAddSuccessCriteria}>
                          Add
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setIsAddingSuccessCriteria(false);
                            setNewSuccessCriteria("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    )}

                    {Array.isArray((opportunity as any).successCriteria) && (opportunity as any).successCriteria.length > 0 ? (
                      <ul className="space-y-2">
                        {(opportunity as any).successCriteria.map((criteria: string, index: number) => (
                          <li key={index} className="flex items-start gap-2 group">
                            <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                            {editingSuccessCriteriaIndex === index ? (
                              <div className="flex-1 flex gap-2">
                                <Input
                                  defaultValue={criteria}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleEditSuccessCriteria(index, e.currentTarget.value);
                                    } else if (e.key === 'Escape') {
                                      setEditingSuccessCriteriaIndex(null);
                                    }
                                  }}
                                  onBlur={(e) => {
                                    if (e.target.value !== criteria) {
                                      handleEditSuccessCriteria(index, e.target.value);
                                    } else {
                                      setEditingSuccessCriteriaIndex(null);
                                    }
                                  }}
                                  autoFocus
                                />
                              </div>
                            ) : (
                              <>
                                <span className="text-sm flex-1">{criteria}</span>
                                <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={() => setEditingSuccessCriteriaIndex(index)}
                                  >
                                    <Edit className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 text-red-600 hover:text-red-800"
                                    onClick={() => handleDeleteSuccessCriteria(index)}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500 italic">No success criteria defined yet.</p>
                    )}
                  </CardContent>
                </Card>

                {/* Budget Information Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center justify-between">
                      Budget Information
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditingBudget(!isEditingBudget)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {isEditingBudget ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>Budget Amount</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={budgetForm.budget}
                              onChange={(e) => setBudgetForm(prev => ({ ...prev, budget: e.target.value }))}
                              placeholder="e.g., 50000"
                            />
                          </div>
                          <div>
                            <Label>Budget Status</Label>
                            <Select
                              value={budgetForm.budgetStatus}
                              onValueChange={(value) => setBudgetForm(prev => ({ ...prev, budgetStatus: value }))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="approved">Approved</SelectItem>
                                <SelectItem value="under_review">Under Review</SelectItem>
                                <SelectItem value="rejected">Rejected</SelectItem>
                                <SelectItem value="unknown">Unknown</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleUpdateBudget}>
                            Save
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setIsEditingBudget(false);
                              setBudgetForm({
                                budget: opportunity.budget || "",
                                budgetStatus: (opportunity as any).budgetStatus || ""
                              });
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Budget:</span>
                          <span className="font-medium">
                            {opportunity.budget ? `£${parseFloat(opportunity.budget).toLocaleString()}` : 'Not set'}
                          </span>
                        </div>
                        {(opportunity as any).budgetStatus && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Status:</span>
                            <Badge variant={(opportunity as any).budgetStatus === "approved" ? "default" : "secondary"}>
                              {(opportunity as any).budgetStatus}
                            </Badge>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Decision Process Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center justify-between">
                      Decision Process
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditingDecisionProcess(!isEditingDecisionProcess)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isEditingDecisionProcess ? (
                      <div className="space-y-3">
                        <Textarea
                          value={decisionProcessForm}
                          onChange={(e) => setDecisionProcessForm(e.target.value)}
                          placeholder="Describe the customer's decision-making process..."
                          rows={4}
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleUpdateDecisionProcess}>
                            Save
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setIsEditingDecisionProcess(false);
                              setDecisionProcessForm((opportunity as any).decisionProcess || "");
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm">
                        {(opportunity as any).decisionProcess || (
                          <span className="text-gray-500 italic">No decision process documented yet.</span>
                        )}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="products" className="space-y-4">
              <div className="space-y-4">
                {products.length > 0 ? (
                  products.map((product: any) => (
                    <Card key={product.id} data-testid={`product-card-${product.id}`}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-lg" data-testid={`product-name-${product.id}`}>
                              {product.name}
                            </h4>
                            {product.description && (
                              <p className="text-sm text-gray-600 mt-1" data-testid={`product-description-${product.id}`}>
                                {product.description}
                              </p>
                            )}
                            <div className="mt-3 flex items-center gap-4 text-sm text-gray-600">
                              {product.status && (
                                <Badge variant="secondary" data-testid={`product-status-${product.id}`}>
                                  {product.status}
                                </Badge>
                              )}
                              {product.version && (
                                <span data-testid={`product-version-${product.id}`}>
                                  Version: {product.version}
                                </span>
                              )}
                              {product.owner && (
                                <span data-testid={`product-owner-${product.id}`}>
                                  Owner: {product.owner}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500" data-testid="no-products-message">
                    No products linked to this opportunity yet.
                  </div>
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}