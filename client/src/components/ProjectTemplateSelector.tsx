import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProjectSchema } from "@shared/schema";
import type { ProjectTemplate, ProjectTemplateWithTasks, Client, User, Company } from "@shared/schema";
import { z } from "zod";
import {
  FileText,
  Folder,
  Clock,
  DollarSign,
  CheckCircle,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { IndustryBadge, getIndustryLabel } from "@/components/ui/StandardSelects";

// Form schema for creating project from template
const projectFromTemplateSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  companyId: z.string().min(1, "Company is required"),
  clientId: z.string().optional(),
  managerId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
}).refine((data) => {
  // Validate that end date is not before start date
  if (data.startDate && data.endDate) {
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    return endDate >= startDate;
  }
  return true;
}, {
  message: "End date cannot be before start date",
  path: ["endDate"],
});

type ProjectFromTemplateData = z.infer<typeof projectFromTemplateSchema>;

interface ProjectTemplateSelectorProps {
  onProjectCreated: () => void;
  triggerButton?: React.ReactNode;
}

export function ProjectTemplateSelector({ onProjectCreated, triggerButton }: ProjectTemplateSelectorProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplateWithTasks | null>(null);
  const [showProjectForm, setShowProjectForm] = useState(false);

  // Fetch project templates
  const { data: templates, isLoading: templatesLoading } = useQuery<ProjectTemplate[]>({
    queryKey: ["/api/project-templates"],
    enabled: isOpen,
  });

  // Fetch template details when selected
  const { data: templateDetails, isLoading: templateLoading } = useQuery<ProjectTemplateWithTasks>({
    queryKey: ["/api/project-templates", selectedTemplate?.id],
    enabled: !!selectedTemplate?.id,
  });

  // Fetch clients, companies, and users for project form
  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    enabled: showProjectForm,
  });

  const { data: companies } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
    enabled: showProjectForm,
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: showProjectForm,
  });

  const form = useForm<ProjectFromTemplateData>({
    resolver: zodResolver(projectFromTemplateSchema),
    defaultValues: {
      name: "",
      description: "",
      companyId: "",
      clientId: "",
      managerId: "",
      startDate: "",
      endDate: "",
    },
  });

  const createProjectMutation = useMutation({
    mutationFn: async (data: ProjectFromTemplateData) => {
      if (!selectedTemplate) throw new Error("No template selected");

      const response = await apiRequest("POST", `/api/projects/from-template/${selectedTemplate.id}`, data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Success",
        description: `Project "${data.project.name}" created with ${data.tasks.length} tasks`
      });
      setIsOpen(false);
      setSelectedTemplate(null);
      setShowProjectForm(false);
      form.reset();
      onProjectCreated();
    },
    onError: (error: any) => {
      console.error("Project creation error:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to create project from template",
        variant: "destructive"
      });
    },
  });

  const handleTemplateSelect = (template: ProjectTemplate) => {
    setSelectedTemplate(template);
  };

  const handleCreateProject = () => {
    if (!selectedTemplate) return;

    // Pre-fill form with template data
    form.setValue("name", selectedTemplate.name);
    form.setValue("description", selectedTemplate.description || "");

    setShowProjectForm(true);
  };

  const onSubmit = (data: ProjectFromTemplateData) => {
    console.log("🚀 onSubmit called! Form submission triggered with data:", data);

    // Clean up form data - convert empty strings to undefined for optional fields
    const cleanedData = {
      ...data,
      // Keep companyId as-is since it's required
      clientId: data.clientId || undefined,
      managerId: data.managerId || undefined,
      startDate: data.startDate ? new Date(data.startDate).toISOString() : undefined,
      endDate: data.endDate ? new Date(data.endDate).toISOString() : undefined,
      description: data.description || undefined,
    };

    console.log("Cleaned form data:", cleanedData);
    console.log("Selected template:", selectedTemplate);

    createProjectMutation.mutate(cleanedData);
  };

  // Removed getIndustryColor - now using centralized constants

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button variant="outline" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Use Template
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {showProjectForm ? "Create Project from Template" : "Choose Project Template"}
          </DialogTitle>
        </DialogHeader>

        {!showProjectForm ? (
          <div className="space-y-4">
            {templatesLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : !templates?.length ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No project templates available</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Contact your administrator to create project templates
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.map((template) => (
                  <Card
                    key={template.id}
                    className={`cursor-pointer transition-all hover:shadow-lg ${
                      selectedTemplate?.id === template.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <Folder className="w-4 h-4" />
                            {template.name}
                          </CardTitle>
                          {template.industry && (
                            <IndustryBadge
                              industry={template.industry}
                              className="mt-2 text-xs"
                            />
                          )}
                        </div>
                        {selectedTemplate?.id === template.id && (
                          <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {template.description && (
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {template.description}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {template.estimatedDuration && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {template.estimatedDuration} days
                          </div>
                        )}
                        {template.defaultBudget && (
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            £{parseFloat(template.defaultBudget).toLocaleString()}
                          </div>
                        )}
                      </div>

                      {template.tags && template.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {template.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {template.tags.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{template.tags.length - 3} more
                            </Badge>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {selectedTemplate && templateDetails && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-lg">Template Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Included Tasks ({templateDetails.taskTemplates?.length || 0})</h4>
                      {templateDetails.taskTemplates?.length ? (
                        <div className="space-y-2">
                          {templateDetails.taskTemplates.slice(0, 5).map((task, index) => (
                            <div key={task.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                              <span className="text-sm">{task.title}</span>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                {task.estimatedHours && (
                                  <span>{task.estimatedHours}h</span>
                                )}
                                {task.priority && (
                                  <Badge variant="outline" className="text-xs">
                                    {task.priority}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ))}
                          {templateDetails.taskTemplates.length > 5 && (
                            <p className="text-sm text-muted-foreground">
                              +{templateDetails.taskTemplates.length - 5} more tasks...
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No tasks defined for this template</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(
                onSubmit,
                (errors) => {
                  console.log("❌ Form validation errors:", errors);
                  console.log("Form values:", form.getValues());
                }
              )}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter project name" {...field} />
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
                      <FormLabel>Company *</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          // Reset client when company changes
                          form.setValue("clientId", "");
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
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
                  name="clientId"
                  render={({ field }) => {
                    const selectedCompanyId = form.watch("companyId");
                    const availableClients = clients?.filter(client =>
                      client.companyId === selectedCompanyId
                    ) || [];

                    return (
                      <FormItem>
                        <FormLabel>Client</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={!selectedCompanyId}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue
                                placeholder={
                                  !selectedCompanyId
                                    ? "Select company first"
                                    : availableClients.length === 0
                                    ? "No clients for this company"
                                    : "Select client"
                                }
                              />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {availableClients.map((client) => (
                              <SelectItem key={client.id} value={client.id}>
                                {client.name} {client.position && `(${client.position})`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                <FormField
                  control={form.control}
                  name="managerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Manager</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select manager" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {users?.filter(user => user.role === 'manager' || user.role === 'admin').map((user) => (
                            <SelectItem key={user.id} value={user.id}>
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
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Customize the project description..."
                        {...field}
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedTemplate && (
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between text-sm">
                      <span>Using template: <strong>{selectedTemplate.name}</strong></span>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        {templateDetails?.taskTemplates?.length && (
                          <span>{templateDetails.taskTemplates.length} tasks will be created</span>
                        )}
                        {selectedTemplate.defaultBudget && (
                          <span>Budget: £{parseFloat(selectedTemplate.defaultBudget).toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Form Footer - Inside Form */}
              <div className="flex justify-between w-full pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowProjectForm(false)}
                  type="button"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={createProjectMutation.isPending}
                  className="flex items-center gap-2"
                >
                  {createProjectMutation.isPending ? "Creating..." : "Create Project"}
                  <Sparkles className="w-4 h-4" />
                </Button>
              </div>
            </form>
          </Form>
        )}

        {!showProjectForm && (
          <DialogFooter>
            <div className="flex justify-between w-full">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateProject}
                disabled={!selectedTemplate}
                className="flex items-center gap-2"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}