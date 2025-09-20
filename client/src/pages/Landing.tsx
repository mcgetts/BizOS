import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, FolderOpen, DollarSign, BookOpen, Megaphone } from "lucide-react";

export default function Landing() {
  const handleLogin = async () => {
    // Use dev login only in development mode, otherwise use OAuth flow
    if (import.meta.env.DEV && window.location.hostname.includes('replit.dev')) {
      // In development, use dev login endpoint
      try {
        const response = await fetch("/api/auth/dev-login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ username: "dev", password: "dev" }),
          credentials: "include",
        });

        if (response.ok) {
          window.location.reload();
        } else {
          console.error("Login failed");
        }
      } catch (error) {
        console.error("Login error:", error);
      }
    } else {
      // For production/published app, use Replit OAuth flow
      window.location.href = "/api/login";
    }
  };

  const features = [
    {
      icon: Users,
      title: "Client Management",
      description: "Complete CRM system with lead pipeline and interaction tracking"
    },
    {
      icon: FolderOpen,
      title: "Project Management",
      description: "Portfolio tracking with client portals and team collaboration"
    },
    {
      icon: DollarSign,
      title: "Financial Management",
      description: "Invoice generation, payment tracking, and expense management"
    },
    {
      icon: BookOpen,
      title: "Knowledge Hub",
      description: "Centralized documentation, SOPs, and training materials"
    },
    {
      icon: Megaphone,
      title: "Marketing",
      description: "Campaign planning, content calendar, and ROI tracking"
    },
    {
      icon: Building2,
      title: "Admin Portal",
      description: "User management, system configuration, and analytics"
    }
  ];

  return (
    <div className="min-h-screen gradient-bg flex flex-col" data-testid="landing-page">
      {/* Header */}
      <header className="p-6">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold text-foreground">BizOS</span>
          </div>
          <Button onClick={handleLogin} data-testid="button-login">
            Sign In
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 container mx-auto px-6 py-12">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-foreground mb-6" data-testid="text-hero-title">
            Business Operating System
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto" data-testid="text-hero-description">
            A comprehensive business management platform that consolidates multiple business functions 
            into one unified, professional-grade system. Streamline your operations, enhance productivity, 
            and drive growth with BizOS.
          </p>
          <Button size="lg" onClick={handleLogin} data-testid="button-get-started">
            Get Started
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="glassmorphism animate-slide-up" data-testid={`card-feature-${index}`}>
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-foreground">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <Card className="glassmorphism max-w-2xl mx-auto">
            <CardContent className="p-8">
              <h2 className="text-3xl font-bold text-foreground mb-4">
                Ready to Transform Your Business?
              </h2>
              <p className="text-muted-foreground mb-6">
                Join thousands of businesses that have streamlined their operations with BizOS. 
                Get started today and experience the difference.
              </p>
              <Button size="lg" onClick={handleLogin} data-testid="button-start-free">
                Start Your Journey
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 border-t border-border">
        <div className="container mx-auto text-center text-muted-foreground">
          <p>&copy; 2024 BizOS. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
