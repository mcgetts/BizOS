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
  painPoints?: string[];
  successCriteria?: string[];
  budget?: string;
  budgetStatus?: string;
  decisionProcess?: string;
  createdAt: string;
  company?: { id: string; name: string; };
  contact?: { id: string; name: string; email?: string; };
  assignedUser?: { id: string; firstName: string; lastName: string; };
};

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

  // Fetch next steps
  const { data: nextStepsData = [] } = useQuery({
    queryKey: [`/api/opportunities/${opportunity.id}/next-steps`],
    queryFn: () => apiRequest("GET", `/api/opportunities/${opportunity.id}/next-steps`),
    enabled: isOpen,
  });
  const nextSteps = Array.isArray(nextStepsData) ? nextStepsData : [];

  // Fetch communications
  const { data: communicationsData = [] } = useQuery({
    queryKey: [`/api/opportunities/${opportunity.id}/communications`],
    queryFn: () => apiRequest("GET", `/api/opportunities/${opportunity.id}/communications`),
    enabled: isOpen,
  });
  const communications = Array.isArray(communicationsData) ? communicationsData : [];

  // Fetch stakeholders
  const { data: stakeholdersData = [] } = useQuery({
    queryKey: [`/api/opportunities/${opportunity.id}/stakeholders`],
    queryFn: () => apiRequest("GET", `/api/opportunities/${opportunity.id}/stakeholders`),
    enabled: isOpen,
  });
  const stakeholders = Array.isArray(stakeholdersData) ? stakeholdersData : [];

  // Create mutations for deletions
  const deleteNextStepMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/opportunities/${opportunity.id}/next-steps/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/opportunities/${opportunity.id}/next-steps`]
      });
    },
  });

  const deleteCommunicationMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/opportunities/${opportunity.id}/communications/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/opportunities/${opportunity.id}/communications`]
      });
    },
  });

  const deleteStakeholderMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/opportunities/${opportunity.id}/stakeholders/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/opportunities/${opportunity.id}/stakeholders`]
      });
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{opportunity.title}</span>
            <Badge variant={opportunity.priority === "high" ? "destructive" : "secondary"}>
              {opportunity.stage}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {opportunity.company?.name} • {opportunity.contact?.name || "No contact assigned"}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-5">
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
            <TabsTrigger value="strategy">Strategy</TabsTrigger>
          </TabsList>

          <div className="mt-4 overflow-y-auto flex-1">
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Deal Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Value:</span>
                      <span className="font-medium">${parseFloat(opportunity.value || "0").toLocaleString()}</span>
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
            </TabsContent>

            <TabsContent value="next-steps" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Next Steps</h3>
                <Button onClick={() => setIsAddingNextStep(true)} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Next Step
                </Button>
              </div>

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
                          <Button variant="ghost" size="sm">
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
                <Button onClick={() => setIsAddingCommunication(true)} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Log Communication
                </Button>
              </div>

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
                            <Button variant="ghost" size="sm">
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
                <Button onClick={() => setIsAddingStakeholder(true)} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Stakeholder
                </Button>
              </div>

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
                            <Button variant="ghost" size="sm">
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

            <TabsContent value="strategy" className="space-y-4">
              <div className="grid gap-4">
                {opportunity.painPoints && opportunity.painPoints.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        Pain Points
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {opportunity.painPoints.map((point, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0" />
                            <span className="text-sm">{point}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {opportunity.successCriteria && opportunity.successCriteria.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        Success Criteria
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {opportunity.successCriteria.map((criteria, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                            <span className="text-sm">{criteria}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {opportunity.budget && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Budget Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Budget:</span>
                        <span className="font-medium">${parseFloat(opportunity.budget).toLocaleString()}</span>
                      </div>
                      {opportunity.budgetStatus && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Status:</span>
                          <Badge variant={opportunity.budgetStatus === "approved" ? "default" : "secondary"}>
                            {opportunity.budgetStatus}
                          </Badge>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {opportunity.decisionProcess && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Decision Process</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{opportunity.decisionProcess}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <div className="flex space-x-2">
            <Button variant="destructive" onClick={onDelete}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
            <Button onClick={onEdit}>
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}