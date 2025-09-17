import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { DollarSign, Calendar, User, Building2, MoreVertical } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
    name: string;
    industry: string | null;
  };
};

const stageConfig = [
  { key: "lead", label: "Lead", color: "bg-slate-100" },
  { key: "qualified", label: "Qualified", color: "bg-blue-100" },
  { key: "proposal", label: "Proposal", color: "bg-yellow-100" },
  { key: "negotiation", label: "Negotiation", color: "bg-orange-100" },
  { key: "closed_won", label: "Closed Won", color: "bg-green-100" },
  { key: "closed_lost", label: "Closed Lost", color: "bg-red-100" },
];

const priorityColors = {
  low: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-red-100 text-red-800",
};

export function SalesPipeline() {
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");

  const { data: opportunities, isLoading } = useQuery<SalesOpportunity[]>({
    queryKey: ["/api/opportunities"],
  });

  const organizeByStage = (opportunities: SalesOpportunity[]) => {
    const organized: Record<string, SalesOpportunity[]> = {};

    stageConfig.forEach(stage => {
      organized[stage.key] = opportunities?.filter(opp => opp.stage === stage.key) || [];
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
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading sales pipeline...</div>
      </div>
    );
  }

  const organizedOpportunities = organizeByStage(opportunities || []);

  const header = (
    <div className="flex items-center justify-between">
      <h2 className="text-2xl font-bold">Sales Pipeline</h2>
      <div className="flex space-x-2">
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
          Kanban
        </Button>
      </div>
    </div>
  );

  if (viewMode === "table") {
    return (
      <div className="space-y-4">
        {header}

        <div className="border rounded-lg overflow-hidden">
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left p-4 font-medium">Opportunity</th>
                  <th className="text-left p-4 font-medium">Company</th>
                  <th className="text-left p-4 font-medium">Stage</th>
                  <th className="text-left p-4 font-medium">Value</th>
                  <th className="text-left p-4 font-medium">Probability</th>
                  <th className="text-left p-4 font-medium">Close Date</th>
                  <th className="text-left p-4 font-medium">Priority</th>
                </tr>
              </thead>
              <tbody>
                {opportunities?.map((opportunity) => (
                <tr key={opportunity.id} className="border-t hover:bg-gray-50">
                  <td className="p-4">
                    <div className="font-medium">{opportunity.title}</div>
                    <div className="text-sm text-gray-500">{opportunity.description}</div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center space-x-2">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      <span>{opportunity.company?.name}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge variant="outline">
                      {stageConfig.find(s => s.key === opportunity.stage)?.label}
                    </Badge>
                  </td>
                  <td className="p-4 font-medium">
                    {formatCurrency(parseFloat(opportunity.value))}
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
                </tr>
              ))}
              </tbody>
            </table>
          </div>
          {opportunities && opportunities.length > 10 && (
            <div className="text-center text-xs text-gray-500 py-2 border-t border-gray-200 bg-gray-50">
              Showing {Math.min(10, opportunities.length)} of {opportunities.length} opportunities - scroll to see all
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {header}

      <DragDropContext onDragEnd={() => {}}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {stageConfig.map((stage) => {
            const stageOpportunities = organizedOpportunities[stage.key];
            const stageTotal = calculateStageTotal(stageOpportunities);

            return (
              <div key={stage.key} className="flex flex-col">
                <div className={`${stage.color} p-3 rounded-t-lg border-b`}>
                  <div className="font-medium text-sm">{stage.label}</div>
                  <div className="text-xs text-gray-600">
                    {stageOpportunities.length} deals • {formatCurrency(stageTotal)}
                  </div>
                </div>

                <Droppable droppableId={stage.key}>
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="flex-1 p-2 bg-gray-50 rounded-b-lg max-h-[400px] overflow-y-auto space-y-2"
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
                                  <CardTitle className="text-sm font-medium leading-tight">
                                    {opportunity.title}
                                  </CardTitle>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                        <MoreVertical className="h-3 w-3" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem>View Details</DropdownMenuItem>
                                      <DropdownMenuItem>Edit</DropdownMenuItem>
                                      <DropdownMenuItem>Delete</DropdownMenuItem>
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

                                {opportunity.assignedTo && (
                                  <div className="flex items-center text-xs text-gray-500">
                                    <User className="w-3 h-3 mr-1" />
                                    <span className="truncate">{opportunity.assignedTo}</span>
                                  </div>
                                )}

                                {opportunity.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {opportunity.tags.slice(0, 2).map((tag) => (
                                      <Badge key={tag} variant="secondary" className="text-xs px-1 py-0">
                                        {tag}
                                      </Badge>
                                    ))}
                                    {opportunity.tags.length > 2 && (
                                      <Badge variant="outline" className="text-xs px-1 py-0">
                                        +{opportunity.tags.length - 2}
                                      </Badge>
                                    )}
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          )}
                        </Draggable>
                      ))}
                      {stageOpportunities.length > 5 && (
                        <div className="text-center text-xs text-gray-500 py-2 px-2 mt-2 bg-gray-100 border border-gray-200 rounded sticky bottom-0">
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
    </div>
  );
}