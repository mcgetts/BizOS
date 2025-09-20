import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Clock } from "lucide-react";

export default function Analytics() {
  return (
    <Layout title="Analytics - Business Intelligence" breadcrumbs={["Analytics"]}>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Analytics</h1>
            <p className="text-muted-foreground">
              Advanced business intelligence and reporting
            </p>
          </div>
        </div>

        {/* Coming Soon Card */}
        <div className="flex items-center justify-center min-h-[50vh]">
          <Card className="glassmorphism max-w-md w-full">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Analytics Dashboard</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-muted-foreground" />
                <span className="text-lg font-medium text-muted-foreground">Coming Soon</span>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                We're working on bringing you powerful analytics and reporting features. 
                Stay tuned for comprehensive business intelligence dashboards, custom reports, 
                and data visualizations to help you make informed decisions.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}