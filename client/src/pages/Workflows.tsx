import { Layout } from "@/components/Layout";
import { WorkflowAutomation } from "@/components/WorkflowAutomation";

export default function Workflows() {
  return (
    <Layout
      title="Workflow Automation"
      breadcrumbs={["Control", "Workflows"]}
    >
      <WorkflowAutomation />
    </Layout>
  );
}