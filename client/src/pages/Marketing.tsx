import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import type { MarketingCampaign } from "@shared/schema";
import { 
  Plus, 
  Search, 
  Megaphone, 
  TrendingUp,
  Target,
  Calendar,
  PoundSterling,
  Users,
  BarChart3,
  Mail,
  Globe,
  Zap,
  MoreHorizontal
} from "lucide-react";

export default function Marketing() {
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

  const { data: campaigns, isLoading: campaignsLoading } = useQuery<MarketingCampaign[]>({
    queryKey: ["/api/marketing/campaigns"],
    enabled: isAuthenticated,
  });

  if (isLoading || !isAuthenticated) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "default";
      case "planning": return "secondary";
      case "paused": return "outline";
      case "completed": return "default";
      default: return "secondary";
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel.toLowerCase()) {
      case "email": return Mail;
      case "social": return Users;
      case "web": return Globe;
      default: return Megaphone;
    }
  };

  const filteredCampaigns = campaigns?.filter((campaign: MarketingCampaign) =>
    campaign.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    campaign.type?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const totalBudget = campaigns?.reduce((sum: number, campaign: MarketingCampaign) => 
    sum + parseFloat(campaign.budget || '0'), 0) || 0;

  const totalSpent = campaigns?.reduce((sum: number, campaign: MarketingCampaign) => 
    sum + parseFloat(campaign.spent || '0'), 0) || 0;

  const activeCampaigns = campaigns?.filter((c: MarketingCampaign) => c.status === 'active').length || 0;

  return (
    <Layout title="Marketing" breadcrumbs={["Marketing"]}>
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search campaigns..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-80"
                data-testid="input-search-marketing"
              />
            </div>
          </div>
          <Button data-testid="button-create-campaign">
            <Plus className="w-4 h-4 mr-2" />
            Create Campaign
          </Button>
        </div>

        {/* Marketing Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="glassmorphism">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Campaigns</p>
                  <p className="text-2xl font-bold" data-testid="text-active-campaigns">
                    {activeCampaigns}
                  </p>
                </div>
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Megaphone className="w-6 h-6 text-primary" />
                </div>
              </div>
              <div className="flex items-center space-x-1 text-sm text-success mt-2">
                <TrendingUp className="w-3 h-3" />
                <span>+2 this month</span>
              </div>
            </CardContent>
          </Card>

          <Card className="glassmorphism">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Budget</p>
                  <p className="text-2xl font-bold text-primary" data-testid="text-total-budget">
                    £{totalBudget.toLocaleString()}
                  </p>
                </div>
                <div className="p-2 bg-primary/10 rounded-lg">
                  <PoundSterling className="w-6 h-6 text-primary" />
                </div>
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                Across all campaigns
              </div>
            </CardContent>
          </Card>

          <Card className="glassmorphism">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Spent</p>
                  <p className="text-2xl font-bold text-destructive" data-testid="text-total-spent">
                    £{totalSpent.toLocaleString()}
                  </p>
                </div>
                <div className="p-2 bg-destructive/10 rounded-lg">
                  <BarChart3 className="w-6 h-6 text-destructive" />
                </div>
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                {totalBudget > 0 ? `${Math.round((totalSpent / totalBudget) * 100)}% of budget` : 'No budget set'}
              </div>
            </CardContent>
          </Card>

          <Card className="glassmorphism">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Avg ROI</p>
                  <p className="text-2xl font-bold text-success" data-testid="text-avg-roi">
                    245%
                  </p>
                </div>
                <div className="p-2 bg-success/10 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-success" />
                </div>
              </div>
              <div className="flex items-center space-x-1 text-sm text-success mt-2">
                <TrendingUp className="w-3 h-3" />
                <span>+15% vs last month</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Campaigns List */}
        <Card className="glassmorphism">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Marketing Campaigns</CardTitle>
              <Button variant="outline" size="sm">
                <BarChart3 className="w-4 h-4 mr-2" />
                Analytics
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {campaignsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
              </div>
            ) : filteredCampaigns.length === 0 ? (
              <div className="text-center py-8">
                <Megaphone className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm ? "No campaigns found matching your search" : "No marketing campaigns found. Launch your first campaign to start growing your business."}
                </p>
                {!searchTerm && (
                  <Button className="mt-4" data-testid="button-create-first-campaign">
                    <Plus className="w-4 h-4 mr-2" />
                    Launch First Campaign
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredCampaigns.map((campaign: any, index: number) => (
                  <Card key={campaign.id} className="border-l-4 border-l-primary" data-testid={`card-campaign-${index}`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="font-semibold text-foreground" data-testid={`text-campaign-name-${index}`}>
                              {campaign.name}
                            </h3>
                            <Badge variant={getStatusColor(campaign.status)} data-testid={`badge-status-${index}`}>
                              {campaign.status?.charAt(0).toUpperCase() + campaign.status?.slice(1)}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-4">
                            {campaign.description}
                          </p>
                          
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Type</p>
                              <p className="text-sm text-foreground capitalize">{campaign.type}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Budget</p>
                              <p className="text-sm text-foreground">£{parseFloat(campaign.budget || 0).toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Spent</p>
                              <p className="text-sm text-destructive">${parseFloat(campaign.spent || 0).toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Duration</p>
                              <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                                <Calendar className="w-3 h-3" />
                                <span>
                                  {campaign.startDate && campaign.endDate
                                    ? `${new Date(campaign.startDate).toLocaleDateString()} - ${new Date(campaign.endDate).toLocaleDateString()}`
                                    : 'Not set'
                                  }
                                </span>
                              </div>
                            </div>
                          </div>

                          {campaign.channels && campaign.channels.length > 0 && (
                            <div className="mt-4">
                              <p className="text-sm font-medium text-muted-foreground mb-2">Channels</p>
                              <div className="flex space-x-2">
                                {campaign.channels.map((channel: string, channelIndex: number) => {
                                  const ChannelIcon = getChannelIcon(channel);
                                  return (
                                    <div key={channelIndex} className="flex items-center space-x-1 text-xs bg-secondary px-2 py-1 rounded">
                                      <ChannelIcon className="w-3 h-3" />
                                      <span>{channel}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {campaign.budget && campaign.spent && (
                            <div className="mt-4">
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-muted-foreground">Budget Progress</span>
                                <span className="text-foreground">
                                  {Math.round((parseFloat(campaign.spent) / parseFloat(campaign.budget)) * 100)}%
                                </span>
                              </div>
                              <Progress 
                                value={(parseFloat(campaign.spent) / parseFloat(campaign.budget)) * 100}
                                className="h-2"
                                data-testid={`progress-budget-${index}`}
                              />
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-2 ml-4">
                          <Button variant="outline" size="sm" data-testid={`button-analytics-${index}`}>
                            <BarChart3 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" data-testid={`button-actions-${index}`}>
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="glassmorphism hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <Mail className="w-8 h-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold text-foreground mb-2">Email Campaign</h3>
              <p className="text-sm text-muted-foreground">Create targeted email marketing campaigns</p>
            </CardContent>
          </Card>

          <Card className="glassmorphism hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <Users className="w-8 h-8 text-success mx-auto mb-3" />
              <h3 className="font-semibold text-foreground mb-2">Social Media</h3>
              <p className="text-sm text-muted-foreground">Manage social media campaigns and content</p>
            </CardContent>
          </Card>

          <Card className="glassmorphism hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <Globe className="w-8 h-8 text-warning mx-auto mb-3" />
              <h3 className="font-semibold text-foreground mb-2">Digital Ads</h3>
              <p className="text-sm text-muted-foreground">Launch and manage paid advertising campaigns</p>
            </CardContent>
          </Card>

          <Card className="glassmorphism hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <Zap className="w-8 h-8 text-accent-foreground mx-auto mb-3" />
              <h3 className="font-semibold text-foreground mb-2">Automation</h3>
              <p className="text-sm text-muted-foreground">Set up marketing automation workflows</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
