import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import EmailVerification from "@/pages/EmailVerification";
import Home from "@/pages/Home";
import Executive from "@/pages/Executive";
import Clients from "@/pages/Clients";
import Analytics from "@/pages/Analytics";
import Projects from "@/pages/Projects";
import Tasks from "@/pages/Tasks";
import Team from "@/pages/Team";
import TeamHub from "@/pages/TeamHub";
import Finance from "@/pages/Finance";
import FinanceHub from "@/pages/FinanceHub";
import Knowledge from "@/pages/Knowledge";
import Marketing from "@/pages/Marketing";
import Support from "@/pages/Support";
import Company from "@/pages/Company";
import Admin from "@/pages/Admin";
import Resources from "@/pages/Resources";
import TimeTracking from "@/pages/TimeTracking";
import BudgetManagement from "@/pages/BudgetManagement";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading state without re-rendering Landing to prevent flash
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      {/* Email verification should always be accessible */}
      <Route path="/verify-email" component={EmailVerification} />

      {!isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={Home} />
          <Route path="/executive" component={Executive} />
          {/* Legacy dashboard route - redirect to executive for admins, home for others */}
          <Route path="/dashboard">{() => { window.location.replace('/executive'); return null; }}</Route>
          <Route path="/sales" component={Clients} />
          <Route path="/projects" component={Projects} />
          <Route path="/tasks" component={Tasks} />
          {/* Legacy routes - redirect to new consolidated pages */}
          <Route path="/clients">{() => { window.location.replace('/sales'); return null; }}</Route>
          <Route path="/resources" component={Resources} />
          <Route path="/budget" component={BudgetManagement} />
          {/* New consolidated hub pages */}
          <Route path="/team" component={TeamHub} />
          <Route path="/finance" component={FinanceHub} />
          <Route path="/time" component={TimeTracking} />
          <Route path="/knowledge" component={Knowledge} />
          <Route path="/marketing" component={Marketing} />
          <Route path="/support" component={Support} />
          <Route path="/company" component={Company} />
          <Route path="/analytics" component={Analytics} />
          <Route path="/admin" component={Admin} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="bizos-ui-theme">
        <TooltipProvider>
          <NotificationProvider>
            <Toaster />
            <Router />
          </NotificationProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
