import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AuthContainer } from "@/components/auth/AuthContainer";
import { Building2, Users, FolderOpen, PoundSterling, BookOpen, Megaphone, Monitor, CheckCircle, BarChart3, Lock, Smartphone, Zap, Brain, Clock } from "lucide-react";

export default function Landing() {
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [verificationSuccess, setVerificationSuccess] = useState(false);

  // Check for verification success parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('verified') === 'true') {
      setVerificationSuccess(true);
      setShowAuth(true);
      setAuthMode('login');

      // Remove the parameter from URL for clean state
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);

      // Hide the success message after 5 seconds
      setTimeout(() => {
        setVerificationSuccess(false);
      }, 5000);
    }
  }, []);

  const handleDevLogin = async () => {
    // Use dev login only in development mode
    if (import.meta.env.DEV && window.location.hostname.includes('replit.dev')) {
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
    }
  };

  // If showing auth, render the auth container
  if (showAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome Back
            </h1>
            <p className="text-gray-600">
              Sign in to your business management platform
            </p>
          </div>

          {verificationSuccess && (
            <Alert className="mb-6 border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Email verified successfully! You can now log in to your account.
              </AlertDescription>
            </Alert>
          )}

          <AuthContainer
            onSuccess={() => window.location.reload()}
            initialMode={authMode}
          />

          <div className="text-center mt-8">
            <Button
              variant="ghost"
              onClick={() => setShowAuth(false)}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              ← Back to homepage
            </Button>
          </div>

          {/* Dev login button - only show in development */}
          {import.meta.env.DEV && window.location.hostname.includes('replit.dev') && (
            <div className="text-center mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDevLogin}
                className="text-xs"
              >
                <Monitor className="mr-1 h-3 w-3" />
                Dev Login
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const features = [
    {
      icon: FolderOpen,
      title: "Advanced Project Management",
      description: "Professional Gantt charts with dependency tracking, critical path analysis, and real-time collaboration"
    },
    {
      icon: Brain,
      title: "AI-Powered Analytics",
      description: "Predictive insights, revenue forecasting, risk assessment, and strategic recommendations"
    },
    {
      icon: PoundSterling,
      title: "Complete Budget Management",
      description: "Real-time cost tracking, automated billing, variance analysis, and profitability analytics"
    },
    {
      icon: Clock,
      title: "Integrated Time Tracking",
      description: "Real-time timers with budget impact calculations and seamless billing integration"
    },
    {
      icon: Lock,
      title: "Enterprise Security",
      description: "Role-based access control, multi-factor authentication, and comprehensive audit logging"
    },
    {
      icon: Smartphone,
      title: "Mobile-First Platform",
      description: "Touch-optimized interfaces with responsive design across all devices"
    },
    {
      icon: Zap,
      title: "Third-Party Integrations",
      description: "Slack, Microsoft Teams, and GitHub integration with automated workflow sync"
    },
    {
      icon: BarChart3,
      title: "Business Intelligence",
      description: "Executive KPI tracking, team performance analytics, and AI-generated insights"
    },
    {
      icon: Users,
      title: "Complete CRM System",
      description: "Lead pipeline management, client tracking, and automated opportunity workflows"
    },
    {
      icon: Megaphone,
      title: "Marketing Suite",
      description: "Campaign planning, content calendar, and ROI tracking with analytics integration"
    },
    {
      icon: BookOpen,
      title: "Knowledge Management",
      description: "Centralized documentation, SOPs, training materials, and team collaboration"
    },
    {
      icon: Building2,
      title: "Admin & Configuration",
      description: "User management, department-based permissions, and system configuration"
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
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => {
                setAuthMode('login');
                setShowAuth(true);
              }}
              data-testid="button-login"
            >
              Sign In
            </Button>
            <Button
              onClick={() => {
                setAuthMode('register');
                setShowAuth(true);
              }}
              data-testid="button-signup"
            >
              Sign Up
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 container mx-auto px-6 py-12">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-foreground mb-6" data-testid="text-hero-title">
            Enterprise Business Operating System
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto" data-testid="text-hero-description">
            Production-ready enterprise platform with AI-powered analytics, advanced security, mobile-first design,
            and comprehensive third-party integrations. Streamline operations, optimize resources, and drive growth
            with intelligent automation and real-time business intelligence.
          </p>
          <div className="flex flex-wrap justify-center gap-4 mt-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>AI Business Intelligence</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>Enterprise Security (RBAC + MFA)</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>Mobile-Optimized</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>Slack/Teams/GitHub Integration</span>
            </div>
          </div>
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
