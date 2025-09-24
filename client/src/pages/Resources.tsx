import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Calendar,
  BarChart3,
  Target,
  Zap,
  Settings,
  Plus,
  RefreshCw,
  Filter,
  Search,
  Download,
  FolderOpen,
  CheckSquare
} from "lucide-react";
import type {
  User,
  ResourceAllocation
} from "@shared/schema";

// Define the interfaces locally since they're from the server utils
interface WorkloadCalculation {
  userId: string;
  totalCapacityHours: number;
  totalAllocatedHours: number;
  actualWorkedHours: number;
  availableHours: number;
  utilizationPercentage: number;
  overallocationHours: number;
  isOverallocated: boolean;
  activeProjectsCount: number;
  activeTasksCount: number;
  conflictingAllocations: any[];
}

interface TeamUtilization {
  totalTeamMembers: number;
  averageUtilization: number;
  overallocatedMembers: number;
  underutilizedMembers: number;
  optimalUtilizationMembers: number;
  totalCapacityHours: number;
  totalAllocatedHours: number;
}

export default function Resources() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [selectedTimeRange, setSelectedTimeRange] = useState("week");
  const [activeTab, setActiveTab] = useState("overview");

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

  // Fetch team data
  const { data: teamMembers, isLoading: teamLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: isAuthenticated,
  });

  // Fetch team utilization
  const { data: teamUtilization, isLoading: utilizationLoading } = useQuery<TeamUtilization>({
    queryKey: ["/api/team/utilization", selectedTimeRange],
    enabled: isAuthenticated,
  });

  // Fetch individual workloads
  const { data: workloads, isLoading: workloadsLoading } = useQuery<WorkloadCalculation[]>({
    queryKey: ["/api/workloads", selectedTimeRange],
    enabled: isAuthenticated,
  });

  // Loading state
  if (isLoading || teamLoading || utilizationLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Loading resource management dashboard...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const getUtilizationColor = (percentage: number) => {
    if (percentage > 100) return "text-red-600";
    if (percentage > 85) return "text-orange-600";
    if (percentage > 65) return "text-green-600";
    return "text-blue-600";
  };

  const getUtilizationBadgeVariant = (percentage: number) => {
    if (percentage > 100) return "destructive";
    if (percentage > 85) return "secondary";
    if (percentage > 65) return "default";
    return "outline";
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Resource Management</h1>
            <p className="text-muted-foreground">
              Monitor team capacity, workload, and resource allocation across projects
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Allocate Resource
            </Button>
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="flex items-center space-x-4">
          <span className="text-sm text-muted-foreground">Time Range:</span>
          <Tabs value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
            <TabsList>
              <TabsTrigger value="week">This Week</TabsTrigger>
              <TabsTrigger value="month">This Month</TabsTrigger>
              <TabsTrigger value="quarter">This Quarter</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Alert Banner for Conflicts */}
        {workloads && workloads.filter(w => w.isOverallocated).length > 0 && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <div>
                    <h3 className="font-semibold text-red-800">Resource Conflicts Detected</h3>
                    <p className="text-sm text-red-700">
                      {workloads.filter(w => w.isOverallocated).length} team members are overallocated and need immediate attention
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" className="text-red-700 border-red-300 hover:bg-red-100">
                    View Details
                  </Button>
                  <Button size="sm" className="bg-red-600 hover:bg-red-700">
                    Resolve Conflicts
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {teamUtilization?.totalTeamMembers || teamMembers?.length || 0}
              </div>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <span>
                  {teamUtilization?.overallocatedMembers || 0} overallocated
                </span>
                <span>•</span>
                <span>
                  {teamUtilization?.underutilizedMembers || 0} underutilized
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Utilization</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {teamUtilization?.averageUtilization?.toFixed(1) || "0"}%
              </div>
              <div className="flex items-center space-x-1 text-xs">
                <TrendingUp className="h-3 w-3 text-green-600" />
                <span className="text-green-600">+2.1% from last period</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Capacity</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {teamUtilization?.totalCapacityHours?.toFixed(0) || "0"}h
              </div>
              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                <span>
                  {teamUtilization?.totalAllocatedHours?.toFixed(0) || "0"}h allocated
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className={workloads?.filter(w => w.isOverallocated).length ? "border-red-200" : ""}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conflicts</CardTitle>
              <AlertTriangle className={`h-4 w-4 ${workloads?.filter(w => w.isOverallocated).length ? "text-red-600 animate-pulse" : "text-muted-foreground"}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${workloads?.filter(w => w.isOverallocated).length ? "text-red-600" : ""}`}>
                {workloads?.filter(w => w.isOverallocated).length || 0}
              </div>
              <div className={`flex items-center space-x-1 text-xs ${workloads?.filter(w => w.isOverallocated).length ? "text-red-600" : "text-muted-foreground"}`}>
                <AlertTriangle className="h-3 w-3" />
                <span>{workloads?.filter(w => w.isOverallocated).length ? "Require attention" : "All clear"}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Team Overview</TabsTrigger>
            <TabsTrigger value="allocations">Allocations</TabsTrigger>
            <TabsTrigger value="capacity">Capacity Planning</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Critical Issues Alert */}
            {workloads && workloads.filter(w => w.isOverallocated).length > 0 && (
              <Card className="border-red-200 bg-red-50">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-red-800">
                    <AlertTriangle className="h-5 w-5" />
                    <span>Critical Resource Conflicts</span>
                  </CardTitle>
                  <p className="text-sm text-red-700">
                    Immediate action required - the following team members are overallocated
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {workloads.filter(w => w.isOverallocated).map((workload) => {
                      const member = teamMembers?.find(m => m.id === workload.userId);
                      return (
                        <div key={workload.userId} className="flex items-center justify-between p-3 bg-white border border-red-200 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={member?.profileImageUrl || ""} />
                              <AvatarFallback className="bg-red-100 text-red-800 text-xs">
                                {member?.firstName?.[0]}{member?.lastName?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium text-sm">
                                {member?.firstName} {member?.lastName}
                              </div>
                              <div className="text-xs text-red-600">
                                Overallocated by {workload.overallocationHours.toFixed(1)}h ({workload.utilizationPercentage.toFixed(1)}%)
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant="destructive" className="text-xs">
                              CRITICAL
                            </Badge>
                            <Button variant="outline" size="sm" className="text-red-700 border-red-300 hover:bg-red-50">
                              Rebalance
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Team Workload Overview</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {workloadsLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <RefreshCw className="h-6 w-6 animate-spin" />
                    </div>
                  ) : workloads && workloads.length > 0 ? (
                    <div className="space-y-6">
                      {/* Utilization Summary */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
                        <div className="text-center">
                          <div className="text-sm text-muted-foreground">Optimal</div>
                          <div className="text-xl font-semibold text-green-600">
                            {workloads.filter(w => w.utilizationPercentage >= 65 && w.utilizationPercentage <= 85).length}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-muted-foreground">Under-utilized</div>
                          <div className="text-xl font-semibold text-blue-600">
                            {workloads.filter(w => w.utilizationPercentage < 65).length}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-muted-foreground">Near Capacity</div>
                          <div className="text-xl font-semibold text-orange-600">
                            {workloads.filter(w => w.utilizationPercentage > 85 && w.utilizationPercentage <= 100).length}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-muted-foreground">Overallocated</div>
                          <div className="text-xl font-semibold text-red-600">
                            {workloads.filter(w => w.utilizationPercentage > 100).length}
                          </div>
                        </div>
                      </div>

                      {/* Team Member Cards */}
                      <div className="space-y-4">
                        {workloads
                          .sort((a, b) => b.utilizationPercentage - a.utilizationPercentage)
                          .map((workload) => {
                            const member = teamMembers?.find(m => m.id === workload.userId);
                            const utilizationColor = getUtilizationColor(workload.utilizationPercentage);
                            return (
                              <div key={workload.userId} className="group hover:shadow-md transition-shadow duration-200 border rounded-lg p-4 space-y-4">
                                {/* Header Row */}
                                <div className="flex items-center space-x-4">
                                  <Avatar className="h-12 w-12">
                                    <AvatarImage src={member?.profileImageUrl || ""} />
                                    <AvatarFallback className="bg-primary/10 text-primary">
                                      {member?.firstName?.[0]}{member?.lastName?.[0]}
                                    </AvatarFallback>
                                  </Avatar>

                                  <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <h3 className="font-semibold text-lg">
                                          {member?.firstName} {member?.lastName}
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                          {member?.position || member?.department || "Team Member"}
                                        </p>
                                      </div>
                                      <div className="text-right">
                                        <Badge
                                          variant={getUtilizationBadgeVariant(workload.utilizationPercentage)}
                                          className="text-sm font-semibold"
                                        >
                                          {workload.utilizationPercentage.toFixed(1)}%
                                        </Badge>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Progress and Details */}
                                <div className="space-y-3">
                                  {/* Capacity Bar */}
                                  <div className="space-y-1">
                                    <div className="flex justify-between items-center text-sm">
                                      <span className="text-muted-foreground">
                                        Capacity Utilization
                                      </span>
                                      <span className={`font-medium ${utilizationColor}`}>
                                        {workload.totalAllocatedHours.toFixed(1)}h / {workload.totalCapacityHours.toFixed(1)}h
                                      </span>
                                    </div>
                                    <div className="relative">
                                      <Progress
                                        value={Math.min(workload.utilizationPercentage, 100)}
                                        className="h-3"
                                      />
                                      {workload.utilizationPercentage > 100 && (
                                        <div
                                          className="absolute top-0 left-0 h-3 bg-red-600/20 rounded-full"
                                          style={{ width: `${Math.min((workload.utilizationPercentage - 100) * 2, 50)}%` }}
                                        />
                                      )}
                                    </div>
                                  </div>

                                  {/* Workload Details */}
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div className="flex items-center space-x-2">
                                      <FolderOpen className="h-4 w-4 text-muted-foreground" />
                                      <span>
                                        <span className="font-medium">{workload.activeProjectsCount}</span> Projects
                                      </span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <CheckSquare className="h-4 w-4 text-muted-foreground" />
                                      <span>
                                        <span className="font-medium">{workload.activeTasksCount}</span> Tasks
                                      </span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <Clock className="h-4 w-4 text-muted-foreground" />
                                      <span>
                                        <span className="font-medium">{workload.availableHours.toFixed(1)}h</span> Available
                                      </span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <BarChart3 className="h-4 w-4 text-muted-foreground" />
                                      <span>
                                        <span className="font-medium">{workload.actualWorkedHours.toFixed(1)}h</span> Worked
                                      </span>
                                    </div>
                                  </div>

                                  {/* Alerts and Status */}
                                  {workload.isOverallocated && (
                                    <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                                      <div className="flex items-center space-x-2 text-red-700">
                                        <AlertTriangle className="h-4 w-4" />
                                        <span className="font-medium">
                                          Overallocated by {workload.overallocationHours.toFixed(1)} hours
                                        </span>
                                      </div>
                                      <Button variant="outline" size="sm" className="text-red-700 border-red-300 hover:bg-red-50">
                                        <Settings className="h-3 w-3 mr-1" />
                                        Rebalance
                                      </Button>
                                    </div>
                                  )}

                                  {workload.availableHours > 10 && (
                                    <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                                      <div className="flex items-center space-x-2 text-green-700">
                                        <Zap className="h-4 w-4" />
                                        <span className="font-medium">
                                          Available for new assignments
                                        </span>
                                      </div>
                                      <Button variant="outline" size="sm" className="text-green-700 border-green-300 hover:bg-green-50">
                                        <Plus className="h-3 w-3 mr-1" />
                                        Assign Task
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-semibold mb-2">No Team Data Available</h3>
                      <p className="text-muted-foreground mb-4">
                        No workload data found for the selected time period. Check if team members have active assignments.
                      </p>
                      <Button>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Refresh Data
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="allocations" className="space-y-6">
            {/* Allocation Filters */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Resource Allocations</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Manage project and task assignments for team members
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      <Filter className="mr-2 h-4 w-4" />
                      Filter
                    </Button>
                    <Button size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      New Allocation
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Time Scale Controls */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <Button variant={selectedTimeRange === "week" ? "default" : "outline"} size="sm">
                      Week View
                    </Button>
                    <Button variant={selectedTimeRange === "month" ? "default" : "outline"} size="sm">
                      Month View
                    </Button>
                    <Button variant={selectedTimeRange === "quarter" ? "default" : "outline"} size="sm">
                      Quarter View
                    </Button>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <span>Navigate:</span>
                    <Button variant="outline" size="sm">←</Button>
                    <span className="min-w-[120px] text-center">
                      {selectedTimeRange === "week" ? "Week of Sep 23" :
                       selectedTimeRange === "month" ? "September 2025" : "Q4 2025"}
                    </span>
                    <Button variant="outline" size="sm">→</Button>
                  </div>
                </div>

                {/* Timeline Grid */}
                <div className="space-y-4">
                  {workloadsLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <RefreshCw className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (
                    <div className="border rounded-lg overflow-hidden">
                      {/* Timeline Header */}
                      <div className="grid grid-cols-8 bg-muted/30 border-b">
                        <div className="p-3 font-medium border-r">Team Member</div>
                        <div className="p-2 text-center text-sm font-medium border-r">Mon 23</div>
                        <div className="p-2 text-center text-sm font-medium border-r">Tue 24</div>
                        <div className="p-2 text-center text-sm font-medium border-r">Wed 25</div>
                        <div className="p-2 text-center text-sm font-medium border-r">Thu 26</div>
                        <div className="p-2 text-center text-sm font-medium border-r">Fri 27</div>
                        <div className="p-2 text-center text-sm font-medium border-r">Sat 28</div>
                        <div className="p-2 text-center text-sm font-medium">Sun 29</div>
                      </div>

                      {/* Timeline Rows */}
                      {workloads?.slice(0, 5).map((workload, index) => {
                        const member = teamMembers?.find(m => m.id === workload.userId);
                        return (
                          <div key={workload.userId} className="grid grid-cols-8 border-b last:border-b-0 hover:bg-muted/20">
                            {/* Member Info */}
                            <div className="p-3 border-r flex items-center space-x-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={member?.profileImageUrl || ""} />
                                <AvatarFallback className="text-xs">
                                  {member?.firstName?.[0]}{member?.lastName?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium text-sm">
                                  {member?.firstName} {member?.lastName}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {workload.utilizationPercentage.toFixed(0)}% utilized
                                </div>
                              </div>
                            </div>

                            {/* Daily Allocation Bars */}
                            {[0, 1, 2, 3, 4, 5, 6].map((day) => {
                              const dayUtilization = Math.random() * 100; // Mock data
                              const isWeekend = day >= 5;
                              return (
                                <div key={day} className="p-2 border-r last:border-r-0 relative group">
                                  <div className={`h-6 rounded-sm flex items-center justify-center text-xs font-medium transition-all ${
                                    isWeekend
                                      ? "bg-gray-100"
                                      : dayUtilization > 100
                                        ? "bg-red-500 text-white"
                                        : dayUtilization > 85
                                          ? "bg-orange-500 text-white"
                                          : dayUtilization > 65
                                            ? "bg-green-500 text-white"
                                            : "bg-blue-500 text-white"
                                  }`}>
                                    {isWeekend ? "-" : Math.floor(dayUtilization)}%
                                  </div>

                                  {/* Tooltip on hover */}
                                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                                    <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                                      {isWeekend ? "Weekend" : `${Math.floor(dayUtilization)}% (${(dayUtilization * 0.08).toFixed(1)}h)`}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Allocation Legend */}
                  <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                    <div className="flex items-center space-x-6">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-blue-500 rounded"></div>
                        <span className="text-sm">Under-utilized (&lt;65%)</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-green-500 rounded"></div>
                        <span className="text-sm">Optimal (65-85%)</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-orange-500 rounded"></div>
                        <span className="text-sm">Near Capacity (85-100%)</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-red-500 rounded"></div>
                        <span className="text-sm">Overallocated (&gt;100%)</span>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      <Download className="mr-2 h-4 w-4" />
                      Export Timeline
                    </Button>
                  </div>

                  {/* Quick Actions */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Button variant="outline" className="h-16 flex-col space-y-1">
                          <Plus className="h-5 w-5" />
                          <span>Create Allocation</span>
                        </Button>
                        <Button variant="outline" className="h-16 flex-col space-y-1">
                          <Settings className="h-5 w-5" />
                          <span>Bulk Reassign</span>
                        </Button>
                        <Button variant="outline" className="h-16 flex-col space-y-1">
                          <Calendar className="h-5 w-5" />
                          <span>Schedule Review</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="capacity" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Current vs Projected Capacity */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="h-5 w-5" />
                    <span>Capacity Overview</span>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Current team capacity and projected needs
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Current Period */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Current Period ({selectedTimeRange})</span>
                      <span className="text-sm text-muted-foreground">
                        {teamUtilization?.totalAllocatedHours?.toFixed(0) || "0"}h / {teamUtilization?.totalCapacityHours?.toFixed(0) || "0"}h
                      </span>
                    </div>
                    <Progress
                      value={teamUtilization ? (teamUtilization.totalAllocatedHours / teamUtilization.totalCapacityHours) * 100 : 0}
                      className="h-3"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Available: {teamUtilization ? (teamUtilization.totalCapacityHours - teamUtilization.totalAllocatedHours).toFixed(0) : "0"}h</span>
                      <span>{teamUtilization?.averageUtilization?.toFixed(1) || "0"}% utilized</span>
                    </div>
                  </div>

                  {/* Projected Periods */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm">Projections</h4>
                    {["Next Week", "Next Month", "Next Quarter"].map((period, index) => {
                      const projectedUtilization = Math.random() * 120; // Mock data
                      const projectedHours = Math.random() * 400 + 200;
                      const capacityHours = 320;
                      return (
                        <div key={period} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm">{period}</span>
                            <span className="text-sm text-muted-foreground">
                              {projectedHours.toFixed(0)}h / {capacityHours}h
                            </span>
                          </div>
                          <Progress
                            value={Math.min(projectedUtilization, 100)}
                            className="h-2"
                          />
                          <div className="flex justify-between text-xs">
                            <span className={`${projectedUtilization > 100 ? "text-red-600" : "text-muted-foreground"}`}>
                              {projectedUtilization > 100 ? "Overallocated" : "Available"}: {Math.abs(capacityHours - projectedHours).toFixed(0)}h
                            </span>
                            <span className={projectedUtilization > 100 ? "text-red-600" : "text-muted-foreground"}>
                              {projectedUtilization.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Resource Demand Forecast */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5" />
                    <span>Demand Forecast</span>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Upcoming resource requirements
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    {[
                      { project: "E-commerce Platform", demand: 120, priority: "High", startDate: "Oct 1" },
                      { project: "Mobile App Redesign", demand: 80, priority: "Medium", startDate: "Oct 15" },
                      { project: "API Integration", demand: 60, priority: "Low", startDate: "Nov 1" },
                      { project: "Database Migration", demand: 100, priority: "High", startDate: "Nov 15" }
                    ].map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="space-y-1">
                          <div className="font-medium text-sm">{item.project}</div>
                          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                            <span>Starts {item.startDate}</span>
                            <span>•</span>
                            <Badge
                              variant={item.priority === "High" ? "destructive" : item.priority === "Medium" ? "secondary" : "outline"}
                              className="text-xs"
                            >
                              {item.priority}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-sm">{item.demand}h</div>
                          <div className="text-xs text-muted-foreground">required</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Capacity Planning Tools */}
            <Card>
              <CardHeader>
                <CardTitle>Planning Tools</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Optimize resource allocation and plan for future capacity needs
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Button variant="outline" className="h-20 flex-col space-y-2">
                    <Users className="h-6 w-6" />
                    <div className="text-center">
                      <div className="text-sm font-medium">Hire Planning</div>
                      <div className="text-xs text-muted-foreground">Plan new hires</div>
                    </div>
                  </Button>

                  <Button variant="outline" className="h-20 flex-col space-y-2">
                    <Calendar className="h-6 w-6" />
                    <div className="text-center">
                      <div className="text-sm font-medium">Schedule Optimizer</div>
                      <div className="text-xs text-muted-foreground">Optimize workloads</div>
                    </div>
                  </Button>

                  <Button variant="outline" className="h-20 flex-col space-y-2">
                    <AlertTriangle className="h-6 w-6" />
                    <div className="text-center">
                      <div className="text-sm font-medium">Bottleneck Analysis</div>
                      <div className="text-xs text-muted-foreground">Identify constraints</div>
                    </div>
                  </Button>

                  <Button variant="outline" className="h-20 flex-col space-y-2">
                    <BarChart3 className="h-6 w-6" />
                    <div className="text-center">
                      <div className="text-sm font-medium">Scenario Planning</div>
                      <div className="text-xs text-muted-foreground">What-if analysis</div>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Skills Matrix */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="h-5 w-5" />
                  <span>Skills & Availability Matrix</span>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Team skills and current availability for optimal resource allocation
                </p>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 font-medium">Team Member</th>
                        <th className="text-center p-2 font-medium">Frontend</th>
                        <th className="text-center p-2 font-medium">Backend</th>
                        <th className="text-center p-2 font-medium">Design</th>
                        <th className="text-center p-2 font-medium">DevOps</th>
                        <th className="text-center p-2 font-medium">Availability</th>
                        <th className="text-center p-2 font-medium">Next Free</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workloads?.slice(0, 6).map((workload) => {
                        const member = teamMembers?.find(m => m.id === workload.userId);
                        return (
                          <tr key={workload.userId} className="border-b hover:bg-muted/20">
                            <td className="p-2">
                              <div className="flex items-center space-x-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={member?.profileImageUrl || ""} />
                                  <AvatarFallback className="text-xs">
                                    {member?.firstName?.[0]}{member?.lastName?.[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm">{member?.firstName} {member?.lastName}</span>
                              </div>
                            </td>
                            <td className="text-center p-2">
                              <div className={`w-2 h-2 rounded-full mx-auto ${Math.random() > 0.3 ? "bg-green-500" : "bg-gray-300"}`}></div>
                            </td>
                            <td className="text-center p-2">
                              <div className={`w-2 h-2 rounded-full mx-auto ${Math.random() > 0.5 ? "bg-green-500" : "bg-gray-300"}`}></div>
                            </td>
                            <td className="text-center p-2">
                              <div className={`w-2 h-2 rounded-full mx-auto ${Math.random() > 0.7 ? "bg-green-500" : "bg-gray-300"}`}></div>
                            </td>
                            <td className="text-center p-2">
                              <div className={`w-2 h-2 rounded-full mx-auto ${Math.random() > 0.8 ? "bg-green-500" : "bg-gray-300"}`}></div>
                            </td>
                            <td className="text-center p-2">
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                workload.availableHours > 10 ? "bg-green-100 text-green-800" :
                                workload.availableHours > 5 ? "bg-orange-100 text-orange-800" :
                                "bg-red-100 text-red-800"
                              }`}>
                                {workload.availableHours.toFixed(0)}h
                              </span>
                            </td>
                            <td className="text-center p-2 text-xs text-muted-foreground">
                              {workload.availableHours > 10 ? "Now" : "Oct 15"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            {/* Analytics Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Efficiency Score</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">87.2%</div>
                  <div className="flex items-center space-x-1 text-xs text-green-600">
                    <TrendingUp className="h-3 w-3" />
                    <span>+2.4% from last period</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Resource Waste</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">12.3h</div>
                  <div className="flex items-center space-x-1 text-xs text-orange-600">
                    <TrendingDown className="h-3 w-3" />
                    <span>-1.2h from last period</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Project Velocity</CardTitle>
                  <Zap className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">23.5</div>
                  <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                    <span>tasks/week avg</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Burnout Risk</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">2</div>
                  <div className="flex items-center space-x-1 text-xs text-red-600">
                    <AlertTriangle className="h-3 w-3" />
                    <span>members at risk</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Utilization Trends Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5" />
                    <span>Utilization Trends</span>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Team utilization over the last 8 weeks
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Mock Chart Data */}
                    {["Week 1", "Week 2", "Week 3", "Week 4", "Week 5", "Week 6", "Week 7", "Week 8"].map((week, index) => {
                      const utilization = 60 + Math.random() * 40; // Mock data between 60-100%
                      return (
                        <div key={week} className="flex items-center space-x-4">
                          <span className="w-16 text-sm text-muted-foreground">{week}</span>
                          <div className="flex-1 flex items-center space-x-2">
                            <Progress value={utilization} className="flex-1 h-2" />
                            <span className={`text-sm font-medium w-12 ${
                              utilization > 90 ? "text-red-600" :
                              utilization > 75 ? "text-orange-600" :
                              "text-green-600"
                            }`}>
                              {utilization.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Performance Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="h-5 w-5" />
                    <span>Performance Breakdown</span>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Resource performance by category
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { label: "Task Completion Rate", value: 94, color: "bg-green-500" },
                      { label: "On-Time Delivery", value: 87, color: "bg-blue-500" },
                      { label: "Quality Score", value: 91, color: "bg-purple-500" },
                      { label: "Client Satisfaction", value: 88, color: "bg-orange-500" },
                      { label: "Team Collaboration", value: 82, color: "bg-pink-500" }
                    ].map((metric) => (
                      <div key={metric.label} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{metric.label}</span>
                          <span className="text-sm text-muted-foreground">{metric.value}%</span>
                        </div>
                        <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`absolute top-0 left-0 h-full ${metric.color} transition-all duration-300`}
                            style={{ width: `${metric.value}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Top Performers */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5" />
                    <span>Top Performers</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {workloads?.slice(0, 3).map((workload, index) => {
                      const member = teamMembers?.find(m => m.id === workload.userId);
                      const performance = 85 + Math.random() * 15; // Mock performance score
                      return (
                        <div key={workload.userId} className="flex items-center space-x-3">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                            index === 0 ? "bg-yellow-500" :
                            index === 1 ? "bg-gray-400" :
                            "bg-amber-600"
                          }`}>
                            {index + 1}
                          </div>
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={member?.profileImageUrl || ""} />
                            <AvatarFallback className="text-xs">
                              {member?.firstName?.[0]}{member?.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="text-sm font-medium">
                              {member?.firstName} {member?.lastName}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {performance.toFixed(1)}% efficiency
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Project Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <FolderOpen className="h-5 w-5" />
                    <span>Project Distribution</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { name: "E-commerce Platform", hours: 120, color: "bg-blue-500" },
                      { name: "Mobile App", hours: 80, color: "bg-green-500" },
                      { name: "API Integration", hours: 60, color: "bg-purple-500" },
                      { name: "UI Redesign", hours: 40, color: "bg-orange-500" }
                    ].map((project) => (
                      <div key={project.name} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{project.name}</span>
                          <span className="text-muted-foreground">{project.hours}h</span>
                        </div>
                        <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`absolute top-0 left-0 h-full ${project.color}`}
                            style={{ width: `${(project.hours / 120) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Resource Health */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5" />
                    <span>Resource Health</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm font-medium">Healthy</span>
                      </div>
                      <span className="text-sm text-green-700">
                        {workloads?.filter(w => w.utilizationPercentage >= 65 && w.utilizationPercentage <= 85).length || 0} members
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                        <span className="text-sm font-medium">At Risk</span>
                      </div>
                      <span className="text-sm text-orange-700">
                        {workloads?.filter(w => w.utilizationPercentage > 85).length || 0} members
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <span className="text-sm font-medium">Overloaded</span>
                      </div>
                      <span className="text-sm text-red-700">
                        {workloads?.filter(w => w.utilizationPercentage > 100).length || 0} members
                      </span>
                    </div>

                    <div className="pt-2">
                      <Button variant="outline" className="w-full" size="sm">
                        <Download className="mr-2 h-4 w-4" />
                        Export Report
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}