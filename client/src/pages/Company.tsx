import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { format, isToday, isSameDay } from "date-fns";
import {
  Calendar as CalendarIcon,
  Building2,
  TrendingUp,
  Users,
  FolderOpen,
  Clock,
  AlertCircle,
  CheckCircle,
  PoundSterling,
  Target,
  Star,
  MapPin,
  Phone,
  Mail
} from "lucide-react";
import type { Client, Project } from "@shared/schema";

interface CompanyEvent {
  id: string;
  title: string;
  description?: string;
  date: Date;
  type: "meeting" | "deadline" | "milestone" | "announcement" | "holiday";
  priority: "low" | "medium" | "high" | "urgent";
  attendees?: string[];
  location?: string;
}

interface ClientEvent {
  id: string;
  clientId: string;
  clientName: string;
  title: string;
  description?: string;
  date: Date;
  type: "sale" | "project_start" | "project_end" | "review" | "contract";
  value?: number;
  status: "upcoming" | "completed" | "cancelled";
}

export default function Company() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [viewMode, setViewMode] = useState<"month" | "week" | "day">("month");

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

  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    enabled: isAuthenticated,
  });

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    enabled: isAuthenticated,
  });

  // Mock company events data - in a real app, this would come from an API
  const companyEvents: CompanyEvent[] = [
    {
      id: "1",
      title: "Quarterly Board Meeting",
      description: "Q4 financial review and strategic planning",
      date: new Date(2025, 11, 15),
      type: "meeting",
      priority: "high",
      attendees: ["John Doe", "Jane Smith", "Mike Johnson"],
      location: "Conference Room A"
    },
    {
      id: "2",
      title: "Product Launch Deadline",
      description: "Final deadline for new product release",
      date: new Date(2025, 11, 20),
      type: "deadline",
      priority: "urgent"
    },
    {
      id: "3",
      title: "Company Holiday - Christmas",
      description: "Office closed for Christmas holiday",
      date: new Date(2025, 11, 25),
      type: "holiday",
      priority: "low"
    },
    {
      id: "4",
      title: "Team Building Event",
      description: "Annual team building and celebration",
      date: new Date(2025, 11, 30),
      type: "announcement",
      priority: "medium",
      location: "City Center Hotel"
    }
  ];

  // Mock client events data - in a real app, this would come from an API
  const clientEvents: ClientEvent[] = [
    {
      id: "1",
      clientId: "client-1",
      clientName: "TechCorp Solutions",
      title: "Contract Renewal",
      description: "Annual contract renewal discussion",
      date: new Date(2025, 11, 10),
      type: "contract",
      value: 150000,
      status: "upcoming"
    },
    {
      id: "2",
      clientId: "client-2",
      clientName: "StartupX",
      title: "Project Kickoff",
      description: "New mobile app development project",
      date: new Date(2025, 11, 18),
      type: "project_start",
      value: 75000,
      status: "upcoming"
    },
    {
      id: "3",
      clientId: "client-3",
      clientName: "Enterprise Ltd",
      title: "Monthly Review",
      description: "Progress review and next steps",
      date: new Date(2025, 11, 22),
      type: "review",
      status: "upcoming"
    }
  ];

  if (isLoading || !isAuthenticated) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case "meeting": return "blue";
      case "deadline": return "red";
      case "milestone": return "green";
      case "announcement": return "purple";
      case "holiday": return "gray";
      case "sale": return "emerald";
      case "project_start": return "blue";
      case "project_end": return "indigo";
      case "review": return "yellow";
      case "contract": return "orange";
      default: return "gray";
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "urgent": return AlertCircle;
      case "high": return TrendingUp;
      case "medium": return Clock;
      case "low": return CheckCircle;
      default: return Clock;
    }
  };

  const getEventsForDate = (date: Date) => {
    const companyEventsForDate = companyEvents.filter(event =>
      isSameDay(event.date, date)
    );
    const clientEventsForDate = clientEvents.filter(event =>
      isSameDay(event.date, date)
    );
    return { companyEvents: companyEventsForDate, clientEvents: clientEventsForDate };
  };

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : { companyEvents: [], clientEvents: [] };

  const hasEventsOnDate = (date: Date) => {
    const events = getEventsForDate(date);
    return events.companyEvents.length > 0 || events.clientEvents.length > 0;
  };

  const upcomingCompanyEvents = companyEvents
    .filter(event => event.date >= new Date())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 5);

  const upcomingClientEvents = clientEvents
    .filter(event => event.date >= new Date() && event.status === "upcoming")
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 5);

  return (
    <Layout title="Company" breadcrumbs={["Company"]}>
      <div className="space-y-6">
        {/* Company Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="glassmorphism">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Clients</p>
                  <p className="text-2xl font-bold text-primary">
                    {clients?.length || 0}
                  </p>
                </div>
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="w-6 h-6 text-primary" />
                </div>
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                Active client relationships
              </div>
            </CardContent>
          </Card>

          <Card className="glassmorphism">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Projects</p>
                  <p className="text-2xl font-bold text-success">
                    {projects?.filter(p => p.status === "in_progress").length || 0}
                  </p>
                </div>
                <div className="p-2 bg-success/10 rounded-lg">
                  <FolderOpen className="w-6 h-6 text-success" />
                </div>
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                Currently in progress
              </div>
            </CardContent>
          </Card>

          <Card className="glassmorphism">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Upcoming Events</p>
                  <p className="text-2xl font-bold text-warning">
                    {upcomingCompanyEvents.length + upcomingClientEvents.length}
                  </p>
                </div>
                <div className="p-2 bg-warning/10 rounded-lg">
                  <CalendarIcon className="w-6 h-6 text-warning" />
                </div>
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                Next 30 days
              </div>
            </CardContent>
          </Card>

          <Card className="glassmorphism">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Revenue Pipeline</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    ${clientEvents.reduce((sum, event) => sum + (event.value || 0), 0).toLocaleString()}
                  </p>
                </div>
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <PoundSterling className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                Potential value
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Calendar Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <Card className="glassmorphism lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center">
                <CalendarIcon className="w-5 h-5 mr-2" />
                Company Calendar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border w-full"
                modifiers={{
                  hasEvents: (date) => hasEventsOnDate(date),
                  today: isToday
                }}
                modifiersStyles={{
                  hasEvents: { backgroundColor: "rgba(59, 130, 246, 0.1)", fontWeight: "bold" },
                  today: { backgroundColor: "rgba(34, 197, 94, 0.2)" }
                }}
              />
            </CardContent>
          </Card>

          {/* Selected Date Events */}
          <Card className="glassmorphism">
            <CardHeader>
              <CardTitle className="text-lg">
                {selectedDate ? format(selectedDate, "MMMM d, yyyy") : "Select a date"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {selectedDateEvents.companyEvents.length === 0 && selectedDateEvents.clientEvents.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No events scheduled for this date
                  </p>
                ) : (
                  <>
                    {selectedDateEvents.companyEvents.map((event) => {
                      const PriorityIcon = getPriorityIcon(event.priority);
                      return (
                        <div key={event.id} className="border-l-4 border-l-blue-500 pl-3 py-2">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold text-sm">{event.title}</h4>
                              <p className="text-xs text-muted-foreground mt-1">{event.description}</p>
                              {event.location && (
                                <p className="text-xs text-muted-foreground flex items-center mt-1">
                                  <MapPin className="w-3 h-3 mr-1" />
                                  {event.location}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center space-x-1">
                              <Badge variant="secondary" className="text-xs">
                                {event.type}
                              </Badge>
                              <PriorityIcon className="w-4 h-4 text-muted-foreground" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {selectedDateEvents.clientEvents.map((event) => (
                      <div key={event.id} className="border-l-4 border-l-emerald-500 pl-3 py-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm">{event.title}</h4>
                            <p className="text-xs text-muted-foreground">{event.clientName}</p>
                            <p className="text-xs text-muted-foreground mt-1">{event.description}</p>
                            {event.value && (
                              <p className="text-xs text-emerald-600 font-medium mt-1">
                                ${event.value.toLocaleString()}
                              </p>
                            )}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {event.type.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Events Overview */}
        <Tabs defaultValue="company" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="company">Company Events</TabsTrigger>
            <TabsTrigger value="clients">Client Events</TabsTrigger>
          </TabsList>

          <TabsContent value="company" className="space-y-4">
            <Card className="glassmorphism">
              <CardHeader>
                <CardTitle>Upcoming Company Events</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {upcomingCompanyEvents.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                      No upcoming company events scheduled
                    </p>
                  ) : (
                    upcomingCompanyEvents.map((event) => {
                      const PriorityIcon = getPriorityIcon(event.priority);
                      return (
                        <div key={event.id} className="flex items-start space-x-4 p-4 border rounded-lg hover:shadow-sm transition-shadow">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <CalendarIcon className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-semibold">{event.title}</h3>
                                <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                                <p className="text-sm font-medium mt-2">{format(event.date, "PPP")}</p>
                                {event.location && (
                                  <p className="text-sm text-muted-foreground flex items-center mt-1">
                                    <MapPin className="w-4 h-4 mr-1" />
                                    {event.location}
                                  </p>
                                )}
                                {event.attendees && (
                                  <p className="text-sm text-muted-foreground flex items-center mt-1">
                                    <Users className="w-4 h-4 mr-1" />
                                    {event.attendees.length} attendees
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center space-x-2">
                                <Badge variant="secondary">{event.type}</Badge>
                                <PriorityIcon className="w-4 h-4 text-muted-foreground" />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="clients" className="space-y-4">
            <Card className="glassmorphism">
              <CardHeader>
                <CardTitle>Upcoming Client Events</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {upcomingClientEvents.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                      No upcoming client events scheduled
                    </p>
                  ) : (
                    upcomingClientEvents.map((event) => (
                      <div key={event.id} className="flex items-start space-x-4 p-4 border rounded-lg hover:shadow-sm transition-shadow">
                        <div className="p-2 bg-emerald-100 rounded-lg">
                          <Building2 className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold">{event.title}</h3>
                              <p className="text-sm font-medium text-primary">{event.clientName}</p>
                              <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                              <p className="text-sm font-medium mt-2">{format(event.date, "PPP")}</p>
                              {event.value && (
                                <p className="text-sm text-emerald-600 font-medium mt-1">
                                  Value: ${event.value.toLocaleString()}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline">{event.type.replace('_', ' ')}</Badge>
                              <Badge variant={event.status === "upcoming" ? "default" : "secondary"}>
                                {event.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}